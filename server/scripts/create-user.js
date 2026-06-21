require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO staff_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );
  console.log('staff user ready:', email);
  await db.pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
