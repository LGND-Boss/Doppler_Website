const express = require('express');
const db = require('../db');
const { requireStaff } = require('../auth');
const { subscribe } = require('../events');
const svc = require('../services/orders');

const router = express.Router();

const VALID_STATUS = ['new', 'preparing', 'served', 'paid', 'cancelled'];

// Board stream: SSE can't send headers, so authenticate via session here.
router.get('/stream', (req, res) => {
  if (!(req.session && req.session.staffId)) return res.status(401).end();
  subscribe('board', res);
});

router.use(requireStaff);

router.get('/', async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status && VALID_STATUS.includes(status)) { params.push(status); where = 'WHERE o.status = $1'; }
  const { rows } = await db.query(
    `SELECT o.*, s.label AS seat_label, c.email AS customer_email
     FROM orders o JOIN seats s ON s.id = o.seat_id JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json(rows);
});

router.post('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try { res.json(await svc.setStatus(req.params.id, status)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/:id/pay', async (req, res) => {
  try {
    const { pointsEarned, pointsBalance } = await svc.markPaid(req.params.id);
    res.json({ pointsEarned, pointsBalance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/:id/redeem', async (req, res) => {
  const points = parseInt(req.body && req.body.points, 10);
  if (!Number.isInteger(points)) return res.status(400).json({ error: 'points must be an integer' });
  try {
    const { redeemedValue, pointsBalance } = await svc.redeemPoints(req.params.id, points);
    res.json({ redeemedValue, pointsBalance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
