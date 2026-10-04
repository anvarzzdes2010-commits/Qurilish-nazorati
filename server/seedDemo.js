import { initializeDatabase } from './db/init.js';

export default function seedDemoData() {
  const db = getDatabase();
  const users = db.prepare('SELECT id FROM users WHERE username = ?').get('rahbar');
  if (!users) return;

  const projectExists = db.prepare('SELECT id FROM projects WHERE name = ?').get('Shahrisabz Yangi Kesh turar-joy majmuasi');
  if (!projectExists) {
    const project = db.prepare('INSERT INTO projects (name, address, description, created_by) VALUES (?, ?, ?, ?)')
      .run('Shahrisabz Yangi Kesh turar-joy majmuasi', 'Shahrisabz ko\'chasi 12', 'Yangi turar-joy majmuasi', users.id);

    db.prepare('INSERT INTO estimate_items (project_id, code, name, category, unit, planned_quantity, unit_price, total_price, remaining_quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(project.lastInsertRowid, 'A-101', 'G\'isht', 'Material', 'dona', 1000, 1200, 1200000, 1000, 'PLANNED');

    db.prepare('INSERT INTO estimate_items (project_id, code, name, category, unit, planned_quantity, unit_price, total_price, remaining_quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(project.lastInsertRowid, 'B-202', 'Beton', 'Material', 'm3', 200, 350000, 70000000, 200, 'PLANNED');
  }
  db.close();
}
