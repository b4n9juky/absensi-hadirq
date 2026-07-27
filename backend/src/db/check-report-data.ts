import { reportService } from '../services/reportService.js';
import { getSchoolDate } from '../lib/timezone.js';

async function main() {
  console.log('=== REPORT DIAGNOSTIC START ===');
  console.log('Current server timezone time:', getSchoolDate().toLocaleString());

  const datesToTest = ['2026-06-15', '2026-06-16', undefined];
  
  for (const date of datesToTest) {
    console.log(`\nTesting getReport for date: ${date || 'ALL DATES'}`);
    try {
      const result = await reportService.getReport({ date });
      console.log(`Success! Found ${result.length} records.`);
      if (result.length > 0) {
        console.log('Sample record:', JSON.stringify(result[0], null, 2));
      }
    } catch (err: any) {
      console.error('Error occurred:', err.message);
      console.error(err.stack);
    }
  }

  console.log('\n=== REPORT DIAGNOSTIC END ===');
}

main().catch(console.error);
