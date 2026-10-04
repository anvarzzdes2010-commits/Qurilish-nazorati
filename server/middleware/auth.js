import { getSessionUser } from '../auth/auth.js';

export function authMiddleware(req, res, next) {
  const token = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Sessiya topilmadi' });
  }
  
  const session = getSessionUser(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan' });
  }
  
  req.user = session;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentifikatsiya talab qilinadi' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sizda ushbu operatsiyaga ruxsat yo\'q' });
    }
    
    next();
  };
}
