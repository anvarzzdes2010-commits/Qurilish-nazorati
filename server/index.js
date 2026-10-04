import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import estimateRoutes from './routes/estimates.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

initializeDatabase();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Qurilish Nazorati API ishlayapti' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server xatosi', detail: err.message || 'unknown' });
});

app.listen(PORT, () => {
  console.log(`Qurilish Nazorati server ${PORT} portda ishlayapti`);
});

export default app;
