"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semesterService = exports.SemesterService = void 0;
const semesterRepository_js_1 = require("../repositories/semesterRepository.js");
const academicYearRepository_js_1 = require("../repositories/academicYearRepository.js");
const index_js_1 = require("../db/index.js");
class SemesterService {
    async getSemesters() {
        return semesterRepository_js_1.semesterRepo.findAll();
    }
    async createSemester(dto) {
        if (!dto.name || dto.name.trim() === '') {
            throw new Error('Nama semester tidak boleh kosong.');
        }
        const year = await academicYearRepository_js_1.academicYearRepo.findById(dto.academicYearId);
        if (!year) {
            throw new Error(`Tahun ajaran dengan ID ${dto.academicYearId} tidak ditemukan.`);
        }
        const isActive = dto.isActive ?? false;
        if (isActive) {
            return index_js_1.db.transaction(async (tx) => {
                await semesterRepository_js_1.semesterRepo.deactivateAllInYear(dto.academicYearId);
                return semesterRepository_js_1.semesterRepo.create(dto.academicYearId, dto.name, true);
            });
        }
        return semesterRepository_js_1.semesterRepo.create(dto.academicYearId, dto.name, false);
    }
    async activateSemester(id) {
        const semester = await semesterRepository_js_1.semesterRepo.findById(id);
        if (!semester) {
            throw new Error(`Semester dengan ID ${id} tidak ditemukan.`);
        }
        return index_js_1.db.transaction(async (tx) => {
            await semesterRepository_js_1.semesterRepo.deactivateAllInYear(semester.academicYearId);
            await semesterRepository_js_1.semesterRepo.setActive(id);
        });
    }
}
exports.SemesterService = SemesterService;
exports.semesterService = new SemesterService();
