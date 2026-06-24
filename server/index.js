require('dotenv').config();
const path = require('path');
const express = require('express');
const auth = require('./auth');

const app = express();
// Image uploads (base64) need a larger body; everything else stays tight.
app.use('/api/content/image', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '64kb' }));
app.use(auth.sessionMiddleware);

// Auth endpoints
app.post('/api/login', auth.login);
app.post('/api/logout', auth.logout);
app.get('/api/me', auth.me);

// Feature routers (phase 1: marketing site + content admin only)
app.use('/api/staff', require('./routes/staff'));
app.use('/api/content', require('./routes/content'));

// Static site (admin.html, index.html, menu.html, assets) — same origin as API.
// server/ lives inside the site repo, so the static root is the parent directory.
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Doppler server on http://localhost:${PORT}`));
