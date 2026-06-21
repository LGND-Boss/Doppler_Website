const express = require('express');
const db = require('../db');
const { requireStaff } = require('../auth');

const router = express.Router();
router.use(requireStaff);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM seats ORDER BY created_at');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { label, zone } = req.body || {};
  if (!label || !label.trim()) return res.status(400).json({ error: 'label required' });
  const { rows } = await db.query(
    'INSERT INTO seats (label, zone) VALUES ($1, $2) RETURNING *',
    [label.trim(), zone || null]
  );
  res.json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { label, zone, active } = req.body || {};
  const { rows } = await db.query(
    `UPDATE seats SET
       label = COALESCE($2, label),
       zone = COALESCE($3, zone),
       active = COALESCE($4, active)
     WHERE id = $1 RETURNING *`,
    [req.params.id, label ?? null, zone ?? null, typeof active === 'boolean' ? active : null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'seat not found' });
  res.json(rows[0]);
});

module.exports = router;
