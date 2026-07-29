import { semesterRepo } from '../repositories/semesterRepository.js';
import { academicYearRepo } from '../repositories/academicYearRepository.js';
import { db } from '../db/index.js';

export interface CreateSemesterDto {
  academicYearId: number;
  name: string;
  isActive?: boolean;
}

export interface UpdateSemesterDto {
  name: string;
  academicYearId?: number;
}

export class SemesterService {
  async getSemesters() {
    return semesterRepo.findAll();
  }

  async createSemester(dto: CreateSemesterDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama semester tidak boleh kosong.');
    }

    const year = await academicYearRepo.findById(dto.academicYearId);
    if (!year) {
      throw new Error(`Tahun ajaran dengan ID ${dto.academicYearId} tidak ditemukan.`);
    }

    const isActive = dto.isActive ?? false;

    if (isActive) {
      return db.transaction(async (tx) => {
        await semesterRepo.deactivateAllInYear(dto.academicYearId);
        return semesterRepo.create(dto.academicYearId, dto.name, true, 0);
      });
    }

    return semesterRepo.create(dto.academicYearId, dto.name, false, 0);
  }

  async updateSemester(id: number, dto: UpdateSemesterDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama semester tidak boleh kosong.');
    }

    const existing = await semesterRepo.findById(id);
    if (!existing) {
      throw new Error(`Semester dengan ID ${id} tidak ditemukan.`);
    }

    if (dto.academicYearId !== undefined) {
      const year = await academicYearRepo.findById(dto.academicYearId);
      if (!year) {
        throw new Error(`Tahun ajaran dengan ID ${dto.academicYearId} tidak ditemukan.`);
      }
    }

    await semesterRepo.update(id, dto.name, dto.academicYearId);
  }

  async activateSemester(id: number) {
    const semester = await semesterRepo.findById(id);
    if (!semester) {
      throw new Error(`Semester dengan ID ${id} tidak ditemukan.`);
    }

    return db.transaction(async (tx) => {
      await semesterRepo.deactivateAllInYear(semester.academicYearId);
      await semesterRepo.setActive(id);
    });
  }

  async deactivateSemester(id: number) {
    const semester = await semesterRepo.findById(id);
    if (!semester) {
      throw new Error(`Semester dengan ID ${id} tidak ditemukan.`);
    }

    await semesterRepo.setInactive(id);
  }
}
export const semesterService = new SemesterService();
