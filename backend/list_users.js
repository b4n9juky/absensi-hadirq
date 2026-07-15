require('./dist/lib/env.js');
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [r] = await c.query("SELECT email, role FROM user");
  console.log(JSON.stringify(r));
  await c.end();
}
main().catch(e => console.error(e.message));
