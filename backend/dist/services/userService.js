"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const userRepository_js_1 = require("../repositories/userRepository.js");
const auth_js_1 = require("../lib/auth.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
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
}
exports.UserService = UserService;
exports.userService = new UserService();
