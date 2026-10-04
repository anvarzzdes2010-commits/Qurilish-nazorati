import { initializeDatabase } from './db/init.js';
import bcrypt from 'bcryptjs';
import { getDatabase } from './db/init.js';

initializeDatabase();

const username = process.env.ADMIN_USERNAME || 'rahbar';
const password = process.env.ADMIN_PASSWORD || 'Rahbar123!';
const fullName = process.env.ADMIN_FULL_NAME || 'Bosh Rahbar';

const db = getDatabase();
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log(`Rahbar allaqachon mavjud: ${username}`);
  process.exit(0);
}

const hashed = bcrypt.hashSync(password, 10);
db.prepare('INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)').run(username, hashed, fullName, 'RAHBAR');
console.log(`Rahbar yaratildi`);
console.log(`Username: ${username}`);
console.log(`Password: ${password}`);
console.log('Iltimos xavfsizlik uchun parolni o\'zgartiring');
db.close();
