"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelUserFile = parseExcelUserFile;
const XLSX = __importStar(require("xlsx"));
const VALID_ROLES = ['admin', 'guru', 'siswa'];
function parseExcelUserFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('File Excel tidak memiliki sheet.');
    }
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rawData.length === 0) {
        throw new Error('File Excel kosong.');
    }
    const header = Object.keys(rawData[0]).map((k) => k.toLowerCase().trim());
    const hasName = header.includes('name') || header.includes('nama');
    const hasEmail = header.includes('email') || header.includes('email');
    const hasRole = header.includes('role') || header.includes('peran') || header.includes('role');
    if (!hasName || !hasEmail || !hasRole) {
        throw new Error('Format kolom tidak sesuai. File harus memiliki kolom: Name/Nama, Email, Role/Peran.');
    }
    const nameKey = header.find((k) => k === 'name' || k === 'nama');
    const emailKey = header.find((k) => k === 'email');
    const roleKey = header.find((k) => k === 'role' || k === 'peran');
    const rows = [];
    const errors = [];
    for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        const name = String(item[nameKey] || '').trim();
        const email = String(item[emailKey] || '').trim();
        const role = String(item[roleKey] || '').trim().toLowerCase();
        const rowNum = i + 2;
        if (!name) {
            errors.push({ row: rowNum, email, error: 'Nama tidak boleh kosong.' });
            continue;
        }
        if (!email) {
            errors.push({ row: rowNum, email, error: 'Email tidak boleh kosong.' });
            continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ row: rowNum, email, error: 'Format email tidak valid.' });
            continue;
        }
        if (!role) {
            errors.push({ row: rowNum, email, error: 'Role tidak boleh kosong.' });
            continue;
        }
        if (!VALID_ROLES.includes(role)) {
            errors.push({
                row: rowNum,
                email,
                error: `Role "${role}" tidak valid. Harus: admin, guru, atau siswa.`,
            });
            continue;
        }
        rows.push({ name, email, role });
    }
    return { rows, errors };
}
