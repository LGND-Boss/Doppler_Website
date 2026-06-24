require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

async function main() {
  const [, , email, password, roleArg] = process.argv;
  const role = roleArg || 'admin';
  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> <password> [admin|editor]');
    process.exit(1);
  }
  if (!['admin', 'editor'].includes(role)) {
    console.error('Invalid role:', role, '(use admin|editor)');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO staff_users (email, password_hash, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [email, hash, role]
  );
  console.log(`staff user ready: ${email} (${role})`);
  await db.pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
