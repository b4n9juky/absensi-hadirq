"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
require("dotenv/config");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is missing!');
}
async function run() {
    console.log('Connecting to database...');
    const connection = await promise_1.default.createConnection(process.env.DATABASE_URL);
    try {
        console.log('Checking if column class_id already exists in attendances...');
        const [columns] = await connection.query('SHOW COLUMNS FROM attendances LIKE "class_id"');
        if (columns.length === 0) {
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
        console.log('Backfilling class_id for existing attendance records...');
        const [result] = await connection.query(`
      UPDATE attendances
      INNER JOIN students ON attendances.student_id = students.id
      SET attendances.class_id = students.class_id
      WHERE attendances.class_id IS NULL
    `);
        console.log(`Backfill completed. Rows updated: ${result.affectedRows}`);
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
