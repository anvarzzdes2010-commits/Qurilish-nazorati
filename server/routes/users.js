import express from 'express';
import { authenticateUser, createSession, hashPassword, invalidateSession } from '../auth/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { getDatabase } from '../db/init.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi va parol kerak' });
    }

    const user = authenticateUser(username, password);
    if (!user) {
      logAudit(0, 'LOGIN_FAILED', 'USER', null, username);
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    }

    const token = createSession(user.id);
    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logAudit(user.id, 'LOGIN', 'USER', user.id, 'Success');
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    full_name: req.user.full_name,
    role: req.user.role,
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  const token = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) invalidateSession(token);
  res.clearCookie('session_token');
  logAudit(req.user.id, 'LOGOUT', 'USER', req.user.id, 'logout');
  res.json({ message: 'Tizimdan chiqildi' });
});

router.post('/setup-admin', (req, res) => {
  const { username, password, full_name } = req.body || {};
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'username, password, full_name talab qilinadi' });
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.close();
    return res.status(409).json({ error: 'Bu username mavjud' });
  }

  const hash = hashPassword(password);
  const row = db.prepare('INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)').run(username, hash, full_name, 'RAHBAR');
  db.close();
  logAudit(row.lastInsertRowid, 'SETUP_ADMIN', 'USER', row.lastInsertRowid, 'Administrator yaratildi');
  res.status(201).json({ message: 'Rahbar yaratildi' });
});

export default router;
