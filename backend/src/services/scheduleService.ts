import { scheduleRepo } from '../repositories/scheduleRepository.js';

export interface UpdateScheduleDto {
  checkinStart: string;
  lateAfter: string;
  checkoutTime: string;
}

export class ScheduleService {
  async getSchedules() {
    return scheduleRepo.findAll();
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto) {
    const schedule = await scheduleRepo.findById(id);
    if (!schedule) {
      throw new Error(`Jadwal dengan ID ${id} tidak ditemukan.`);
    }

    // Time regex validation for HH:MM:SS format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(dto.checkinStart) || !timeRegex.test(dto.lateAfter) || !timeRegex.test(dto.checkoutTime)) {
      throw new Error('Format waktu harus menggunakan format HH:MM:SS (contoh: 07:30:00).');
    }

    // Business rule: checkinStart < lateAfter < checkoutTime
    if (dto.checkinStart >= dto.lateAfter) {
      throw new Error('Waktu mulai absen masuk harus lebih awal dari batas terlambat.');
    }
    if (dto.lateAfter >= dto.checkoutTime) {
      throw new Error('Batas terlambat harus lebih awal dari jam absen pulang.');
    }

    await scheduleRepo.update(id, dto.checkinStart, dto.lateAfter, dto.checkoutTime);
  }
}
export const scheduleService = new ScheduleService();
