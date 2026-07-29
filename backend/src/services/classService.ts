import { classRepo } from '../repositories/classRepository.js';

export interface CreateClassDto {
  name: string;
}

export class ClassService {
  async getClasses() {
    return classRepo.findAll();
  }

  async createClass(dto: CreateClassDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama kelas tidak boleh kosong.');
    }

    // Check class name uniqueness
    const existing = await classRepo.findByName(dto.name);
    if (existing) {
      throw new Error('Nama kelas sudah ada.');
    }

    return classRepo.create(dto.name, 0);
  }

  async updateClass(id: number, dto: CreateClassDto) {
    const existing = await classRepo.findById(id);
    if (!existing) {
      throw new Error('Kelas tidak ditemukan.');
    }

    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama kelas tidak boleh kosong.');
    }

    // Check class name uniqueness if name changed
    if (dto.name !== existing.name) {
      const conflict = await classRepo.findByName(dto.name);
      if (conflict) {
        throw new Error('Nama kelas sudah digunakan.');
      }
    }

    await classRepo.update(id, dto.name);
  }

  async deleteClass(id: number) {
    const existing = await classRepo.findById(id);
    if (!existing) {
      throw new Error('Kelas tidak ditemukan.');
    }
    await classRepo.delete(id);
  }
}
export const classService = new ClassService();
