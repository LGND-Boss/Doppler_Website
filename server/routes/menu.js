const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');

const router = express.Router();

// Public: the published menu document (same shape as the admin editor / client
// MENU_DEFAULTS). Returns {} before anything is published; the client then
// falls back to its built-in defaults.
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT data FROM site_menu WHERE id = 1');
  res.json((rows[0] && rows[0].data) || {});
});

// Admin/Editor: replace the published menu document with the full editor state.
router.put('/', requireRole('admin', 'editor'), async (req, res) => {
  const data = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { rows } = await db.query(
    'UPDATE site_menu SET data = $1 WHERE id = 1 RETURNING data',
    [JSON.stringify(data)]
  );
  res.json(rows[0].data);
});

module.exports = router;
