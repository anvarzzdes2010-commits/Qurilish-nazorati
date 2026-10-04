import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getDatabase } from '../db/init.js';

const TOKEN_EXPIRY_HOURS = 7 * 24; // 7 days

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
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(userId, token, expiresAt.toISOString());
  db.close();
  
  return token;
}

export function getSessionUser(token) {
  const db = getDatabase();
  
  const session = db.prepare(`
    SELECT s.*, u.* FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);
  
  db.close();
  return session;
}

export function invalidateSession(token) {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  db.close();
}

export function authenticateUser(username, password) {
  const db = getDatabase();
  
  const user = db.prepare(`
    SELECT * FROM users WHERE username = ? AND is_active = 1
  `).get(username);
  
  db.close();
  
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  
  return user;
}
