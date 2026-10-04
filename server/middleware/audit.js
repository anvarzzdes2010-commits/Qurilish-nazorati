import { getSessionUser } from '../auth/auth.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = req.cookies?.session_token || (authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);

  if (!token) {
    return res.status(401).json({ error: 'Sessiya topilmadi' });
  }

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan' });
  }

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autentifikatsiya zarur' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
    next();
  };
}
