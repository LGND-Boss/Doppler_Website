const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireRole } = require('../auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'img', 'uploads');
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

// Public: published site content (overrides over client defaults).
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT data FROM site_content WHERE id = 1');
  res.json((rows[0] && rows[0].data) || {});
});

// Admin: replace the published content document.
router.put('/', requireRole('admin'), async (req, res) => {
  const data = req.body && typeof req.body === 'object' ? req.body : {};
  // Guard against junk: only keep string values, cap length.
  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && v.length <= 4000) clean[k] = v;
  }
  const { rows } = await db.query(
    'UPDATE site_content SET data = $1 WHERE id = 1 RETURNING data',
    [JSON.stringify(clean)]
  );
  res.json(rows[0].data);
});

// Admin: upload an image (base64 data URL). Saves a file, returns its URL.
router.post('/image', requireRole('admin'), async (req, res) => {
  const { key, dataUrl } = req.body || {};
  if (!key || !/^[a-z0-9_-]+$/i.test(key)) return res.status(400).json({ error: 'invalid key' });
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return res.status(400).json({ error: 'expected an image data URL' });
  const ext = EXT[m[1].toLowerCase()];
  if (!ext) return res.status(400).json({ error: 'unsupported image type' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ error: 'image too large (max 6MB)' });
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    // Deterministic-ish name without Date.now(): key + content length + short hash of bytes.
    const stamp = buf.length.toString(36) + '-' + (buf[0] || 0).toString(16) + (buf[buf.length - 1] || 0).toString(16);
    const fname = `${key}-${stamp}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
    res.json({ url: 'img/uploads/' + fname });
  } catch (e) {
    res.status(500).json({ error: 'failed to save image' });
  }
});

module.exports = router;
