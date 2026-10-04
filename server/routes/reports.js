import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { getDatabase } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'estimates');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv|pdf)$/i.test(file.originalname);
    cb(null, ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function parseSheetRows(rows) {
  const output = [];
  for (const row of rows) {
    if (!row || Object.keys(row).length === 0) continue;

    const values = Object.values(row);
    if (values.length === 0) continue;

    const first = String(values[0] || '').trim();
    if (!first || first.toLowerCase() === 'code') continue;

    const code = String(values[0] || '').trim();
    const name = String(values[1] || values[0] || '').trim();
    const unit = String(values[2] || 'dona').trim();
    const plannedQuantity = Number(values[3] || 0);
    const unitPrice = Number(values[4] || values[5] || 0);
    const totalPrice = Number(values[5] || values[4] || (plannedQuantity * unitPrice));

    if (!name) continue;

    output.push({
      code,
      name,
      category: 'Umumiy',
      unit: unit || 'dona',
      planned_quantity: Number.isFinite(plannedQuantity) ? plannedQuantity : 0,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      total_price: Number.isFinite(totalPrice) ? totalPrice : 0,
      completed_quantity: 0,
      remaining_quantity: Number.isFinite(plannedQuantity) ? plannedQuantity : 0,
      status: 'PLANNED',
    });
  }
  return output;
}

async function parseEstimateFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    return parseSheetRows(data);
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const lines = data.text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rows = [];
    lines.forEach((line) => {
      if (/(\d+\.?\d*|[a-zA-Z]+)/i.test(line)) {
        const pieces = line.split(/\s+/);
        if (pieces.length >= 4) {
          rows.push({
            code: pieces[0],
            name: pieces.slice(1, pieces.length - 2).join(' '),
            unit: pieces[pieces.length - 2] || 'dona',
            planned_quantity: Number(pieces[pieces.length - 1]) || 0,
          });
        }
      }
    });

    return rows.map((row) => ({
      code: row.code,
      name: row.name || 'Qator',
      category: 'Umumiy',
      unit: row.unit || 'dona',
      planned_quantity: Number(row.planned_quantity) || 0,
      unit_price: 0,
      total_price: 0,
      completed_quantity: 0,
      remaining_quantity: Number(row.planned_quantity) || 0,
      status: 'PLANNED',
    }));
  }

  return [];
}

router.post('/upload/:projectId', authMiddleware, requireRole('RAHBAR'), upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Fayl tanlanmadi' });

    const db = getDatabase();
    const fileRecord = db.prepare('INSERT INTO estimate_files (project_id, file_name, file_path, uploaded_by, file_type) VALUES (?, ?, ?, ?, ?)')
      .run(projectId, req.file.originalname, req.file.path, req.user.id, path.extname(req.file.originalname).toLowerCase().replace('.', ''));

    const parsedRows = await parseEstimateFile(req.file.path, req.file.originalname);

    for (const row of parsedRows) {
      const total = Number(row.planned_quantity || 0) * Number(row.unit_price || 0);
      db.prepare(`
        INSERT INTO estimate_items (project_id, code, name, category, unit, planned_quantity, unit_price, total_price, completed_quantity, remaining_quantity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        row.code || '',
        row.name || 'Noma\'lum',
        row.category || 'Umumiy',
        row.unit || 'dona',
        Number(row.planned_quantity || 0),
        Number(row.unit_price || 0),
        total,
        0,
        Number(row.planned_quantity || 0),
        'PLANNED'
      );
    }

    db.close();
    logAudit(req.user.id, 'ESTIMATE_UPLOAD', 'PROJECT', Number(projectId), req.file.originalname);
    res.status(201).json({ message: 'Hisob-varaq yuklandi', rows: parsedRows.length, fileId: fileRecord.lastInsertRowid });
  } catch (error) {
    console.error('Estimate upload error:', error);
    res.status(500).json({ error: 'Hisob-varaqni o\'qishda xatolik' });
  }
});

router.get('/:projectId', authMiddleware, (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM estimate_items WHERE project_id = ? ORDER BY id').all(req.params.projectId);
  db.close();
  res.json(rows);
});

export default router;
