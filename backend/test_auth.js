require('./dist/lib/env.js');
const { auth } = require('./dist/lib/auth.js');

async function main() {
  try {
    const result = await auth.api.signInEmail({
      body: { email: 'admin@school.com', password: 'adminPassword123' }
    });
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.cause) console.error('CAUSE:', e.cause);
  }
}
main();
