import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getDatabase } from '../db/init.js';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken() {
  return randomBytes(32).toString('hex');
}

export function createSession(userId) {
  const db = getDatabase();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
  db.close();
  return token;
}

export function getSessionUser(token) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT s.*, u.id as user_id, u.username, u.full_name, u.role, u.is_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);
  db.close();
  return row ? {
    id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
  } : null;
}

export function authenticateUser(username, password) {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  db.close();
  if (!user) return null;
  return verifyPassword(password, user.password_hash) ? user : null;
}

export function invalidateSession(token) {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  db.close();
}
