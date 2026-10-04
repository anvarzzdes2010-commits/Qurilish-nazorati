import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDatabase();
  let rows = [];

  if (req.user.role === 'RAHBAR') {
    rows = db.prepare(`
      SELECT p.*, u1.full_name as prarab_name, u2.full_name as pto_name
      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.responsible_prarab_id
      LEFT JOIN users u2 ON u2.id = p.responsible_pto_id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT p.*, u1.full_name as prarab_name, u2.full_name as pto_name
      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.responsible_prarab_id
      LEFT JOIN users u2 ON u2.id = p.responsible_pto_id
      WHERE p.responsible_prarab_id = ? OR p.responsible_pto_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id, req.user.id);
  }

  db.close();
  res.json(rows);
});

router.post('/', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  const { name, address, description, responsible_prarab_id, responsible_pto_id, created_at } = req.body || {};
  if (!name || !address) return res.status(400).json({ error: 'Nomi va manzil kerak' });

  const db = getDatabase();
  const row = db.prepare(`
    INSERT INTO projects (name, address, description, created_by, responsible_prarab_id, responsible_pto_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, address, description || '', req.user.id, responsible_prarab_id || null, responsible_pto_id || null, created_at || new Date().toISOString());

  db.close();
  logAudit(req.user.id, 'CREATE_PROJECT', 'PROJECT', row.lastInsertRowid, name);
  res.status(201).json({ id: row.lastInsertRowid, name, address, description, responsible_prarab_id, responsible_pto_id });
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDatabase();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    db.close();
    return res.status(404).json({ error: 'Loyiha topilmadi' });
  }
  db.close();
  res.json(project);
});

export default router;
