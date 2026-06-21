const express = require('express');
const db = require('../db');
const { requireStaff } = require('../auth');
const { adjustPoints, recentHistory } = require('../services/orders');

const router = express.Router();
router.use(requireStaff);

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const like = '%' + q + '%';
  const { rows } = await db.query(
    `SELECT id, email, name, points, last_visit FROM customers
     WHERE ($1 = '' OR email ILIKE $2 OR COALESCE(name,'') ILIKE $2)
     ORDER BY last_visit DESC LIMIT 100`,
    [q, like]
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT id, email, name, points, created_at, last_visit FROM customers WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'customer not found' });
  const history = await recentHistory(null, req.params.id, 50);
  res.json({ ...rows[0], history });
});

router.post('/:id/adjust', async (req, res) => {
  const delta = parseInt(req.body && req.body.delta, 10);
  const reason = (req.body && req.body.reason) || 'adjust';
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ error: 'delta must be a non-zero integer' });
  try {
    const { pointsBalance } = await adjustPoints(req.params.id, delta, reason);
    res.json({ pointsBalance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
