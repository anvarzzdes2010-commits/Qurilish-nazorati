import fs from 'fs';
import path from 'path';
import { getDatabase } from './init.js';

export function ensureDirs() {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads', 'estimates'),
    path.join(process.cwd(), 'uploads', 'photos'),
    path.join(process.cwd(), 'data'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

export function seedAdminIfNeeded() {
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  db.close();

  if (count > 0) return;

  const adminUser = process.env.ADMIN_USERNAME || 'rahbar';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Rahbar123!';

  const bcrypt = await import('bcryptjs');
  const hash = bcrypt.default.hashSync(adminPassword, 10);

  const db2 = getDatabase();
  db2.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, 'RAHBAR', 1)
  `).run(adminUser, hash, 'Bosh Rahbar');
  db2.close();

  console.log(`Administrator yaratildi. Login: ${adminUser} / ${adminPassword}`);
}
