import { getDatabase } from '../db/init.js';

export function logAudit(userId, action, entityType, entityId, details = '') {
  try {
    const db = getDatabase();
    db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(userId, action, entityType, entityId, details);
    db.close();
  } catch (err) {
    console.error('Audit log xatosi:', err.message);
  }
}
