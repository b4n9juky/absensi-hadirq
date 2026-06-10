import { academicYearRepo } from '../repositories/academicYearRepository.js';
import { db } from '../db/index.js';

export interface CreateAcademicYearDto {
  name: string;
  isActive?: boolean;
}

export class AcademicYearService {
  async getYears() {
    return academicYearRepo.findAll();
  }

  async createYear(dto: CreateAcademicYearDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama tahun ajaran tidak boleh kosong.');
    }

    const isActive = dto.isActive ?? false;

    if (isActive) {
      // Transaction context to ensure single active academic year
      return db.transaction(async (tx) => {
        await academicYearRepo.deactivateAll();
        return academicYearRepo.create(dto.name, true);
      });
    }

    return academicYearRepo.create(dto.name, false);
  }

  async activateYear(id: number) {
    const year = await academicYearRepo.findById(id);
    if (!year) {
      throw new Error(`Tahun ajaran dengan ID ${id} tidak ditemukan.`);
    }

    return db.transaction(async (tx) => {
      await academicYearRepo.deactivateAll();
      await academicYearRepo.setActive(id);
    });
  }
}
export const academicYearService = new AcademicYearService();
