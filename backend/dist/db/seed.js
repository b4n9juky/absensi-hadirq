"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const schema_js_1 = require("./schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_js_1 = require("../lib/auth.js");
async function seed() {
    console.log('--- START DATABASE SEEDING ---');
    try {
        // 1. Active Academic Year
        const existingYears = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.name, '2025/2026'));
        let activeYearId;
        if (existingYears.length === 0) {
            const [insertResult] = await index_js_1.db.insert(schema_js_1.academicYears).values({
                name: '2025/2026',
                isActive: true,
            });
            activeYearId = insertResult.insertId;
            console.log('Inserted Academic Year: 2025/2026');
        }
        else {
            activeYearId = existingYears[0].id;
            console.log('Academic Year 2025/2026 already exists');
        }
        // 2. Active Semester (linked to Academic Year)
        const existingSemesters = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.name, 'Ganjil'));
        let activeSemesterId;
        if (existingSemesters.length === 0) {
            const [insertResult] = await index_js_1.db.insert(schema_js_1.semesters).values({
                academicYearId: activeYearId,
                name: 'Ganjil',
                isActive: true,
            });
            activeSemesterId = insertResult.insertId;
            console.log('Inserted Semester: Ganjil');
        }
        else {
            activeSemesterId = existingSemesters[0].id;
            console.log('Semester Ganjil already exists');
        }
        // 3. Demo Class
        const existingClasses = await index_js_1.db.select().from(schema_js_1.classes).where((0, drizzle_orm_1.eq)(schema_js_1.classes.name, 'XII IPA 1'));
        let classId;
        if (existingClasses.length === 0) {
            const [insertResult] = await index_js_1.db.insert(schema_js_1.classes).values({
                name: 'XII IPA 1',
            });
            classId = insertResult.insertId;
            console.log('Inserted Class: XII IPA 1');
        }
        else {
            classId = existingClasses[0].id;
            console.log('Class XII IPA 1 already exists');
        }
        // Seed Better Auth Users
        // A. Seed Admin User
        let adminUser = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, 'admin@school.com')).limit(1);
        let adminUserId;
        if (adminUser.length === 0) {
            const res = await auth_js_1.auth.api.signUpEmail({
                body: {
                    email: 'admin@school.com',
                    password: 'adminPassword123',
                    name: 'Administrator'
                }
            });
            await index_js_1.db.update(schema_js_1.user).set({ role: 'admin' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, res.user.id));
            adminUserId = res.user.id;
            console.log('Seeded Admin User');
        }
        else {
            adminUserId = adminUser[0].id;
            console.log('Admin User already exists');
        }
        // B. Seed Guru User
        let guruUser = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, 'guru@school.com')).limit(1);
        let guruUserId;
        if (guruUser.length === 0) {
            const res = await auth_js_1.auth.api.signUpEmail({
                body: {
                    email: 'guru@school.com',
                    password: 'guruPassword123',
                    name: 'Guru Pengawas'
                }
            });
            await index_js_1.db.update(schema_js_1.user).set({ role: 'guru' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, res.user.id));
            guruUserId = res.user.id;
            console.log('Seeded Guru User');
        }
        else {
            guruUserId = guruUser[0].id;
            console.log('Guru User already exists');
        }
        // C. Seed Siswa User
        let siswaUser = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, 'siswa@school.com')).limit(1);
        let siswaUserId;
        if (siswaUser.length === 0) {
            const res = await auth_js_1.auth.api.signUpEmail({
                body: {
                    email: 'siswa@school.com',
                    password: 'siswaPassword123',
                    name: 'Siswa Demo'
                }
            });
            siswaUserId = res.user.id;
            console.log('Seeded Siswa User');
        }
        else {
            siswaUserId = siswaUser[0].id;
            console.log('Siswa User already exists');
        }
        // 4. Demo Student mapped to Android Client default NIS and seeded user
        const existingStudents = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, 'SISWA-BTG-025'));
        if (existingStudents.length === 0) {
            await index_js_1.db.insert(schema_js_1.students).values({
                userId: siswaUserId,
                nis: 'SISWA-BTG-025',
                classId: classId,
            });
            console.log('Inserted Student with NIS: SISWA-BTG-025');
        }
        else {
            await index_js_1.db.update(schema_js_1.students).set({ userId: siswaUserId }).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, 'SISWA-BTG-025'));
            console.log('Student with NIS SISWA-BTG-025 already exists, updated userId reference');
        }
        // 5. Default Schedules (Monday to Sunday)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        for (const day of days) {
            const existingSchedule = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.dayName, day));
            if (existingSchedule.length === 0) {
                await index_js_1.db.insert(schema_js_1.schedules).values({
                    dayName: day,
                    checkinStart: '06:00:00',
                    lateAfter: '07:30:00',
                    checkoutTime: '13:00:00',
                });
                console.log(`Inserted Default Schedule for: ${day}`);
            }
            else {
                console.log(`Schedule for ${day} already exists`);
            }
        }
        console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
    }
    catch (error) {
        console.error('Error during database seeding:', error);
    }
    finally {
        process.exit(0);
    }
}
seed();
