"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleService = exports.ScheduleService = void 0;
const scheduleRepository_js_1 = require("../repositories/scheduleRepository.js");
class ScheduleService {
    async getSchedules() {
        return scheduleRepository_js_1.scheduleRepo.findAll();
    }
    async updateSchedule(id, dto) {
        const schedule = await scheduleRepository_js_1.scheduleRepo.findById(id);
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
        await scheduleRepository_js_1.scheduleRepo.update(id, dto.checkinStart, dto.lateAfter, dto.checkoutTime);
    }
}
exports.ScheduleService = ScheduleService;
exports.scheduleService = new ScheduleService();
