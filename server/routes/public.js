const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { placeOrder, getSettings } = require('../services/orders');
const { subscribe } = require('../events');

const router = express.Router();

const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Non-sensitive display config for the order page (tax %, earn rate).
router.get('/config', async (req, res) => {
  try {
    const s = await getSettings();
    res.json({ tax_percent: Number(s.tax_percent), earn_per_rupee: Number(s.earn_per_rupee) });
  } catch (e) { res.status(500).json({ error: 'config unavailable' }); }
});

router.get('/seat/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT label, active FROM seats WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'seat not found' });
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: 'invalid seat' }); }
});

router.post('/order', orderLimiter, async (req, res) => {
  const { seatId, email, name, items } = req.body || {};
  if (!seatId || !EMAIL_RE.test(email || '') || !Array.isArray(items)) {
    return res.status(400).json({ error: 'seatId, valid email, and items are required' });
  }
  try {
    const result = await placeOrder({ seatId, email: email.trim().toLowerCase(), name, items });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/order/:id/stream', (req, res) => {
  subscribe('order:' + req.params.id, res);
});

module.exports = router;
