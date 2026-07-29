import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { waSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const proxyUrl = process.env.WA_PROXY_URL;
let proxyAgent: any = undefined;
if (proxyUrl) {
  try {
    const isSocks = proxyUrl.startsWith('socks');
    if (isSocks) {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      proxyAgent = new SocksProxyAgent(proxyUrl);
    } else {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      proxyAgent = new HttpsProxyAgent(proxyUrl);
    }
    console.log('[WA] Using proxy:', proxyUrl);
  } catch { /* ignore */ }
}

const AUTH_DIR = path.join(__dirname, '..', '..', 'baileys_auth_info');

class WaService {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private qrCodeData: string | null = null;
  private pairingCode: string | null = null;
  private _isConnected = false;
  private _isInitializing = false;
  private _error: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private reset() {
    this.sock = null;
    this._isConnected = false;
    this.qrCodeData = null;
    this.pairingCode = null;
    this._isInitializing = false;
    this.clearReconnect();
  }

  private clearReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private markConnected() {
    this._isConnected = true;
    this.qrCodeData = null;
    this.pairingCode = null;
    this._isInitializing = false;
    this._error = null;
    this.clearReconnect();
  }

  private async saveSession() {
    try {
      const existing = await db.select().from(waSessions).limit(1);
      if (existing.length > 0) {
        await db.update(waSessions)
          .set({ status: 'connected', updatedAt: new Date() })
          .where(eq(waSessions.id, existing[0].id));
      } else {
        await db.insert(waSessions).values({
          sessionData: JSON.stringify({}),
          status: 'connected',
        });
      }
    } catch { /* ignore */ }
  }

  private async clearSession() {
    try {
      await db.delete(waSessions);
    } catch { /* ignore */ }
  }

  async initialize(pairingPhoneNumber?: string) {
    if (this._isConnected) return;
    if (this._isInitializing) {
      throw new Error('WhatsApp sedang dalam proses koneksi. Tunggu sebentar.');
    }
    this.reset();
    this._error = null;
    this._isInitializing = true;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: false,
      browser: ['Chrome', 'Linux', '22.04.4'],
      agent: proxyAgent,
    });

    if (pairingPhoneNumber && this.sock) {
      const cleanPhone = pairingPhoneNumber.replace(/[^0-9]/g, '');
      try {
        this.pairingCode = await this.sock.requestPairingCode(cleanPhone);
      } catch (err: any) {
        this._error = err.message || 'Gagal mendapatkan pairing code';
        this._isInitializing = false;
        return;
      }
    }

    this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        try {
          this.qrCodeData = await QRCode.toDataURL(qr);
        } catch {
          this.qrCodeData = qr;
        }
      }

      if (connection === 'open') {
        this.markConnected();
        await this.saveSession();
      }

      if (connection === 'close') {
        const boomErr = lastDisconnect?.error as Boom;
        const statusCode = boomErr?.output?.statusCode;
        console.log('[WA] Connection closed. reason:', statusCode, 'data:', JSON.stringify(boomErr?.data));
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this._isConnected = false;
        this._isInitializing = false;

        if (shouldReconnect) {
          this.reconnectTimeout = setTimeout(() => {
            this.initialize().catch(() => {});
          }, 5000);
        } else {
          this._error = 'Sesi WhatsApp tidak valid. Silakan scan ulang.';
          this.reset();
          await this.clearSession();
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch { /* ignore */ }
        }
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
  }

  getQR(): string | null {
    return this.qrCodeData;
  }

  getPairingCode(): string | null {
    return this.pairingCode;
  }

  getStatus() {
    return {
      connected: this._isConnected,
      initializing: this._isInitializing,
      hasQR: !!this.qrCodeData,
      hasPairingCode: !!this.pairingCode,
      error: this._error,
      sessionSaved: true,
    };
  }

  async disconnect() {
    this.clearReconnect();
    await this.clearSession();
    try {
      if (this.sock) {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ws.close();
      }
    } catch { /* ignore */ }
    this.reset();
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch { /* ignore */ }
  }

  async sendMessage(phone: string, message: string) {
    if (!this.sock || !this._isConnected) {
      throw new Error('WhatsApp tidak terhubung');
    }
    const formattedPhone = phone.startsWith('0')
      ? '62' + phone.substring(1)
      : phone.replace(/^\+/, '');

    const jid = `${formattedPhone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text: message });
  }

  async sendMessageSafe(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sendMessage(phone, message);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim WA' };
    }
  }
}

export const waService = new WaService();
