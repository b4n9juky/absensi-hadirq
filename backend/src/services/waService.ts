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

const getAuthDir = (schoolId: number) =>
  path.join(__dirname, '..', '..', 'baileys_auth_info', `school_${schoolId}`);

class WaConnection {
  public sock: any = null;
  public qrCodeData: string | null = null;
  public pairingCode: string | null = null;
  public isConnected = false;
  public isInitializing = false;
  public error: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private baileys: any = null;
  private schoolId: number;

  constructor(schoolId: number) {
    this.schoolId = schoolId;
  }

  private reset() {
    this.sock = null;
    this.isConnected = false;
    this.qrCodeData = null;
    this.pairingCode = null;
    this.isInitializing = false;
    this.clearReconnect();
  }

  private clearReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private markConnected() {
    this.isConnected = true;
    this.qrCodeData = null;
    this.pairingCode = null;
    this.isInitializing = false;
    this.error = null;
    this.clearReconnect();
  }

  private async saveSession() {
    try {
      const existing = await db.select().from(waSessions).where(eq(waSessions.schoolId, this.schoolId)).limit(1);
      if (existing.length > 0) {
        await db.update(waSessions)
          .set({ status: 'connected', updatedAt: new Date() })
          .where(eq(waSessions.id, existing[0].id));
      } else {
        await db.insert(waSessions).values({
          sessionData: JSON.stringify({}),
          status: 'connected',
          schoolId: this.schoolId,
        });
      }
    } catch { /* ignore */ }
  }

  private async clearSession() {
    try {
      await db.delete(waSessions).where(eq(waSessions.schoolId, this.schoolId));
    } catch { /* ignore */ }
  }

  private async getBaileys() {
    if (!this.baileys) {
      this.baileys = await import('@whiskeysockets/baileys');
    }
    return this.baileys;
  }

  async initialize(pairingPhoneNumber?: string) {
    if (this.isConnected) return;
    if (this.isInitializing) {
      throw new Error('WhatsApp sedang dalam proses koneksi. Tunggu sebentar.');
    }
    this.reset();
    this.error = null;
    this.isInitializing = true;

    const authDir = getAuthDir(this.schoolId);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const baileys = await this.getBaileys();
    const { state, saveCreds } = await baileys.useMultiFileAuthState(authDir);
    const { version } = await baileys.fetchLatestBaileysVersion();

    this.sock = baileys.makeWASocket({
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
        this.error = err.message || 'Gagal mendapatkan pairing code';
        this.isInitializing = false;
        return;
      }
    }

    this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }: any) => {
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
        console.log(`[WA:${this.schoolId}] Connection closed. reason:`, statusCode);
        const shouldReconnect = statusCode !== baileys.DisconnectReason.loggedOut;

        this.isConnected = false;
        this.isInitializing = false;

        if (shouldReconnect) {
          this.reconnectTimeout = setTimeout(() => {
            this.initialize().catch(() => {});
          }, 5000);
        } else {
          this.error = 'Sesi WhatsApp tidak valid. Silakan scan ulang.';
          this.reset();
          await this.clearSession();
          try {
            if (fs.existsSync(authDir)) {
              fs.rmSync(authDir, { recursive: true, force: true });
            }
          } catch { /* ignore */ }
        }
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
  }

  getStatus() {
    return {
      connected: this.isConnected,
      initializing: this.isInitializing,
      hasQR: !!this.qrCodeData,
      hasPairingCode: !!this.pairingCode,
      error: this.error,
    };
  }

  getQR(): string | null { return this.qrCodeData; }
  getPairingCode(): string | null { return this.pairingCode; }

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
    const authDir = getAuthDir(this.schoolId);
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    } catch { /* ignore */ }
  }

  async sendMessage(phone: string, message: string) {
    if (!this.sock || !this.isConnected) {
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

class WaServiceManager {
  private connections: Map<number, WaConnection> = new Map();

  forSchool(schoolId: number): WaConnection {
    let conn = this.connections.get(schoolId);
    if (!conn) {
      conn = new WaConnection(schoolId);
      this.connections.set(schoolId, conn);
    }
    return conn;
  }

  async disconnectAll() {
    for (const conn of this.connections.values()) {
      await conn.disconnect();
    }
    this.connections.clear();
  }
}

export const waService = new WaServiceManager();
