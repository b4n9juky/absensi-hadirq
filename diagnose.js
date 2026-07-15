// Run this on the SERVER: node diagnose.js
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root@localhost:3306/absensi');
    
    console.log('=== 1. Check students table columns ===');
    const [cols] = await conn.execute('DESCRIBE students');
    cols.forEach(c => console.log('  ' + c.Field, c.Type, c.Null, c.Key));
    
    console.log('\n=== 2. Run the EXACT failing query ===');
    try {
      const [rows] = await conn.execute(
        'SELECT id, name, nis, class_id, device_uuid, qrcode, face_embedding, photo, created_at, updated_at FROM students WHERE students.nis = ? LIMIT ?',
        ['260001', 1]
      );
      console.log('  Query succeeded. Rows:', rows.length);
    } catch (e) {
      console.log('  QUERY FAILED!');
      console.log('  code:', e.code);
      console.log('  errno:', e.errno);
      console.log('  sqlMessage:', e.sqlMessage);
      console.log('  sqlState:', e.sqlState);
    }
    
    console.log('\n=== 3. Check DB version ===');
    const [ver] = await conn.execute('SELECT VERSION() as v');
    console.log('  Version:', ver[0].v);
    
    await conn.end();
  } catch (e) {
    console.error('Connection error:', e.message);
  }
})();
