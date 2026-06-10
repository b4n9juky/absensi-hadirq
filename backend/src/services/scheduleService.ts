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

    // Normalize time: accept HH:MM or HH:MM:SS, always store HH:MM:SS
    const normalizeTime = (val: string): string => {
      const shortRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const longRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
      if (shortRegex.test(val)) return val + ':00';
      if (longRegex.test(val)) return val;
      throw new Error('Format waktu harus HH:MM atau HH:MM:SS (contoh: 07:30 atau 07:30:00).');
    };

    dto.checkinStart = normalizeTime(dto.checkinStart);
    dto.lateAfter = normalizeTime(dto.lateAfter);
    dto.checkoutTime = normalizeTime(dto.checkoutTime);

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
