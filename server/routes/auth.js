import express from 'express';
import { getDatabase } from '../db/init.js';
import { authenticateUser, createSession, hashPassword, invalidateSession } from '../auth/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi va parol talab qilinadi' });
    }
    
    const user = authenticateUser(username, password);
    
    if (!user) {
      logAudit(0, 'LOGIN_FAILED', 'USER', null, `username: ${username}`);
      return res.status(401).json({ error: 'Noto\'g\'ri foydalanuvchi nomi yoki parol' });
    }
    
    const token = createSession(user.id);
    logAudit(user.id, 'LOGIN', 'USER', user.id);
    
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    full_name: req.user.full_name,
    role: req.user.role
  });
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  try {
    const token = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      invalidateSession(token);
      logAudit(req.user.id, 'LOGOUT', 'USER', req.user.id);
    }
    res.clearCookie('session_token');
    res.json({ message: 'Tizimdan chiqildi' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
