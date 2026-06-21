"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
require("../lib/env.js");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is missing!');
}
async function run() {
    console.log('Connecting to database...');
    const connection = await promise_1.default.createConnection(process.env.DATABASE_URL);
    try {
        // 1. Create teaching_schedules table if it doesn't exist
        console.log('Checking if table teaching_schedules already exists...');
        const [tables] = await connection.query("SHOW TABLES LIKE 'teaching_schedules'");
        if (tables.length === 0) {
            console.log('Creating teaching_schedules table...');
            await connection.query(`
        CREATE TABLE \`teaching_schedules\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`teacher_id\` varchar(36) NOT NULL,
          \`class_id\` int(11) NOT NULL,
          \`day_name\` varchar(20) NOT NULL,
          \`start_time\` time NOT NULL,
          \`end_time\` time NOT NULL,
          \`subject\` varchar(100) DEFAULT NULL,
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`teaching_schedules_teacher_id_user_id_fk\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`user\` (\`id\`),
          CONSTRAINT \`teaching_schedules_class_id_classes_id_fk\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
            console.log('Table teaching_schedules created successfully.');
        }
        else {
            console.log('Table teaching_schedules already exists.');
        }
        // 2. Check & Add class_id to attendances
        console.log('Checking if column class_id already exists in attendances...');
        const [classCols] = await connection.query('SHOW COLUMNS FROM attendances LIKE "class_id"');
        if (classCols.length === 0) {
            console.log('Adding class_id column to attendances table...');
            await connection.query('ALTER TABLE attendances ADD COLUMN class_id int NULL');
            console.log('Column class_id added successfully.');
            console.log('Adding foreign key constraint for class_id...');
            try {
                await connection.query('ALTER TABLE attendances ADD CONSTRAINT attendances_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES classes(id)');
                console.log('Foreign key constraint added successfully.');
            }
            catch (fkErr) {
                console.warn('Warning adding foreign key constraint:', fkErr.message);
            }
        }
        else {
            console.log('Column class_id already exists.');
        }
        // 3. Check & Add is_verified to attendances
        console.log('Checking if column is_verified already exists in attendances...');
        const [isVerifiedCols] = await connection.query('SHOW COLUMNS FROM attendances LIKE "is_verified"');
        if (isVerifiedCols.length === 0) {
            console.log('Adding is_verified column to attendances table...');
            await connection.query('ALTER TABLE attendances ADD COLUMN is_verified tinyint(1) NOT NULL DEFAULT 0');
            console.log('Column is_verified added successfully.');
        }
        else {
            console.log('Column is_verified already exists.');
        }
        // 4. Update status enum definition in attendances
        console.log('Updating status enum values in attendances table...');
        try {
            await connection.query("ALTER TABLE attendances MODIFY COLUMN status enum('PRESENT', 'LATE', 'SICK', 'EXCUSED', 'ABSENT') NOT NULL");
            console.log('Status enum updated successfully.');
        }
        catch (err) {
            console.error('Error updating status enum:', err.message);
        }
        // 5. Check & Add face_embedding to students
        console.log('Checking if column face_embedding already exists in students...');
        const [faceColumns] = await connection.query('SHOW COLUMNS FROM students LIKE "face_embedding"');
        if (faceColumns.length === 0) {
            console.log('Adding face_embedding column to students table...');
            await connection.query('ALTER TABLE students ADD COLUMN face_embedding text NULL');
            console.log('Column face_embedding added successfully.');
        }
        else {
            console.log('Column face_embedding already exists.');
        }
        // 6. Create subjects table if it doesn't exist
        console.log('Checking if table subjects already exists...');
        const [subjectTables] = await connection.query("SHOW TABLES LIKE 'subjects'");
        if (subjectTables.length === 0) {
            console.log('Creating subjects table...');
            await connection.query(`
        CREATE TABLE \`subjects\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`name\` varchar(100) NOT NULL,
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`name\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
            console.log('Table subjects created successfully.');
        }
        else {
            console.log('Table subjects already exists.');
        }
        // 7. Create subject_attendances table if it doesn't exist
        console.log('Checking if table subject_attendances already exists...');
        const [saTables] = await connection.query("SHOW TABLES LIKE 'subject_attendances'");
        if (saTables.length === 0) {
            console.log('Creating subject_attendances table...');
            await connection.query(`
        CREATE TABLE \`subject_attendances\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`teaching_schedule_id\` int(11) NOT NULL,
          \`student_id\` int(11) NOT NULL,
          \`attendance_date\` date NOT NULL,
          \`status\` enum('PRESENT','SICK','EXCUSED','ABSENT','DISPEN','SKIPPED') NOT NULL,
          \`notes\` varchar(255) DEFAULT NULL,
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`unique_subject_attendance\` (\`teaching_schedule_id\`,\`student_id\`,\`attendance_date\`),
          CONSTRAINT \`subject_attendances_teaching_schedule_id_fk\` FOREIGN KEY (\`teaching_schedule_id\`) REFERENCES \`teaching_schedules\` (\`id\`),
          CONSTRAINT \`subject_attendances_student_id_fk\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
            console.log('Table subject_attendances created successfully.');
        }
        else {
            console.log('Table subject_attendances already exists.');
        }
        // 8. Backfill class_id for old records
        console.log('Backfilling class_id for existing attendance records...');
        const [result] = await connection.query(`
      UPDATE attendances
      INNER JOIN students ON attendances.student_id = students.id
      SET attendances.class_id = students.class_id
      WHERE attendances.class_id IS NULL
    `);
        console.log(`Backfill completed. Rows updated: ${result.affectedRows}`);
        console.log('Migration completed successfully!');
    }
    catch (err) {
        console.error('Error during migration:', err);
    }
    finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}
run().catch(console.error);
