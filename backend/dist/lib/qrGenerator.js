"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQrCode = generateQrCode;
exports.deleteQrCodeFile = deleteQrCodeFile;
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const QR_DIR = path_1.default.join(__dirname, '../../uploads/qrcodes');
async function generateQrCode(nis, studentId) {
    if (!fs_1.default.existsSync(QR_DIR)) {
        fs_1.default.mkdirSync(QR_DIR, { recursive: true });
    }
    const filename = `qr-${studentId}.png`;
    const filePath = path_1.default.join(QR_DIR, filename);
    await qrcode_1.default.toFile(filePath, nis, {
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
async function deleteQrCodeFile(qrPath) {
    if (!qrPath)
        return;
    const absolutePath = path_1.default.join(__dirname, '../../', qrPath.replace(/^\//, ''));
    if (fs_1.default.existsSync(absolutePath)) {
        fs_1.default.unlinkSync(absolutePath);
    }
}
