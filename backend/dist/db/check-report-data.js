"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reportService_js_1 = require("../services/reportService.js");
const timezone_js_1 = require("../lib/timezone.js");
async function main() {
    console.log('=== REPORT DIAGNOSTIC START ===');
    console.log('Current server timezone time:', (0, timezone_js_1.getJakartaDate)().toLocaleString());
    const datesToTest = ['2026-06-15', '2026-06-16', undefined];
    for (const date of datesToTest) {
        console.log(`\nTesting getReport for date: ${date || 'ALL DATES'}`);
        try {
            const result = await reportService_js_1.reportService.getReport({ date });
            console.log(`Success! Found ${result.length} records.`);
            if (result.length > 0) {
                console.log('Sample record:', JSON.stringify(result[0], null, 2));
            }
        }
        catch (err) {
            console.error('Error occurred:', err.message);
            console.error(err.stack);
        }
    }
    console.log('\n=== REPORT DIAGNOSTIC END ===');
}
main().catch(console.error);
