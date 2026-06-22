const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12, // 12h
  },
});

function requireStaff(req, res, next) {
  if (req.session && req.session.staffId) return next();
  return res.status(401).json({ error: 'not authenticated' });
}

// Allow only the given roles. Always allows 'admin'.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!(req.session && req.session.staffId)) return res.status(401).json({ error: 'not authenticated' });
    const role = req.session.role;
    if (role === 'admin' || roles.includes(role)) return next();
    return res.status(403).json({ error: 'forbidden for role: ' + role });
  };
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const { rows } = await db.query('SELECT id, password_hash, role FROM staff_users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  req.session.staffId = user.id;
  req.session.email = email;
  req.session.role = user.role;
  res.json({ email, role: user.role });
}

function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

function me(req, res) {
  if (req.session && req.session.staffId) return res.json({ email: req.session.email, role: req.session.role });
  res.status(401).json({ error: 'not authenticated' });
}

module.exports = { sessionMiddleware, requireStaff, requireRole, login, logout, me };
