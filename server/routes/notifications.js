import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'photos');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 }
});

function createNotification(userId, title, body, reportId, projectId) {
  const db = getDatabase();
  db.prepare('INSERT INTO notifications (user_id, title, body, report_id, project_id) VALUES (?, ?, ?, ?, ?)')
    .run(userId, title, body, reportId, projectId);
  db.close();
}

router.get('/', authMiddleware, (req, res) => {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT r.*, p.name as project_name, e.name as item_name, e.code as item_code, u.full_name as submitted_by_name
    FROM reports r
    LEFT JOIN projects p ON p.id = r.project_id
    LEFT JOIN estimate_items e ON e.id = r.estimate_item_id
    LEFT JOIN users u ON u.id = r.submitted_by
    WHERE (? = 'RAHBAR' OR r.submitted_by = ? OR r.project_id IN (SELECT id FROM projects WHERE responsible_prarab_id = ? OR responsible_pto_id = ?))
    ORDER BY r.submitted_at DESC
  `).all(req.user.role, req.user.id, req.user.id, req.user.id);
  db.close();
  res.json(rows);
});

router.post('/', authMiddleware, requireRole('PRARAB'), upload.array('photos', 5), (req, res) => {
  const { project_id, estimate_item_id, report_type, quantity, description, note } = req.body || {};
  if (!project_id || !estimate_item_id || !report_type || !quantity) {
    return res.status(400).json({ error: 'Project, position, report type, quantity kerak' });
  }

  const db = getDatabase();
  const reportId = db.prepare(`
    INSERT INTO reports (project_id, estimate_item_id, report_type, quantity, description, submitted_by, status)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(project_id, estimate_item_id, report_type, Number(quantity), description || '', req.user.id).lastInsertRowid;

  const uploadedFiles = req.files || [];
  uploadedFiles.forEach((file) => {
    db.prepare('INSERT INTO report_photos (report_id, file_path, original_name) VALUES (?, ?, ?)')
      .run(reportId, file.path, file.originalname);
  });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
  const receivers = db.prepare('SELECT id FROM users WHERE role IN (\'RAHBAR\', \'PTO\') AND is_active = 1').all();
  receivers.forEach((u) => {
    createNotification(u.id, 'Yangi hisobot', `Prarab tomonidan ${quantity} birlik kiritildi`, reportId, project_id);
  });

  db.close();
  logAudit(req.user.id, 'CREATE_REPORT', 'REPORT', reportId, `${report_type} qty:${quantity}`);
  res.status(201).json({ id: reportId, status: 'PENDING', message: 'Hisobot yuborildi' });
});

router.post('/:id/approve', authMiddleware, requireRole('PTO'), (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  const db = getDatabase();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!report) {
    db.close();
    return res.status(404).json({ error: 'Hisobot topilmadi' });
  }

  const item = db.prepare('SELECT * FROM estimate_items WHERE id = ?').get(report.estimate_item_id);
  if (!item) {
    db.close();
    return res.status(404).json({ error: 'Hisob elementi topilmadi' });
  }

  const newCompleted = Number(item.completed_quantity || 0) + Number(report.quantity || 0);
  const newRemaining = Math.max(Number(item.planned_quantity || 0) - newCompleted, 0);
  const status = newRemaining <= 0 ? 'COMPLETED' : 'APPROVED';

  db.prepare('UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\'), rejection_reason = ? WHERE id = ?')
    .run('APPROVED', req.user.id, reason || '', id);
  db.prepare('UPDATE estimate_items SET completed_quantity = ?, remaining_quantity = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newCompleted, newRemaining, status, item.id);

  createNotification(report.submitted_by, 'Hisobot tasdiqlandi', `Hisobot tasdiqlandi. Miqdor: ${report.quantity}`, Number(id), report.project_id);
  createNotification(item.project_id ? 0 : 0, 'Hisobot tasdiqlandi', 'Rahbar uchun xabar', Number(id), report.project_id);

  db.close();
  logAudit(req.user.id, 'APPROVE_REPORT', 'REPORT', Number(id), `approved:${report.quantity}`);
  res.json({ message: 'Hisobot tasdiqlandi' });
});

router.post('/:id/reject', authMiddleware, requireRole('PTO'), (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Rad etish sababi kerak' });

  const db = getDatabase();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!report) {
    db.close();
    return res.status(404).json({ error: 'Hisobot topilmadi' });
  }

  db.prepare('UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\'), rejection_reason = ? WHERE id = ?')
    .run('REJECTED', req.user.id, reason, id);

  const project = db.prepare('SELECT created_by, responsible_prarab_id FROM projects WHERE id = ?').get(report.project_id);
  if (project?.created_by) createNotification(project.created_by, 'Hisobot rad etildi', `Sabab: ${reason}`, Number(id), report.project_id);
  if (project?.responsible_prarab_id) createNotification(project.responsible_prarab_id, 'Hisobot rad etildi', `Sabab: ${reason}`, Number(id), report.project_id);
  if (report.submitted_by) createNotification(report.submitted_by, 'Hisobot rad etildi', `Sabab: ${reason}`, Number(id), report.project_id);

  db.close();
  logAudit(req.user.id, 'REJECT_REPORT', 'REPORT', Number(id), reason);
  res.json({ message: 'Hisobot rad etildi' });
});

export default router;
