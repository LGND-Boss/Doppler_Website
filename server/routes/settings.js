const express = require('express');
const db = require('../db');
const { requireStaff } = require('../auth');

const router = express.Router();
router.use(requireStaff);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  res.json(rows[0]);
});

router.put('/', async (req, res) => {
  const { earn_per_rupee, redeem_rupee_per_point, min_redeem_points, site_base_url } = req.body || {};
  const { rows } = await db.query(
    `UPDATE settings SET
       earn_per_rupee = COALESCE($1, earn_per_rupee),
       redeem_rupee_per_point = COALESCE($2, redeem_rupee_per_point),
       min_redeem_points = COALESCE($3, min_redeem_points),
       site_base_url = COALESCE($4, site_base_url)
     WHERE id = 1 RETURNING *`,
    [
      earn_per_rupee ?? null,
      redeem_rupee_per_point ?? null,
      Number.isInteger(min_redeem_points) ? min_redeem_points : null,
      typeof site_base_url === 'string' ? site_base_url : null,
    ]
  );
  res.json(rows[0]);
});

module.exports = router;
