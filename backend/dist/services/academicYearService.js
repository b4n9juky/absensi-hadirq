"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicYearService = exports.AcademicYearService = void 0;
const academicYearRepository_js_1 = require("../repositories/academicYearRepository.js");
const index_js_1 = require("../db/index.js");
class AcademicYearService {
    async getYears() {
        return academicYearRepository_js_1.academicYearRepo.findAll();
    }
    async createYear(dto) {
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama tahun ajaran tidak boleh kosong.');
        }
        const isActive = dto.isActive ?? false;
        if (isActive) {
            // Transaction context to ensure single active academic year
            return index_js_1.db.transaction(async (tx) => {
                await academicYearRepository_js_1.academicYearRepo.deactivateAll();
                return academicYearRepository_js_1.academicYearRepo.create(dto.name, true);
            });
        }
        return academicYearRepository_js_1.academicYearRepo.create(dto.name, false);
    }
    async activateYear(id) {
        const year = await academicYearRepository_js_1.academicYearRepo.findById(id);
        if (!year) {
            throw new Error(`Tahun ajaran dengan ID ${id} tidak ditemukan.`);
        }
        return index_js_1.db.transaction(async (tx) => {
            await academicYearRepository_js_1.academicYearRepo.deactivateAll();
            await academicYearRepository_js_1.academicYearRepo.setActive(id);
        });
    }
}
exports.AcademicYearService = AcademicYearService;
exports.academicYearService = new AcademicYearService();
