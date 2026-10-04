import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../auth/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

router.get('/', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  db.close();
  res.json(rows);
});

router.post('/', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  const { username, password, full_name, role } = req.body || {};
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Barcha maydonlar kerak' });
  }
  if (!['PRARAB', 'PTO'].includes(role)) {
    return res.status(400).json({ error: 'Noto\'g\'ri rol' });
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.close();
    return res.status(409).json({ error: 'Bu username mavjud' });
  }

  const row = db.prepare('INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)').run(username, hashPassword(password), full_name, role);
  db.close();
  logAudit(req.user.id, 'CREATE_USER', 'USER', row.lastInsertRowid, `${role} yaratildi`);
  res.status(201).json({ id: row.lastInsertRowid, username, full_name, role });
});

router.patch('/:id/deactivate', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  const db = getDatabase();
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  db.close();
  logAudit(req.user.id, 'DEACTIVATE_USER', 'USER', Number(req.params.id), 'deactivate');
  res.json({ message: 'Foydalanuvchi nofaol qilindi' });
});

router.get('/role/:role', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT id, username, full_name FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name').all(req.params.role);
  db.close();
  res.json(rows);
});

export default router;
