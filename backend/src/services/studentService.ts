import { studentRepo } from '../repositories/studentRepository.js';
import { userRepo } from '../repositories/userRepository.js';
import { classRepo } from '../repositories/classRepository.js';
import { generateQrCode, deleteQrCodeFile } from '../lib/qrGenerator.js';
import { db } from '../db/index.js';
import { students, user } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export interface CreateStudentDto {
  userId: string;
  nis: string;
  classId: number;
}

export class StudentService {
  async getStudents() {
    return studentRepo.findAll();
  }

  async createStudent(dto: CreateStudentDto) {
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
    const userRecord = await userRepo.findById(dto.userId);
    if (!userRecord) {
      throw new Error('Akun user tidak ditemukan.');
    }

    // Verify Class Exists
    const classRecord = await classRepo.findById(dto.classId);
    if (!classRecord) {
      throw new Error('Kelas tidak ditemukan.');
    }

    // Verify User ID is not already linked to another student
    const existingUserLink = await studentRepo.findByUserId(dto.userId);
    if (existingUserLink) {
      throw new Error('Akun user ini sudah terikat dengan profil siswa lain.');
    }

    // Verify NIS uniqueness
    const existingNis = await studentRepo.findByNis(dto.nis);
    if (existingNis) {
      throw new Error('NIS siswa sudah terdaftar.');
    }

    const studentId = await studentRepo.create(dto.userId, dto.nis, dto.classId);
    try {
      const qrPath = await generateQrCode(dto.nis, studentId);
      await studentRepo.updateQrCode(studentId, qrPath);
    } catch (err) {
      console.error(`[QR] Gagal generate QR untuk NIS ${dto.nis}:`, err);
    }
    return studentId;
  }

  async updateStudent(id: number, dto: CreateStudentDto) {
    const existing = await studentRepo.findById(id);
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
    const userRecord = await userRepo.findById(dto.userId);
    if (!userRecord) {
      throw new Error('Akun user tidak ditemukan.');
    }

    // Verify Class Exists
    const classRecord = await classRepo.findById(dto.classId);
    if (!classRecord) {
      throw new Error('Kelas tidak ditemukan.');
    }

    // Verify User ID is not linked to another student
    if (dto.userId !== existing.userId) {
      const userLinkConflict = await studentRepo.findByUserId(dto.userId);
      if (userLinkConflict) {
        throw new Error('Akun user ini sudah terikat dengan profil siswa lain.');
      }
    }

    // Verify NIS uniqueness if NIS changed
    if (dto.nis !== existing.nis) {
      const nisConflict = await studentRepo.findByNis(dto.nis);
      if (nisConflict) {
        throw new Error('NIS siswa sudah digunakan.');
      }
    }

    let qrcode = existing.qrcode;
    if (dto.nis !== existing.nis || !existing.qrcode) {
      await deleteQrCodeFile(existing.qrcode);
      try {
        qrcode = await generateQrCode(dto.nis, id);
      } catch (err) {
        console.error(`[QR] Gagal generate QR untuk NIS ${dto.nis}:`, err);
      }
    }
    await studentRepo.update(id, dto.userId, dto.nis, dto.classId, qrcode || undefined);
  }

  async resetDevice(id: number) {
    const existing = await studentRepo.findById(id);
    if (!existing) {
      throw new Error('Siswa tidak ditemukan.');
    }
    await studentRepo.updateDeviceUuid(id, null);
  }

  async deleteStudent(id: number) {
    const existing = await studentRepo.findById(id);
    if (!existing) {
      throw new Error('Siswa tidak ditemukan.');
    }
    await deleteQrCodeFile(existing.qrcode);
    await studentRepo.delete(id);
  }
  async promoteStudents(fromClassId: number, toClassId: number, studentIds?: number[]) {
    if (!fromClassId || !toClassId) {
      throw new Error('Kelas asal dan kelas tujuan wajib ditentukan.');
    }

    const classRecord = await classRepo.findById(toClassId);
    if (!classRecord) {
      throw new Error('Kelas tujuan tidak ditemukan.');
    }

    if (studentIds && studentIds.length > 0) {
      await db.update(students)
        .set({ classId: toClassId, updatedAt: new Date() })
        .where(and(
          eq(students.classId, fromClassId),
          inArray(students.id, studentIds)
        ));
    } else {
      await db.update(students)
        .set({ classId: toClassId, updatedAt: new Date() })
        .where(eq(students.classId, fromClassId));
    }
    return { success: true };
  }

  async registerFace(id: number, faceEmbedding: number[]) {
    const existing = await studentRepo.findById(id);
    if (!existing) {
      throw new Error('Siswa tidak ditemukan.');
    }
    const embeddingString = JSON.stringify(faceEmbedding);
    await db.update(students).set({ faceEmbedding: embeddingString, updatedAt: new Date() }).where(eq(students.id, id));
  }

  async getStudentEmbeddings() {
    const allStudents = await db.select({
      id: students.id,
      nis: students.nis,
      studentName: user.name,
      faceEmbedding: students.faceEmbedding,
    }).from(students)
      .leftJoin(user, eq(students.userId, user.id));

    return allStudents.filter(s => s.faceEmbedding).map(s => ({
      id: s.id,
      nis: s.nis,
      studentName: s.studentName,
      faceEmbedding: JSON.parse(s.faceEmbedding!) as number[]
    }));
  }
}
export const studentService = new StudentService();
