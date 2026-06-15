"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
require("../lib/env.js");
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is missing!');
    }
    console.log('Connecting to database...');
    const connection = await promise_1.default.createConnection(process.env.DATABASE_URL);
    try {
        const [tables] = await connection.query('SHOW TABLES');
        console.log('=== TABLES IN DATABASE ===');
        console.table(tables);
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            console.log(`\n=== DESCRIBE ${tableName} ===`);
            try {
                const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
                console.table(cols);
            }
            catch (err) {
                console.error(`Error describing table ${tableName}:`, err.message);
            }
        }
    }
    catch (err) {
        console.error('Error occurred:', err.message);
    }
    finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}
main().catch(console.error);
