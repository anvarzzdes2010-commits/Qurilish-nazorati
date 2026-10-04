import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { hashPassword } from '../auth/auth.js';

const router = express.Router();

// Create user (Rahbar only)
router.post('/', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Barcha maydonlar talab qilinadi' });
    }
    
    if (!['PRARAB', 'PTO'].includes(role)) {
      return res.status(400).json({ error: 'Noto\'g\'ri rol' });
    }
    
    const db = getDatabase();
    
    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      db.close();
      return res.status(409).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    }
    
    const passwordHash = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(username, passwordHash, full_name, role);
    db.close();
    
    logAudit(req.user.id, 'CREATE_USER', 'USER', result.lastInsertRowid, `role: ${role}`);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      username,
      full_name,
      role
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get all users (Rahbar only)
router.get('/', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  try {
    const db = getDatabase();
    const users = db.prepare(`
      SELECT id, username, full_name, role, is_active, created_at FROM users
      ORDER BY created_at DESC
    `).all();
    db.close();
    
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Deactivate user (Rahbar only)
router.patch('/:id/deactivate', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    db.close();
    
    logAudit(req.user.id, 'DEACTIVATE_USER', 'USER', parseInt(id));
    
    res.json({ message: 'Foydalanuvchi bekor qilindi' });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get Prarab users (for assignment)
router.get('/role/PRARAB', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  try {
    const db = getDatabase();
    const users = db.prepare(`
      SELECT id, username, full_name FROM users
      WHERE role = 'PRARAB' AND is_active = 1
      ORDER BY full_name
    `).all();
    db.close();
    
    res.json(users);
  } catch (err) {
    console.error('Get Prarab users error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get PTO users (for assignment)
router.get('/role/PTO', authMiddleware, requireRole('RAHBAR'), (req, res) => {
  try {
    const db = getDatabase();
    const users = db.prepare(`
      SELECT id, username, full_name FROM users
      WHERE role = 'PTO' AND is_active = 1
      ORDER BY full_name
    `).all();
    db.close();
    
    res.json(users);
  } catch (err) {
    console.error('Get PTO users error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
