"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const userRepository_js_1 = require("../repositories/userRepository.js");
const auth_js_1 = require("../lib/auth.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const excelParser_js_1 = require("../lib/excelParser.js");
const fs_1 = __importDefault(require("fs"));
class UserService {
    async getUsers() {
        return userRepository_js_1.userRepo.findAll();
    }
    async createUser(dto) {
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama tidak boleh kosong.');
        }
        if (!dto.email || dto.email.trim() === '') {
            throw new Error('Email tidak boleh kosong.');
        }
        if (!dto.password || dto.password.length < 6) {
            throw new Error('Password minimal harus 6 karakter.');
        }
        const validRoles = ['admin', 'guru', 'siswa'];
        if (!validRoles.includes(dto.role)) {
            throw new Error('Role tidak valid.');
        }
        // Check email uniqueness
        const existing = await userRepository_js_1.userRepo.findByEmail(dto.email);
        if (existing) {
            throw new Error('Email sudah terdaftar.');
        }
        // Call Better Auth to register credentials and user tables safely
        const signUpResult = await auth_js_1.auth.api.signUpEmail({
            body: {
                email: dto.email,
                password: dto.password,
                name: dto.name
            }
        });
        // Update role if not 'siswa' (default is 'siswa' in auth configuration)
        if (dto.role !== 'siswa') {
            await index_js_1.db.update(schema_js_1.user).set({ role: dto.role }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, signUpResult.user.id));
        }
        return signUpResult.user.id;
    }
    async updateUser(id, dto) {
        const existingUser = await userRepository_js_1.userRepo.findById(id);
        if (!existingUser) {
            throw new Error('User tidak ditemukan.');
        }
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama tidak boleh kosong.');
        }
        if (!dto.email || dto.email.trim() === '') {
            throw new Error('Email tidak boleh kosong.');
        }
        const validRoles = ['admin', 'guru', 'siswa'];
        if (!validRoles.includes(dto.role)) {
            throw new Error('Role tidak valid.');
        }
        // Check email uniqueness if email changed
        if (dto.email !== existingUser.email) {
            const emailConflict = await userRepository_js_1.userRepo.findByEmail(dto.email);
            if (emailConflict) {
                throw new Error('Email sudah digunakan oleh user lain.');
            }
        }
        await userRepository_js_1.userRepo.update(id, dto.name, dto.email, dto.role);
    }
    async deleteUser(id) {
        const existing = await userRepository_js_1.userRepo.findById(id);
        if (!existing) {
            throw new Error('User tidak ditemukan.');
        }
        await userRepository_js_1.userRepo.delete(id);
    }
    async importUsers(filePath) {
        const { rows, errors: parseErrors } = (0, excelParser_js_1.parseExcelUserFile)(filePath);
        const results = [];
        let imported = 0;
        let failed = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const existing = await userRepository_js_1.userRepo.findByEmail(row.email);
                if (existing) {
                    results.push({ row: rowNum, email: row.email, status: 'skipped', error: 'Email sudah terdaftar.' });
                    failed++;
                    continue;
                }
                await auth_js_1.auth.api.signUpEmail({
                    body: {
                        email: row.email,
                        password: 'Absen123!',
                        name: row.name,
                    },
                });
                if (row.role !== 'siswa') {
                    const created = await userRepository_js_1.userRepo.findByEmail(row.email);
                    if (created) {
                        await index_js_1.db.update(schema_js_1.user).set({ role: row.role }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, created.id));
                    }
                }
                results.push({ row: rowNum, email: row.email, status: 'imported' });
                imported++;
            }
            catch (err) {
                results.push({ row: rowNum, email: row.email, status: 'failed', error: err.message || 'Gagal membuat user.' });
                failed++;
            }
        }
        // Also include parse-level errors
        for (const pe of parseErrors) {
            results.push({ row: pe.row, email: pe.email, status: 'failed', error: pe.error });
            failed++;
        }
        // Clean up uploaded file
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch { /* ignore */ }
        return { imported, failed, results };
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
