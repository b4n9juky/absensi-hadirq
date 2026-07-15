require('./dist/lib/env.js');
const { auth } = require('./dist/lib/auth.js');

async function main() {
  const emails = [
    { email: 'admin@school.com', pass: 'adminPassword123', label: 'admin' },
    { email: 'guru.fisika@school.com', pass: 'guruPassword123', label: 'guru.fisika' },
    { email: 'guru.matematika@school.com', pass: 'guruPassword123', label: 'guru.matematika' },
  ];
  for (const { email, pass, label } of emails) {
    try {
      const r = await auth.api.signInEmail({ body: { email, password: pass } });
      console.log(`${label}: ${email} / ${pass} -> ${r.token ? 'OK' : 'FAIL'}`);
    } catch (e) {
      console.log(`${label}: ${email} / ${pass} -> ERROR: ${e.message}`);
    }
  }
}
main();
