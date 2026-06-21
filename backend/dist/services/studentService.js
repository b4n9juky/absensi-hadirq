"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentService = exports.StudentService = void 0;
const studentRepository_js_1 = require("../repositories/studentRepository.js");
const userRepository_js_1 = require("../repositories/userRepository.js");
const classRepository_js_1 = require("../repositories/classRepository.js");
const qrGenerator_js_1 = require("../lib/qrGenerator.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
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
        const studentId = await studentRepository_js_1.studentRepo.create(dto.userId, dto.nis, dto.classId);
        try {
            const qrPath = await (0, qrGenerator_js_1.generateQrCode)(dto.nis, studentId);
            await studentRepository_js_1.studentRepo.updateQrCode(studentId, qrPath);
        }
        catch (err) {
            console.error(`[QR] Gagal generate QR untuk NIS ${dto.nis}:`, err);
        }
        return studentId;
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
        let qrcode = existing.qrcode;
        if (dto.nis !== existing.nis || !existing.qrcode) {
            await (0, qrGenerator_js_1.deleteQrCodeFile)(existing.qrcode);
            try {
                qrcode = await (0, qrGenerator_js_1.generateQrCode)(dto.nis, id);
            }
            catch (err) {
                console.error(`[QR] Gagal generate QR untuk NIS ${dto.nis}:`, err);
            }
        }
        await studentRepository_js_1.studentRepo.update(id, dto.userId, dto.nis, dto.classId, qrcode || undefined);
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
        await (0, qrGenerator_js_1.deleteQrCodeFile)(existing.qrcode);
        await studentRepository_js_1.studentRepo.delete(id);
    }
    async promoteStudents(fromClassId, toClassId, studentIds) {
        if (!fromClassId || !toClassId) {
            throw new Error('Kelas asal dan kelas tujuan wajib ditentukan.');
        }
        const classRecord = await classRepository_js_1.classRepo.findById(toClassId);
        if (!classRecord) {
            throw new Error('Kelas tujuan tidak ditemukan.');
        }
        if (studentIds && studentIds.length > 0) {
            await index_js_1.db.update(schema_js_1.students)
                .set({ classId: toClassId, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.students.classId, fromClassId), (0, drizzle_orm_1.inArray)(schema_js_1.students.id, studentIds)));
        }
        else {
            await index_js_1.db.update(schema_js_1.students)
                .set({ classId: toClassId, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, fromClassId));
        }
        return { success: true };
    }
    async registerFace(id, faceEmbedding) {
        const existing = await studentRepository_js_1.studentRepo.findById(id);
        if (!existing) {
            throw new Error('Siswa tidak ditemukan.');
        }
        const embeddingString = JSON.stringify(faceEmbedding);
        await index_js_1.db.update(schema_js_1.students).set({ faceEmbedding: embeddingString, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id));
    }
    async getStudentEmbeddings() {
        const allStudents = await index_js_1.db.select({
            id: schema_js_1.students.id,
            nis: schema_js_1.students.nis,
            studentName: schema_js_1.user.name,
            faceEmbedding: schema_js_1.students.faceEmbedding,
            photo: schema_js_1.students.photo,
        }).from(schema_js_1.students)
            .leftJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id));
        return allStudents.filter(s => s.faceEmbedding).map(s => ({
            id: s.id,
            nis: s.nis,
            studentName: s.studentName,
            photo: s.photo,
            faceEmbedding: JSON.parse(s.faceEmbedding)
        }));
    }
}
exports.StudentService = StudentService;
exports.studentService = new StudentService();
