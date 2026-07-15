import { studentRepo } from '../repositories/studentRepository.js';
import { userRepo } from '../repositories/userRepository.js';
import { classRepo } from '../repositories/classRepository.js';
import { generateQrCode, deleteQrCodeFile } from '../lib/qrGenerator.js';
import { db } from '../db/index.js';
import { students, user } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export interface CreateStudentDto {
  name: string;
  nis: string;
  classId: number;
}

export class StudentService {
  async getStudents() {
    return studentRepo.findAll();
  }

  async createStudent(dto: CreateStudentDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama wajib diisi.');
    }
    if (!dto.nis || dto.nis.trim() === '') {
      throw new Error('NIS wajib diisi.');
    }
    if (!dto.classId) {
      throw new Error('Kelas wajib dipilih.');
    }

    // Verify Class Exists
    const classRecord = await classRepo.findById(dto.classId);
    if (!classRecord) {
      throw new Error('Kelas tidak ditemukan.');
    }

    // Verify NIS uniqueness
    const existingNis = await studentRepo.findByNis(dto.nis);
    if (existingNis) {
      throw new Error('NIS siswa sudah terdaftar.');
    }

    const studentId = await studentRepo.create(dto.name, dto.nis, dto.classId);
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

    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama wajib diisi.');
    }
    if (!dto.nis || dto.nis.trim() === '') {
      throw new Error('NIS wajib diisi.');
    }
    if (!dto.classId) {
      throw new Error('Kelas wajib dipilih.');
    }

    // Verify Class Exists
    const classRecord = await classRepo.findById(dto.classId);
    if (!classRecord) {
      throw new Error('Kelas tidak ditemukan.');
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
    await studentRepo.update(id, dto.name, dto.nis, dto.classId, qrcode || undefined);
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

  async appendFaceEmbedding(id: number, newEmbedding: number[]) {
    const existing = await studentRepo.findById(id);
    if (!existing) {
      throw new Error('Siswa tidak ditemukan.');
    }

    let embeddings: number[][] = [];

    if (existing.faceEmbedding) {
      try {
        const parsed = JSON.parse(existing.faceEmbedding);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && Array.isArray(parsed[0])) {
            embeddings = parsed as number[][];
          } else {
            embeddings = [parsed as number[]];
          }
        }
      } catch { }
    }

    embeddings.push(newEmbedding);

    if (embeddings.length > 3) {
      embeddings = embeddings.slice(-3);
    }

    await db.update(students)
      .set({ faceEmbedding: JSON.stringify(embeddings), updatedAt: new Date() })
      .where(eq(students.id, id));
  }

  async deleteFace(id: number) {
    const existing = await studentRepo.findById(id);
    if (!existing) {
      throw new Error('Siswa tidak ditemukan.');
    }
    await studentRepo.deleteFace(id);
  }

  async getStudentEmbeddings() {
    const allStudents = await db.select({
      id: students.id,
      nis: students.nis,
      studentName: students.name,
      faceEmbedding: students.faceEmbedding,
      photo: students.photo,
    }).from(students);

    return allStudents.filter(s => s.faceEmbedding).map(s => {
      let embeddings: number[][] = [];
      try {
        const parsed = JSON.parse(s.faceEmbedding!);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && Array.isArray(parsed[0])) {
            embeddings = parsed as number[][];
          } else {
            embeddings = [parsed as number[]];
          }
        }
      } catch { }
      return {
        id: s.id,
        nis: s.nis,
        studentName: s.studentName,
        photo: s.photo,
        faceEmbedding: embeddings,
      };
    });
  }

  async importStudents(filePath: string) {
    const fs = await import('fs');
    const { parseExcelStudentFile } = await import('../lib/excelParser.js');
    const { rows, errors: parseErrors } = parseExcelStudentFile(filePath);
    const { classes } = await import('../db/schema.js');

    const results: { row: number; nis: string; status: string; error?: string }[] = [];
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const classRecord = await db.select().from(classes).where(eq(classes.name, row.className)).limit(1);
        if (classRecord.length === 0) {
          results.push({ row: rowNum, nis: row.nis, status: 'failed', error: `Kelas "${row.className}" tidak ditemukan.` });
          failed++;
          continue;
        }

        const existingNis = await studentRepo.findByNis(row.nis);
        if (existingNis) {
          results.push({ row: rowNum, nis: row.nis, status: 'skipped', error: 'NIS sudah terdaftar.' });
          failed++;
          continue;
        }

        const studentId = await studentRepo.create(row.name, row.nis, classRecord[0].id);
        try {
          const qrPath = await generateQrCode(row.nis, studentId);
          await studentRepo.updateQrCode(studentId, qrPath);
        } catch (err) {
          console.error(`[QR] Gagal generate QR untuk NIS ${row.nis}:`, err);
        }

        results.push({ row: rowNum, nis: row.nis, status: 'imported' });
        imported++;
      } catch (err: any) {
        results.push({ row: rowNum, nis: row.nis, status: 'failed', error: err.message || 'Gagal menyimpan siswa.' });
        failed++;
      }
    }

    // Include parse-level errors
    for (const pe of parseErrors) {
      results.push({ row: pe.row, nis: pe.nis, status: 'failed', error: pe.error });
      failed++;
    }

    // Clean up uploaded file
    try { fs.default.unlinkSync(filePath); } catch { /* ignore */ }

    return { imported, failed, results };
  }
}
export const studentService = new StudentService();
