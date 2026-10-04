import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDatabase();
  const projects = db.prepare('SELECT id FROM projects').all();
  let totalAmount = 0;
  let totalPlanned = 0;
  let totalApproved = 0;
  let totalRemaining = 0;

  projects.forEach((project) => {
    const items = db.prepare('SELECT * FROM estimate_items WHERE project_id = ?').all(project.id);
    items.forEach((item) => {
      totalAmount += Number(item.total_price || 0);
      totalPlanned += Number(item.planned_quantity || 0);
      totalApproved += Number(item.completed_quantity || 0);
      totalRemaining += Number(item.remaining_quantity || 0);
    });
  });

  const pendingReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'PENDING'").get().c;
  const approvedReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'APPROVED'").get().c;
  const rejectedReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'REJECTED'").get().c;

  const material = db.prepare("SELECT COUNT(*) as c FROM reports WHERE report_type = 'MATERIAL_DELIVERY'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM reports WHERE report_type = 'COMPLETED_WORK'").get().c;

  db.close();
  res.json({
    totalEstimateAmount: totalAmount,
    totalPlannedQuantities: totalPlanned,
    totalApprovedQuantities: totalApproved,
    remainingQuantities: totalRemaining,
    pendingReports,
    approvedReports,
    rejectedReports,
    materialDeliveryStats: material,
    completedWorkStats: completed,
  });
});

export default router;
