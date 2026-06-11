import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const QR_DIR = path.join(__dirname, '../../uploads/qrcodes');

export async function generateQrCode(nis: string, studentId: number): Promise<string> {
  if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
  }

  const filename = `qr-${studentId}.png`;
  const filePath = path.join(QR_DIR, filename);

  await QRCode.toFile(filePath, nis, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return `/uploads/qrcodes/${filename}`;
}

export async function deleteQrCodeFile(qrPath: string | null) {
  if (!qrPath) return;
  const absolutePath = path.join(__dirname, '../../', qrPath.replace(/^\//, ''));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}
