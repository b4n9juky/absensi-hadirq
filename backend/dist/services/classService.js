"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classService = exports.ClassService = void 0;
const classRepository_js_1 = require("../repositories/classRepository.js");
class ClassService {
    async getClasses() {
        return classRepository_js_1.classRepo.findAll();
    }
    async createClass(dto) {
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama kelas tidak boleh kosong.');
        }
        // Check class name uniqueness
        const existing = await classRepository_js_1.classRepo.findByName(dto.name);
        if (existing) {
            throw new Error('Nama kelas sudah ada.');
        }
        return classRepository_js_1.classRepo.create(dto.name);
    }
    async updateClass(id, dto) {
        const existing = await classRepository_js_1.classRepo.findById(id);
        if (!existing) {
            throw new Error('Kelas tidak ditemukan.');
        }
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama kelas tidak boleh kosong.');
        }
        // Check class name uniqueness if name changed
        if (dto.name !== existing.name) {
            const conflict = await classRepository_js_1.classRepo.findByName(dto.name);
            if (conflict) {
                throw new Error('Nama kelas sudah digunakan.');
            }
        }
        await classRepository_js_1.classRepo.update(id, dto.name);
    }
    async deleteClass(id) {
        const existing = await classRepository_js_1.classRepo.findById(id);
        if (!existing) {
            throw new Error('Kelas tidak ditemukan.');
        }
        await classRepository_js_1.classRepo.delete(id);
    }
}
exports.ClassService = ClassService;
exports.classService = new ClassService();
