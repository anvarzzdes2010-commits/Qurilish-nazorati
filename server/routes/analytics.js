import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  db.close();
  res.json(rows);
});

router.patch('/:id/read', authMiddleware, (req, res) => {
  const db = getDatabase();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  db.close();
  res.json({ message: 'O\'qilgan' });
});

export default router;
