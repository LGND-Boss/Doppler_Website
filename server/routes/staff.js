const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireRole } = require('../auth');

const router = express.Router();
router.use(requireRole('admin')); // admin only (requireRole always allows admin)

const ROLES = ['admin']; // phase 1: single role
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT id, email, role, created_at FROM staff_users ORDER BY created_at');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'valid email required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'role must be one of ' + ROLES.join(', ') });
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await db.query(
      'INSERT INTO staff_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email.trim().toLowerCase(), hash, role]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'that email already has an account' });
    throw e;
  }
});

router.patch('/:id', async (req, res) => {
  const { password, role } = req.body || {};
  if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'invalid role' });
  if (password !== undefined && password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
  // Don't let the last admin be demoted.
  if (role && role !== 'admin') {
    const tgt = await db.query('SELECT role FROM staff_users WHERE id = $1', [req.params.id]);
    if (tgt.rows[0] && tgt.rows[0].role === 'admin') {
      const admins = await db.query("SELECT count(*)::int AS n FROM staff_users WHERE role = 'admin'");
      if (admins.rows[0].n <= 1) return res.status(400).json({ error: 'cannot demote the last admin' });
    }
  }
  const hash = password ? await bcrypt.hash(password, 12) : null;
  const { rows } = await db.query(
    `UPDATE staff_users SET
       role = COALESCE($2, role),
       password_hash = COALESCE($3, password_hash)
     WHERE id = $1 RETURNING id, email, role, created_at`,
    [req.params.id, role ?? null, hash]
  );
  if (!rows[0]) return res.status(404).json({ error: 'staff not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.session.staffId) return res.status(400).json({ error: "you can't delete your own account" });
  const tgt = await db.query('SELECT role FROM staff_users WHERE id = $1', [req.params.id]);
  if (!tgt.rows[0]) return res.status(404).json({ error: 'staff not found' });
  if (tgt.rows[0].role === 'admin') {
    const admins = await db.query("SELECT count(*)::int AS n FROM staff_users WHERE role = 'admin'");
    if (admins.rows[0].n <= 1) return res.status(400).json({ error: 'cannot delete the last admin' });
  }
  await db.query('DELETE FROM staff_users WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
