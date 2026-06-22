require('dotenv').config();
const path = require('path');
const express = require('express');
const auth = require('./auth');

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(auth.sessionMiddleware);

// Auth endpoints
app.post('/api/login', auth.login);
app.post('/api/logout', auth.logout);
app.get('/api/me', auth.me);

// Feature routers
app.use('/api', require('./routes/public'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/staff', require('./routes/staff'));

// Static site (order.html, admin.html, index.html, assets) — same origin as API.
// server/ lives inside the site repo, so the static root is the parent directory.
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Doppler server on http://localhost:${PORT}`));
