"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agendaAttendanceService = exports.AgendaAttendanceService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class AgendaAttendanceService {
    async getAgendas(teacherId, filters) {
        const conditions = [(0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.teacherId, teacherId)];
        if (filters?.date)
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.date, filters.date));
        if (filters?.agendaType)
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.agendaType, filters.agendaType));
        return index_js_1.db.select({
            id: schema_js_1.teacherAgendas.id,
            title: schema_js_1.teacherAgendas.title,
            agendaType: schema_js_1.teacherAgendas.agendaType,
            date: schema_js_1.teacherAgendas.date,
            startTime: schema_js_1.teacherAgendas.startTime,
            endTime: schema_js_1.teacherAgendas.endTime,
            className: schema_js_1.classes.name,
            classId: schema_js_1.classes.id,
        })
            .from(schema_js_1.teacherAgendas)
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.classId, schema_js_1.classes.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.teacherAgendas.date));
    }
    async createAgenda(teacherId, data) {
        const activeAcademicYear = await index_js_1.db.select({ id: schema_js_1.academicYears.id })
            .from(schema_js_1.academicYears)
            .where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true))
            .limit(1);
        const activeSemester = await index_js_1.db.select({ id: schema_js_1.semesters.id })
            .from(schema_js_1.semesters)
            .where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true))
            .limit(1);
        if (activeAcademicYear.length === 0)
            throw new Error('Tidak ada tahun ajaran aktif.');
        if (activeSemester.length === 0)
            throw new Error('Tidak ada semester aktif.');
        const [result] = await index_js_1.db.insert(schema_js_1.teacherAgendas).values({
            teacherId,
            classId: data.classId,
            title: data.title,
            agendaType: data.agendaType || null,
            date: data.date,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            academicYearId: activeAcademicYear[0].id,
            semesterId: activeSemester[0].id,
        });
        return result.insertId;
    }
    async updateAgenda(teacherId, agendaId, data) {
        const existing = await index_js_1.db.select({ teacherId: schema_js_1.teacherAgendas.teacherId })
            .from(schema_js_1.teacherAgendas)
            .where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId))
            .limit(1);
        if (existing.length === 0)
            throw new Error('Agenda tidak ditemukan.');
        if (existing[0].teacherId !== teacherId)
            throw new Error('Anda tidak memiliki akses ke agenda ini.');
        await index_js_1.db.update(schema_js_1.teacherAgendas)
            .set({
            ...(data.title !== undefined && { title: data.title }),
            ...(data.agendaType !== undefined && { agendaType: data.agendaType }),
            ...(data.date !== undefined && { date: data.date }),
            ...(data.startTime !== undefined && { startTime: data.startTime }),
            ...(data.endTime !== undefined && { endTime: data.endTime }),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId));
    }
    async deleteAgenda(teacherId, agendaId) {
        const existing = await index_js_1.db.select({ teacherId: schema_js_1.teacherAgendas.teacherId })
            .from(schema_js_1.teacherAgendas)
            .where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId))
            .limit(1);
        if (existing.length === 0)
            throw new Error('Agenda tidak ditemukan.');
        if (existing[0].teacherId !== teacherId)
            throw new Error('Anda tidak memiliki akses ke agenda ini.');
        await index_js_1.db.delete(schema_js_1.agendaAttendances).where((0, drizzle_orm_1.eq)(schema_js_1.agendaAttendances.agendaId, agendaId));
        await index_js_1.db.delete(schema_js_1.teacherAgendas).where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId));
    }
    async getForm(agendaId) {
        const agenda = await index_js_1.db.select({
            id: schema_js_1.teacherAgendas.id,
            classId: schema_js_1.teacherAgendas.classId,
            className: schema_js_1.classes.name,
            title: schema_js_1.teacherAgendas.title,
            agendaType: schema_js_1.teacherAgendas.agendaType,
            date: schema_js_1.teacherAgendas.date,
            startTime: schema_js_1.teacherAgendas.startTime,
            endTime: schema_js_1.teacherAgendas.endTime,
        })
            .from(schema_js_1.teacherAgendas)
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.classId, schema_js_1.classes.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId))
            .limit(1);
        if (agenda.length === 0)
            throw new Error('Agenda tidak ditemukan.');
        const studentsRows = await index_js_1.db.select({
            studentId: schema_js_1.students.id,
            nis: schema_js_1.students.nis,
            studentName: schema_js_1.user.name,
        })
            .from(schema_js_1.students)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, agenda[0].classId))
            .orderBy(schema_js_1.user.name);
        const existingAttendances = await index_js_1.db.select({
            studentId: schema_js_1.agendaAttendances.studentId,
            status: schema_js_1.agendaAttendances.status,
            checkinTime: schema_js_1.agendaAttendances.checkinTime,
            notes: schema_js_1.agendaAttendances.notes,
        })
            .from(schema_js_1.agendaAttendances)
            .where((0, drizzle_orm_1.eq)(schema_js_1.agendaAttendances.agendaId, agendaId));
        const existingMap = new Map(existingAttendances.map(a => [a.studentId, a]));
        const result = studentsRows.map(student => {
            const existing = existingMap.get(student.studentId);
            return {
                studentId: student.studentId,
                nis: student.nis,
                studentName: student.studentName,
                status: existing ? existing.status : 'ABSENT',
                checkinTime: existing ? existing.checkinTime || null : null,
                notes: existing ? existing.notes || '' : '',
            };
        });
        return { agenda: agenda[0], students: result };
    }
    async submitAttendance(agendaId, entries) {
        const validStatuses = ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN'];
        for (const entry of entries) {
            if (!validStatuses.includes(entry.status)) {
                throw new Error(`Status tidak valid untuk siswa ID ${entry.studentId}: ${entry.status}`);
            }
        }
        for (const entry of entries) {
            await index_js_1.db.insert(schema_js_1.agendaAttendances)
                .values({
                agendaId,
                studentId: entry.studentId,
                status: entry.status,
                notes: entry.notes || null,
            })
                .onDuplicateKeyUpdate({
                set: {
                    status: entry.status,
                    notes: entry.notes || null,
                },
            });
        }
        return { success: true, message: `Berhasil menyimpan absensi ${entries.length} siswa.` };
    }
    async qrScanAttendance(teacherId, agendaId, studentNis) {
        const agenda = await index_js_1.db.select({
            id: schema_js_1.teacherAgendas.id,
            teacherId: schema_js_1.teacherAgendas.teacherId,
            classId: schema_js_1.teacherAgendas.classId,
        })
            .from(schema_js_1.teacherAgendas)
            .where((0, drizzle_orm_1.eq)(schema_js_1.teacherAgendas.id, agendaId))
            .limit(1);
        if (agenda.length === 0)
            throw new Error('Agenda tidak ditemukan.');
        if (agenda[0].teacherId !== teacherId)
            throw new Error('Anda tidak memiliki akses ke agenda ini.');
        const student = await index_js_1.db.select({
            id: schema_js_1.students.id,
            nis: schema_js_1.students.nis,
            name: schema_js_1.user.name,
            classId: schema_js_1.students.classId,
        })
            .from(schema_js_1.students)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, studentNis))
            .limit(1);
        if (student.length === 0)
            throw new Error('Siswa dengan NIS tersebut tidak ditemukan.');
        if (student[0].classId !== agenda[0].classId)
            throw new Error('Siswa tidak terdaftar di kelas agenda ini.');
        await index_js_1.db.insert(schema_js_1.agendaAttendances)
            .values({
            agendaId,
            studentId: student[0].id,
            status: 'PRESENT',
            checkinTime: new Date(),
        })
            .onDuplicateKeyUpdate({
            set: {
                status: 'PRESENT',
                checkinTime: new Date(),
            },
        });
        return { success: true, message: `Absensi berhasil untuk ${student[0].name} (${student[0].nis})`, student: student[0] };
    }
}
exports.AgendaAttendanceService = AgendaAttendanceService;
exports.agendaAttendanceService = new AgendaAttendanceService();
