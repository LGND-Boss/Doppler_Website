const express = require('express');
const db = require('../db');
const { requireStaff, requireRole } = require('../auth');
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

// List orders. ?station=bar|kitchen restricts to orders that need that station.
// ?active=1 hides paid/cancelled. Defaults: cashier/admin see all recent.
router.get('/', async (req, res) => {
  const { station, status, active } = req.query;
  const clauses = [];
  const params = [];
  if (status && VALID_STATUS.includes(status)) { params.push(status); clauses.push(`o.status = $${params.length}`); }
  if (station === 'bar') clauses.push('o.needs_bar = true');
  if (station === 'kitchen') clauses.push('o.needs_kitchen = true');
  if (active === '1' || station === 'bar' || station === 'kitchen') clauses.push(`o.status NOT IN ('paid','cancelled')`);
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const { rows } = await db.query(
    `SELECT o.*, s.label AS seat_label, c.email AS customer_email
     FROM orders o JOIN seats s ON s.id = o.seat_id JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json(rows);
});

// A station marks its items ready. Bar role -> bar only; Kitchen role -> kitchen only; admin -> any.
router.post('/:id/ready', async (req, res) => {
  const station = req.body && req.body.station;
  const role = req.session.role;
  if (station !== 'bar' && station !== 'kitchen') return res.status(400).json({ error: 'invalid station' });
  if (role !== 'admin' && role !== station) return res.status(403).json({ error: `your role (${role}) can't mark ${station} ready` });
  try { res.json(await svc.setStationReady(req.params.id, station)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Manual status override (e.g. cancel). Cashier + admin.
router.post('/:id/status', requireRole('cashier'), async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try { res.json(await svc.setStatus(req.params.id, status)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Payment & redemption: cashier + admin only.
router.post('/:id/pay', requireRole('cashier'), async (req, res) => {
  try {
    const { pointsEarned, pointsBalance } = await svc.markPaid(req.params.id);
    res.json({ pointsEarned, pointsBalance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/:id/redeem', requireRole('cashier'), async (req, res) => {
  const points = parseInt(req.body && req.body.points, 10);
  if (!Number.isInteger(points)) return res.status(400).json({ error: 'points must be an integer' });
  try {
    const { redeemedValue, pointsBalance } = await svc.redeemPoints(req.params.id, points);
    res.json({ redeemedValue, pointsBalance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
