"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentService = exports.StudentService = void 0;
const studentRepository_js_1 = require("../repositories/studentRepository.js");
const userRepository_js_1 = require("../repositories/userRepository.js");
const classRepository_js_1 = require("../repositories/classRepository.js");
class StudentService {
    async getStudents() {
        return studentRepository_js_1.studentRepo.findAll();
    }
    async createStudent(dto) {
        if (!dto.userId || dto.userId.trim() === '') {
            throw new Error('User ID wajib diisi.');
        }
        if (!dto.nis || dto.nis.trim() === '') {
            throw new Error('NIS wajib diisi.');
        }
        if (!dto.classId) {
            throw new Error('Kelas wajib dipilih.');
        }
        // Verify User Exists
        const userRecord = await userRepository_js_1.userRepo.findById(dto.userId);
        if (!userRecord) {
            throw new Error('Akun user tidak ditemukan.');
        }
        // Verify Class Exists
        const classRecord = await classRepository_js_1.classRepo.findById(dto.classId);
        if (!classRecord) {
            throw new Error('Kelas tidak ditemukan.');
        }
        // Verify User ID is not already linked to another student
        const existingUserLink = await studentRepository_js_1.studentRepo.findByUserId(dto.userId);
        if (existingUserLink) {
            throw new Error('Akun user ini sudah terikat dengan profil siswa lain.');
        }
        // Verify NIS uniqueness
        const existingNis = await studentRepository_js_1.studentRepo.findByNis(dto.nis);
        if (existingNis) {
            throw new Error('NIS siswa sudah terdaftar.');
        }
        return studentRepository_js_1.studentRepo.create(dto.userId, dto.nis, dto.classId);
    }
    async updateStudent(id, dto) {
        const existing = await studentRepository_js_1.studentRepo.findById(id);
        if (!existing) {
            throw new Error('Siswa tidak ditemukan.');
        }
        if (!dto.userId || dto.userId.trim() === '') {
            throw new Error('User ID wajib diisi.');
        }
        if (!dto.nis || dto.nis.trim() === '') {
            throw new Error('NIS wajib diisi.');
        }
        if (!dto.classId) {
            throw new Error('Kelas wajib dipilih.');
        }
        // Verify User Exists
        const userRecord = await userRepository_js_1.userRepo.findById(dto.userId);
        if (!userRecord) {
            throw new Error('Akun user tidak ditemukan.');
        }
        // Verify Class Exists
        const classRecord = await classRepository_js_1.classRepo.findById(dto.classId);
        if (!classRecord) {
            throw new Error('Kelas tidak ditemukan.');
        }
        // Verify User ID is not linked to another student
        if (dto.userId !== existing.userId) {
            const userLinkConflict = await studentRepository_js_1.studentRepo.findByUserId(dto.userId);
            if (userLinkConflict) {
                throw new Error('Akun user ini sudah terikat dengan profil siswa lain.');
            }
        }
        // Verify NIS uniqueness if NIS changed
        if (dto.nis !== existing.nis) {
            const nisConflict = await studentRepository_js_1.studentRepo.findByNis(dto.nis);
            if (nisConflict) {
                throw new Error('NIS siswa sudah digunakan.');
            }
        }
        await studentRepository_js_1.studentRepo.update(id, dto.userId, dto.nis, dto.classId);
    }
    async resetDevice(id) {
        const existing = await studentRepository_js_1.studentRepo.findById(id);
        if (!existing) {
            throw new Error('Siswa tidak ditemukan.');
        }
        await studentRepository_js_1.studentRepo.updateDeviceUuid(id, null);
    }
    async deleteStudent(id) {
        const existing = await studentRepository_js_1.studentRepo.findById(id);
        if (!existing) {
            throw new Error('Siswa tidak ditemukan.');
        }
        await studentRepository_js_1.studentRepo.delete(id);
    }
}
exports.StudentService = StudentService;
exports.studentService = new StudentService();
