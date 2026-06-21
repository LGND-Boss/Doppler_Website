# Seat-QR Ordering & Loyalty Points — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let dine-in customers scan a seat QR, order from their phone (email required), and earn loyalty points the café redeems — all managed from a secured admin page, backed by local Postgres behind a Node/Express API.

**Architecture:** A Node.js + Express server on the café PC owns a local PostgreSQL database and is the only thing that touches it. It serves the static `Doppler_Website/` files (so `order.html`, `admin.html`, and the API are same-origin) and exposes a small REST + SSE API. The PC is reached on the customer's GoDaddy domain through a Cloudflare Tunnel (HTTPS, works on WiFi and cellular). Points are only ever mutated by authenticated staff endpoints, inside SQL transactions paired with an audit ledger.

**Tech Stack:** Node.js, Express, `pg`, `bcrypt`, `express-session`, `express-rate-limit`, `dotenv`, Node built-in test runner (`node:test`); front-end is React-via-CDN (order page) + vanilla JS (admin), matching the existing no-build site; `qrcode` via CDN for QR images; Cloudflare Tunnel + pm2 for deployment.

## Global Constraints

- **Front-end stays no-build.** No bundler/transpile step for shipped pages; use CDN scripts exactly like the existing site (`react@18.3.1`, `@babel/standalone@7.29.0`).
- **API and pages are same-origin.** The Node server serves `Doppler_Website/` statically; the front-end calls the API at relative path `/api/...`. No `config.js`, no CORS.
- **Server is the source of truth for money and points.** Never trust client-sent prices or point values. Subtotal is recomputed server-side from `Doppler_Website/menu.json`; points are computed from `settings`.
- **Only staff endpoints change points.** The public order endpoint can never write to `customers.points` or `points_ledger`.
- **Currency is integer ₹ (INR), no paise.** All money columns/fields are integers.
- **Every point mutation is one SQL transaction** that updates `customers.points` and inserts a `points_ledger` row together.
- **Aesthetic:** reuse `Doppler_Website/styles.css` tokens and fonts (Space Grotesk, Instrument Serif, Tiro Devanagari Hindi, JetBrains Mono); concrete/bone palette; ₹ pricing.
- **Node version floor:** Node 18+ (for the stable `node:test` runner and `crypto.randomUUID`).

---

## File Structure

```
server/
  package.json            # deps + scripts (start, test, create-user)
  .env.example            # DATABASE_URL, SESSION_SECRET, PORT, PUBLIC_BASE_URL
  schema.sql              # tables, enum, indexes, seed settings row
  seed.sql                # sample seats (optional, dev)
  db.js                   # pg Pool, query() + tx() helpers, loads menu.json
  menu-prices.js          # reads ../Doppler_Website/menu.json → {id: price} map
  services/
    points.js             # PURE: cartSubtotal, pointsForSpend, validateRedeem
    orders.js             # transactional: placeOrder, markPaid, redeemPoints, adjustPoints
  auth.js                 # session config, login/logout, requireStaff middleware
  events.js               # in-process SSE hub (per-order + admin board channels)
  routes/
    public.js             # GET /api/seat/:id, POST /api/order, GET /api/order/:id/stream
    orders.js             # staff: list, status, pay, redeem, board stream
    seats.js              # staff: CRUD seats
    customers.js          # staff: search, detail+history, adjust
    settings.js           # staff: get/put points rates + base url
  scripts/
    create-user.js        # npm run create-user <email> <password>
  index.js                # wires app: static + session + routes + listen
test/
  points.test.js          # unit tests for services/points.js
Doppler_Website/
  menu.json               # NEW canonical ordering menu (id, name, note, price)
  doppler-backend.js      # NEW fetch wrapper used by order + admin
  order.html              # NEW customer page (React-via-CDN)
  order.jsx               # NEW customer UI
  admin.html              # MODIFIED: login gate + Orders/Seats/Customers/Settings tabs
docs/superpowers/plans/2026-06-21-cafe-ordering-loyalty.md
```

---

## Task 1: Server scaffold, database schema, and connection

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/schema.sql`
- Create: `server/seed.sql`
- Create: `server/db.js`

**Interfaces:**
- Produces: `db.query(text, params) -> Promise<pg.Result>`, `db.tx(async (client) => ...) -> Promise<T>`, `db.pool` (a `pg.Pool`).

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "doppler-server",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node index.js",
    "test": "node --test",
    "create-user": "node scripts/create-user.js",
    "init-db": "node -e \"const fs=require('fs');const{pool}=require('./db');pool.query(fs.readFileSync('schema.sql','utf8')).then(()=>{console.log('schema applied');return pool.end()}).catch(e=>{console.error(e);process.exit(1)})\""
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0",
    "express-session": "^1.18.0",
    "pg": "^8.12.0"
  }
}
```

- [ ] **Step 2: Create `server/.env.example`**

```
# Copy to .env and fill in.
DATABASE_URL=postgres://doppler:CHANGE_ME@localhost:5432/doppler
SESSION_SECRET=CHANGE_ME_to_a_long_random_string
PORT=3000
# Public HTTPS URL the QR codes point to (set once Cloudflare Tunnel is live)
PUBLIC_BASE_URL=https://app.example.com
NODE_ENV=development
```

- [ ] **Step 3: Create `server/schema.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('new','preparing','served','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS seats (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL,
  zone       text,
  active      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext UNIQUE NOT NULL,
  name       text,
  points     integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_visit timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id         uuid NOT NULL REFERENCES seats(id),
  customer_id     uuid NOT NULL REFERENCES customers(id),
  status          order_status NOT NULL DEFAULT 'new',
  items           jsonb NOT NULL,
  subtotal        integer NOT NULL,
  points_earned   integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_id    uuid REFERENCES orders(id),
  delta       integer NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id                     integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  earn_per_rupee         numeric NOT NULL DEFAULT 0.1,
  redeem_rupee_per_point numeric NOT NULL DEFAULT 1,
  min_redeem_points      integer NOT NULL DEFAULT 50,
  site_base_url          text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS staff_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_customer   ON points_ledger(customer_id, created_at DESC);
```

- [ ] **Step 4: Create `server/seed.sql`**

```sql
INSERT INTO seats (label, zone) VALUES
  ('Table 1', 'Floor Hall'),
  ('Table 2', 'Floor Hall'),
  ('Window Bar 1', 'Espresso Bar'),
  ('Lounge 1', 'Lounge')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 5: Create `server/db.js`**

```js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  return pool.query(text, params);
}

// Run fn inside a transaction; rolls back on throw.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
```

- [ ] **Step 6: Verify the schema applies against a real database**

Run (PowerShell, from `server/`, after creating the DB + `.env`):
```
npm install
npm run init-db
```
Expected output: `schema applied`. Then in `psql`: `\dt` lists `seats, customers, orders, points_ledger, settings, staff_users`; `SELECT * FROM settings;` shows one row with defaults `0.1 / 1 / 50 / ''`.

- [ ] **Step 7: Commit**

```
git add server/package.json server/.env.example server/schema.sql server/seed.sql server/db.js
git commit -m "feat(server): scaffold Node server, Postgres schema, db helpers"
```

---

## Task 2: Canonical order menu + pure pricing/points logic (TDD)

**Files:**
- Create: `Doppler_Website/menu.json`
- Create: `server/menu-prices.js`
- Create: `server/services/points.js`
- Test: `test/points.test.js`

**Interfaces:**
- Consumes: `menu-prices.js` → `priceMap` (`{ [itemId]: number }`), `menu` (the parsed array).
- Produces:
  - `cartSubtotal(items, priceMap) -> number` where `items` is `[{ id, qty }]`. Throws `Error('unknown item: <id>')` on bad id, `Error('bad qty')` if qty not an integer 1..50.
  - `pointsForSpend(subtotal, earnPerRupee) -> number` (floor, ≥0).
  - `validateRedeem({ points, balance, minRedeem }) -> { ok: true } | { ok: false, reason }`.
  - `redeemValue(points, redeemRupeePerPoint) -> number` (floor).

- [ ] **Step 1: Create `Doppler_Website/menu.json`** (canonical for ordering; prices from current `MENU_DEFAULTS`)

```json
{
  "edition": "Edition 02 · Summer 2026",
  "categories": [
    { "id": "classics", "title": "Classics · Espresso Bar", "items": [
      { "id": "espresso", "name": "Espresso shot", "note": "double · ristretto-leaning", "price": 180 },
      { "id": "americano", "name": "Americano", "note": "long black · 1:4", "price": 200 },
      { "id": "cappuccino", "name": "Cappuccino", "note": "5oz · dry foam", "price": 240 },
      { "id": "latte", "name": "Latte", "note": "8oz · velvet", "price": 260 },
      { "id": "flavoured-latte", "name": "Flavoured Latte", "note": "vanilla · hazelnut · caramel · rose", "price": 260 },
      { "id": "flat-white", "name": "Flat White", "note": "hot · micro-foam", "price": 260 },
      { "id": "cortado", "name": "Cortado", "note": "cut · 1:1", "price": 220 },
      { "id": "macchiato", "name": "Macchiato", "note": "hot · marked", "price": 220 },
      { "id": "mocha", "name": "Mocha", "note": "dark cocoa · single origin", "price": 280 }
    ]},
    { "id": "manual", "title": "Manual Bar", "items": [
      { "id": "igc-ethiopian", "name": "IGC · Ethiopian", "note": "yirgacheffe · jasmine · stone fruit", "price": 360 },
      { "id": "igc-pink-bourbon", "name": "IGC · Pink Bourbon", "note": "colombia · grape · honey", "price": 360 },
      { "id": "igc-geisha", "name": "IGC · Geisha", "note": "panama · bergamot · floral · rare", "price": 640 },
      { "id": "aeropress", "name": "AeroPress", "note": "inverted · 1m steep · clean cup", "price": 320 }
    ]},
    { "id": "coldbrew", "title": "Cold Brew", "items": [
      { "id": "coldbrew-classic", "name": "Classic", "note": "house blend · neat", "price": 240 },
      { "id": "coldbrew-orange", "name": "Orange", "note": "cold brew · citrus · tonic", "price": 280 },
      { "id": "coldbrew-coconut", "name": "Coconut", "note": "cold brew · tender coconut · ice", "price": 280 }
    ]},
    { "id": "craft", "title": "Craft Bar", "items": [
      { "id": "vietnamese-phin", "name": "Vietnamese Phin", "note": "robusta · condensed milk · slow drip", "price": 320 }
    ]},
    { "id": "signature", "title": "Signature", "items": [
      { "id": "orange-honey-espresso", "name": "Orange Honey Espresso", "note": "espresso · orange · raw honey · ice", "price": 360 },
      { "id": "cafe-bombon", "name": "Café Bombón", "note": "condensed milk · double espresso", "price": 360 },
      { "id": "honey-trap", "name": "Honey Trap", "note": "espresso · jaggery · cream float", "price": 320 },
      { "id": "greek-freddo", "name": "Greek Freddo", "note": "whipped espresso · ice · cold milk", "price": 320 },
      { "id": "vietnamese-cloud", "name": "Vietnamese Cloud", "note": "phin · coconut foam · cocoa dust", "price": 360 }
    ]},
    { "id": "frappes", "title": "Frappés", "items": [
      { "id": "og-frappe", "name": "OG Frappé", "note": "espresso · ice · milk · sugar", "price": 240 },
      { "id": "caramel-frappe", "name": "Caramel Frappé", "note": "house caramel · espresso · cream", "price": 240 }
    ]},
    { "id": "coolers", "title": "Coolers", "items": [
      { "id": "espresso-tonic", "name": "Espresso Tonic", "note": "hazelnut · caramel · indian tonic", "price": 280 },
      { "id": "watermelon-mojito", "name": "Watermelon Mojito", "note": "watermelon · mint · lime · soda", "price": 240 },
      { "id": "cold-pressed-juice", "name": "Cold-pressed Juices", "note": "watermelon · orange-pineapple", "price": 240 }
    ]},
    { "id": "smoothies", "title": "Smoothies", "items": [
      { "id": "avocado-smoothie", "name": "Avocado", "note": "avocado · honey · cold milk · ice", "price": 420 },
      { "id": "mixed-berries-smoothie", "name": "Mixed Berries", "note": "strawberry · blueberry · raspberry", "price": 420 }
    ]}
  ]
}
```

- [ ] **Step 2: Create `server/menu-prices.js`**

```js
const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, '..', 'Doppler_Website', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const priceMap = {};
const nameMap = {};
for (const cat of menu.categories) {
  for (const item of cat.items) {
    priceMap[item.id] = item.price;
    nameMap[item.id] = item.name;
  }
}

module.exports = { menu, priceMap, nameMap };
```

- [ ] **Step 3: Write the failing test `test/points.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const {
  cartSubtotal, pointsForSpend, validateRedeem, redeemValue,
} = require('../server/services/points');

const PRICES = { espresso: 180, latte: 260 };

test('cartSubtotal sums price * qty', () => {
  assert.equal(cartSubtotal([{ id: 'espresso', qty: 2 }, { id: 'latte', qty: 1 }], PRICES), 620);
});

test('cartSubtotal rejects unknown item', () => {
  assert.throws(() => cartSubtotal([{ id: 'nope', qty: 1 }], PRICES), /unknown item: nope/);
});

test('cartSubtotal rejects bad qty', () => {
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 0 }], PRICES), /bad qty/);
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 1.5 }], PRICES), /bad qty/);
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 99 }], PRICES), /bad qty/);
});

test('cartSubtotal rejects empty cart', () => {
  assert.throws(() => cartSubtotal([], PRICES), /empty cart/);
});

test('pointsForSpend floors at earn rate', () => {
  assert.equal(pointsForSpend(620, 0.1), 62);
  assert.equal(pointsForSpend(95, 0.1), 9);
  assert.equal(pointsForSpend(0, 0.1), 0);
});

test('validateRedeem enforces minimum and balance', () => {
  assert.deepEqual(validateRedeem({ points: 100, balance: 200, minRedeem: 50 }), { ok: true });
  assert.equal(validateRedeem({ points: 40, balance: 200, minRedeem: 50 }).ok, false);
  assert.equal(validateRedeem({ points: 300, balance: 200, minRedeem: 50 }).ok, false);
  assert.equal(validateRedeem({ points: 0, balance: 200, minRedeem: 50 }).ok, false);
});

test('redeemValue converts points to rupees floored', () => {
  assert.equal(redeemValue(100, 1), 100);
  assert.equal(redeemValue(100, 0.5), 50);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test` (from `server/`, but tests live in repo `test/`; run from repo root with `node --test`)
Expected: FAIL — `Cannot find module '../server/services/points'`.

- [ ] **Step 5: Implement `server/services/points.js`**

```js
// Pure pricing & points math. No DB, no I/O.

function cartSubtotal(items, priceMap) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('empty cart');
  let total = 0;
  for (const { id, qty } of items) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error('bad qty');
    if (!(id in priceMap)) throw new Error('unknown item: ' + id);
    total += priceMap[id] * qty;
  }
  return total;
}

function pointsForSpend(subtotal, earnPerRupee) {
  return Math.max(0, Math.floor(subtotal * earnPerRupee));
}

function validateRedeem({ points, balance, minRedeem }) {
  if (!Number.isInteger(points) || points <= 0) return { ok: false, reason: 'points must be positive' };
  if (points < minRedeem) return { ok: false, reason: `minimum redemption is ${minRedeem} points` };
  if (points > balance) return { ok: false, reason: 'not enough points' };
  return { ok: true };
}

function redeemValue(points, redeemRupeePerPoint) {
  return Math.floor(points * redeemRupeePerPoint);
}

module.exports = { cartSubtotal, pointsForSpend, validateRedeem, redeemValue };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test` (from repo root `E:\Dopler`)
Expected: PASS — all tests in `test/points.test.js` green.

- [ ] **Step 7: Commit**

```
git add Doppler_Website/menu.json server/menu-prices.js server/services/points.js test/points.test.js
git commit -m "feat(server): canonical order menu + tested pricing/points logic"
```

---

## Task 3: Staff auth + create-user script

**Files:**
- Create: `server/auth.js`
- Create: `server/scripts/create-user.js`

**Interfaces:**
- Consumes: `db.query`, `db.pool`.
- Produces:
  - `auth.sessionMiddleware` (configured `express-session`).
  - `auth.requireStaff(req, res, next)` — 401 JSON if not logged in.
  - `auth.login(req, res)` — `POST` handler; body `{ email, password }`; sets `req.session.staffId`; returns `{ email }` or 401.
  - `auth.logout(req, res)`, `auth.me(req, res)`.

- [ ] **Step 1: Create `server/auth.js`**

```js
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12, // 12h
  },
});

function requireStaff(req, res, next) {
  if (req.session && req.session.staffId) return next();
  return res.status(401).json({ error: 'not authenticated' });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const { rows } = await db.query('SELECT id, password_hash FROM staff_users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  req.session.staffId = user.id;
  req.session.email = email;
  res.json({ email });
}

function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

function me(req, res) {
  if (req.session && req.session.staffId) return res.json({ email: req.session.email });
  res.status(401).json({ error: 'not authenticated' });
}

module.exports = { sessionMiddleware, requireStaff, login, logout, me };
```

- [ ] **Step 2: Create `server/scripts/create-user.js`**

```js
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO staff_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );
  console.log('staff user ready:', email);
  await db.pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Verify create-user works**

Run (from `server/`): `npm run create-user -- owner@doppler.coffee secretpass123`
Expected: `staff user ready: owner@doppler.coffee`. In `psql`: `SELECT email FROM staff_users;` shows the row; `password_hash` starts with `$2b$`.

- [ ] **Step 4: Commit**

```
git add server/auth.js server/scripts/create-user.js
git commit -m "feat(server): staff auth (bcrypt + session) and create-user script"
```

---

## Task 4: SSE hub

**Files:**
- Create: `server/events.js`

**Interfaces:**
- Produces:
  - `events.subscribe(channel, res)` — registers an SSE response on a channel (`'board'` or `'order:<id>'`); writes SSE headers; cleans up on close.
  - `events.publish(channel, data)` — sends `data` (object) as a JSON SSE message to all subscribers of `channel`.

- [ ] **Step 1: Create `server/events.js`**

```js
// Minimal in-process Server-Sent Events hub.
const channels = new Map(); // channel -> Set<res>

function subscribe(channel, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(res);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => {
    clearInterval(keepAlive);
    const set = channels.get(channel);
    if (set) { set.delete(res); if (set.size === 0) channels.delete(channel); }
  });
}

function publish(channel, data) {
  const set = channels.get(channel);
  if (!set) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}

module.exports = { subscribe, publish };
```

- [ ] **Step 2: Commit**

```
git add server/events.js
git commit -m "feat(server): in-process SSE hub for live order updates"
```

---

## Task 5: Order service (transactional order/paid/redeem/adjust)

**Files:**
- Create: `server/services/orders.js`

**Interfaces:**
- Consumes: `db.tx`, `db.query`, `points.js`, `menu-prices.priceMap`, `events.publish`.
- Produces (all async):
  - `placeOrder({ seatId, email, name, items }) -> { orderId, seatLabel, subtotal, estimatedPoints, pointsBalance, recentHistory }`. Validates seat active; recomputes subtotal server-side; upserts customer; inserts order `new`. Publishes to `'board'`. Throws `Error('seat not found')` / `'seat inactive'`.
  - `setStatus(orderId, status) -> order`. Publishes to `'board'` and `'order:<id>'`.
  - `markPaid(orderId) -> { order, pointsEarned, pointsBalance }`. Idempotent: if already paid, returns current values without double-crediting. Awards points in one tx + ledger row. Publishes.
  - `redeemPoints(orderId, points) -> { order, redeemedValue, pointsBalance }`. Validates via `validateRedeem` against settings + balance; decrements balance; records ledger; sets `orders.points_redeemed`. Throws `Error(reason)` on invalid.
  - `adjustPoints(customerId, delta, reason) -> { pointsBalance }`. Staff manual ± in one tx + ledger row; refuses to drive balance below 0.
  - `getSettings() -> settings row` (helper used here and by routes).

- [ ] **Step 1: Create `server/services/orders.js`**

```js
const db = require('../db');
const { publish } = require('../events');
const { priceMap, nameMap } = require('../menu-prices');
const { cartSubtotal, pointsForSpend, validateRedeem, redeemValue } = require('./points');

async function getSettings() {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  return rows[0];
}

async function recentHistory(client, customerId, limit = 5) {
  const { rows } = await (client || db).query(
    `SELECT delta, reason, created_at FROM points_ledger
     WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [customerId, limit]
  );
  return rows;
}

// Normalize client items into [{id, name, qty, price}] using server prices.
function buildLineItems(items) {
  return items.map(({ id, qty, note }) => ({
    id, qty, note: note || '', name: nameMap[id], price: priceMap[id],
  }));
}

async function placeOrder({ seatId, email, name, items }) {
  const settings = await getSettings();
  const subtotal = cartSubtotal(items, priceMap); // throws on bad input
  const lineItems = buildLineItems(items);
  const estimatedPoints = pointsForSpend(subtotal, Number(settings.earn_per_rupee));

  return db.tx(async (client) => {
    const seatRes = await client.query('SELECT id, label, active FROM seats WHERE id = $1', [seatId]);
    const seat = seatRes.rows[0];
    if (!seat) throw new Error('seat not found');
    if (!seat.active) throw new Error('seat inactive');

    const custRes = await client.query(
      `INSERT INTO customers (email, name) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET last_visit = now(),
         name = COALESCE(customers.name, EXCLUDED.name)
       RETURNING id, points`,
      [email, name || null]
    );
    const customer = custRes.rows[0];

    const orderRes = await client.query(
      `INSERT INTO orders (seat_id, customer_id, items, subtotal)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [seatId, customer.id, JSON.stringify(lineItems), subtotal]
    );
    const orderId = orderRes.rows[0].id;
    const history = await recentHistory(client, customer.id);

    const result = {
      orderId, seatLabel: seat.label, subtotal, estimatedPoints,
      pointsBalance: customer.points, recentHistory: history,
    };
    publish('board', { type: 'new', orderId });
    return result;
  });
}

async function setStatus(orderId, status) {
  const { rows } = await db.query(
    `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [orderId, status]
  );
  const order = rows[0];
  if (!order) throw new Error('order not found');
  publish('board', { type: 'status', orderId, status });
  publish('order:' + orderId, { status });
  return order;
}

async function markPaid(orderId) {
  const settings = await getSettings();
  return db.tx(async (client) => {
    const ordRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    const order = ordRes.rows[0];
    if (!order) throw new Error('order not found');

    if (order.status === 'paid') {
      const bal = await client.query('SELECT points FROM customers WHERE id = $1', [order.customer_id]);
      return { order, pointsEarned: order.points_earned, pointsBalance: bal.rows[0].points };
    }

    const pointsEarned = pointsForSpend(order.subtotal, Number(settings.earn_per_rupee));
    await client.query(
      `UPDATE orders SET status = 'paid', points_earned = $2, updated_at = now() WHERE id = $1`,
      [orderId, pointsEarned]
    );
    const balRes = await client.query(
      `UPDATE customers SET points = points + $2 WHERE id = $1 RETURNING points`,
      [order.customer_id, pointsEarned]
    );
    await client.query(
      `INSERT INTO points_ledger (customer_id, order_id, delta, reason) VALUES ($1, $2, $3, 'earn')`,
      [order.customer_id, orderId, pointsEarned]
    );
    publish('board', { type: 'status', orderId, status: 'paid' });
    publish('order:' + orderId, { status: 'paid' });
    return { order: { ...order, status: 'paid', points_earned: pointsEarned }, pointsEarned, pointsBalance: balRes.rows[0].points };
  });
}

async function redeemPoints(orderId, points) {
  const settings = await getSettings();
  return db.tx(async (client) => {
    const ordRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    const order = ordRes.rows[0];
    if (!order) throw new Error('order not found');
    const custRes = await client.query('SELECT points FROM customers WHERE id = $1 FOR UPDATE', [order.customer_id]);
    const balance = custRes.rows[0].points;

    const check = validateRedeem({ points, balance, minRedeem: settings.min_redeem_points });
    if (!check.ok) throw new Error(check.reason);

    const value = redeemValue(points, Number(settings.redeem_rupee_per_point));
    const newBal = await client.query(
      `UPDATE customers SET points = points - $2 WHERE id = $1 RETURNING points`,
      [order.customer_id, points]
    );
    await client.query(
      `UPDATE orders SET points_redeemed = points_redeemed + $2, updated_at = now() WHERE id = $1`,
      [orderId, points]
    );
    await client.query(
      `INSERT INTO points_ledger (customer_id, order_id, delta, reason) VALUES ($1, $2, $3, 'redeem')`,
      [order.customer_id, orderId, -points]
    );
    return { order, redeemedValue: value, pointsBalance: newBal.rows[0].points };
  });
}

async function adjustPoints(customerId, delta, reason) {
  return db.tx(async (client) => {
    const custRes = await client.query('SELECT points FROM customers WHERE id = $1 FOR UPDATE', [customerId]);
    if (!custRes.rows[0]) throw new Error('customer not found');
    const newBalance = custRes.rows[0].points + delta;
    if (newBalance < 0) throw new Error('adjustment would make balance negative');
    const upd = await client.query('UPDATE customers SET points = $2 WHERE id = $1 RETURNING points', [customerId, newBalance]);
    await client.query(
      `INSERT INTO points_ledger (customer_id, delta, reason) VALUES ($1, $2, $3)`,
      [customerId, delta, reason || 'adjust']
    );
    return { pointsBalance: upd.rows[0].points };
  });
}

module.exports = { getSettings, placeOrder, setStatus, markPaid, redeemPoints, adjustPoints, recentHistory };
```

- [ ] **Step 2: Commit**

```
git add server/services/orders.js
git commit -m "feat(server): transactional order/paid/redeem/adjust service"
```

---

## Task 6: Public routes (seat lookup, place order, order status SSE)

**Files:**
- Create: `server/routes/public.js`

**Interfaces:**
- Consumes: `orders.placeOrder`, `orders.setStatus`(no), `events.subscribe`, `db.query`.
- Produces: an Express `Router` mounted at `/api`:
  - `GET /api/seat/:id` → `{ label, active }` or 404.
  - `POST /api/order` (rate-limited) → `placeOrder` result, or 400 with `{ error }`.
  - `GET /api/order/:id/stream` → SSE channel `order:<id>`.

- [ ] **Step 1: Create `server/routes/public.js`**

```js
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { placeOrder } = require('../services/orders');
const { subscribe } = require('../events');

const router = express.Router();

const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
```

- [ ] **Step 2: Commit**

```
git add server/routes/public.js
git commit -m "feat(server): public order routes (seat lookup, place order, status SSE)"
```

---

## Task 7: Staff order routes + board stream

**Files:**
- Create: `server/routes/orders.js`

**Interfaces:**
- Consumes: `orders` service, `events.subscribe`, `db.query`, `auth.requireStaff`.
- Produces: Router mounted at `/api/orders` (all behind `requireStaff` except the board stream which checks session inline):
  - `GET /api/orders?status=` → array of orders (newest first), each with seat label + customer email.
  - `POST /api/orders/:id/status` `{ status }` → updated order.
  - `POST /api/orders/:id/pay` → `{ pointsEarned, pointsBalance }`.
  - `POST /api/orders/:id/redeem` `{ points }` → `{ redeemedValue, pointsBalance }`.
  - `GET /api/orders/stream` → SSE board channel.

- [ ] **Step 1: Create `server/routes/orders.js`**

```js
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
```

- [ ] **Step 2: Commit**

```
git add server/routes/orders.js
git commit -m "feat(server): staff order routes + live board SSE"
```

---

## Task 8: Seats, customers, and settings routes

**Files:**
- Create: `server/routes/seats.js`
- Create: `server/routes/customers.js`
- Create: `server/routes/settings.js`

**Interfaces:**
- All behind `requireStaff`.
- `seats`: `GET /api/seats`, `POST /api/seats {label, zone}`, `PATCH /api/seats/:id {label?, zone?, active?}`.
- `customers`: `GET /api/customers?q=`, `GET /api/customers/:id` (with `history`), `POST /api/customers/:id/adjust {delta, reason}`.
- `settings`: `GET /api/settings`, `PUT /api/settings {earn_per_rupee, redeem_rupee_per_point, min_redeem_points, site_base_url}`.

- [ ] **Step 1: Create `server/routes/seats.js`**

```js
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
```

- [ ] **Step 2: Create `server/routes/customers.js`**

```js
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
```

- [ ] **Step 3: Create `server/routes/settings.js`**

```js
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
```

- [ ] **Step 4: Commit**

```
git add server/routes/seats.js server/routes/customers.js server/routes/settings.js
git commit -m "feat(server): seats, customers, settings staff routes"
```

---

## Task 9: Express app wiring + static serving

**Files:**
- Create: `server/index.js`

**Interfaces:**
- Consumes: all routers, `auth`.
- Produces: a running server on `PORT` serving `Doppler_Website/` and `/api/*`.

- [ ] **Step 1: Create `server/index.js`**

```js
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

// Static site (order.html, admin.html, index.html, assets) — same origin as API.
app.use(express.static(path.join(__dirname, '..', 'Doppler_Website')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Doppler server on http://localhost:${PORT}`));
```

- [ ] **Step 2: Manual smoke test of the API**

Run (from `server/`): `npm start`. In a second shell:
```
curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"email\":\"owner@doppler.coffee\",\"password\":\"secretpass123\"}" -c cookies.txt
curl -s http://localhost:3000/api/seats -b cookies.txt
```
Expected: login returns `{"email":"owner@doppler.coffee"}`; seats returns `[]` (or seeded seats). Calling `/api/seats` WITHOUT `-b cookies.txt` returns `{"error":"not authenticated"}` with HTTP 401.

- [ ] **Step 3: Commit**

```
git add server/index.js
git commit -m "feat(server): wire express app, auth endpoints, static serving"
```

---

## Task 10: Browser API client (`doppler-backend.js`)

**Files:**
- Create: `Doppler_Website/doppler-backend.js`

**Interfaces:**
- Produces global `window.DopplerAPI` with promise-returning methods. All use `fetch` with `credentials: 'same-origin'` and JSON.
  - Public: `getSeat(id)`, `placeOrder({seatId,email,name,items})`, `streamOrder(id, onMsg) -> EventSource`.
  - Auth: `login(email,password)`, `logout()`, `me()`.
  - Staff: `listOrders(status)`, `setStatus(id,status)`, `payOrder(id)`, `redeemOrder(id,points)`, `streamBoard(onMsg) -> EventSource`, `listSeats()`, `createSeat(label,zone)`, `updateSeat(id,patch)`, `listCustomers(q)`, `getCustomer(id)`, `adjustCustomer(id,delta,reason)`, `getSettings()`, `putSettings(patch)`, `loadMenu()`.

- [ ] **Step 1: Create `Doppler_Website/doppler-backend.js`**

```js
(function () {
  async function req(method, url, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const r = await fetch(url, opts);
    const data = r.headers.get('content-type')?.includes('application/json') ? await r.json() : null;
    if (!r.ok) throw new Error((data && data.error) || ('HTTP ' + r.status));
    return data;
  }

  window.DopplerAPI = {
    // menu (canonical, used by order page)
    loadMenu: () => req('GET', 'menu.json'),

    // public
    getSeat: (id) => req('GET', '/api/seat/' + encodeURIComponent(id)),
    placeOrder: (payload) => req('POST', '/api/order', payload),
    streamOrder: (id, onMsg) => {
      const es = new EventSource('/api/order/' + encodeURIComponent(id) + '/stream');
      es.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
      return es;
    },

    // auth
    login: (email, password) => req('POST', '/api/login', { email, password }),
    logout: () => req('POST', '/api/logout'),
    me: () => req('GET', '/api/me'),

    // staff: orders
    listOrders: (status) => req('GET', '/api/orders' + (status ? '?status=' + status : '')),
    setStatus: (id, status) => req('POST', '/api/orders/' + id + '/status', { status }),
    payOrder: (id) => req('POST', '/api/orders/' + id + '/pay'),
    redeemOrder: (id, points) => req('POST', '/api/orders/' + id + '/redeem', { points }),
    streamBoard: (onMsg) => {
      const es = new EventSource('/api/orders/stream');
      es.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
      return es;
    },

    // staff: seats
    listSeats: () => req('GET', '/api/seats'),
    createSeat: (label, zone) => req('POST', '/api/seats', { label, zone }),
    updateSeat: (id, patch) => req('PATCH', '/api/seats/' + id, patch),

    // staff: customers
    listCustomers: (q) => req('GET', '/api/customers' + (q ? '?q=' + encodeURIComponent(q) : '')),
    getCustomer: (id) => req('GET', '/api/customers/' + id),
    adjustCustomer: (id, delta, reason) => req('POST', '/api/customers/' + id + '/adjust', { delta, reason }),

    // staff: settings
    getSettings: () => req('GET', '/api/settings'),
    putSettings: (patch) => req('PUT', '/api/settings', patch),
  };
})();
```

- [ ] **Step 2: Commit**

```
git add Doppler_Website/doppler-backend.js
git commit -m "feat(web): DopplerAPI browser client for ordering + admin"
```

---

## Task 11: Customer order page (`order.html` + `order.jsx`)

**Files:**
- Create: `Doppler_Website/order.html`
- Create: `Doppler_Website/order.jsx`

**Interfaces:**
- Consumes: `window.DopplerAPI`, `Doppler_Website/styles.css`.
- Reads `?seat=<id>` from the URL.

- [ ] **Step 1: Create `Doppler_Website/order.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#1a1410">
<title>Order · Doppler</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="order.css">
</head>
<body>
<div id="order-root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>
<script src="doppler-backend.js"></script>
<script type="text/babel" src="order.jsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create `Doppler_Website/order.css`** (scoped styling reusing site tokens)

```css
.order-wrap { max-width: 560px; margin: 0 auto; padding: 24px 18px 140px; min-height: 100vh; }
.order-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.order-seat { font-family: 'Instrument Serif', serif; font-size: 34px; }
.order-edition { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
.cat-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; opacity: .7; margin: 26px 0 10px; }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,.08); }
.menu-item .mi-main { flex: 1; }
.menu-item .mi-name { font-weight: 500; }
.menu-item .mi-note { font-size: 12px; opacity: .6; }
.menu-item .mi-price { font-family: 'JetBrains Mono', monospace; opacity: .8; }
.qty { display: flex; align-items: center; gap: 10px; }
.qty button { width: 30px; height: 30px; border-radius: 50%; border: 1px solid currentColor; background: transparent; font-size: 16px; cursor: pointer; }
.qty .n { min-width: 16px; text-align: center; font-family: 'JetBrains Mono', monospace; }
.order-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #1a1410; color: #f4efe6; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.order-bar button { background: #f4efe6; color: #1a1410; border: 0; padding: 14px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.order-bar button:disabled { opacity: .4; cursor: not-allowed; }
.field { display: block; width: 100%; padding: 12px 14px; margin: 8px 0; border: 1px solid rgba(0,0,0,.2); border-radius: 8px; font: inherit; }
.confirm { text-align: center; padding: 40px 16px; }
.confirm .big { font-family: 'Instrument Serif', serif; font-size: 40px; margin: 12px 0; }
.balance { font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-top: 18px; }
.status-chip { display: inline-block; padding: 6px 14px; border-radius: 999px; border: 1px solid currentColor; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.err { color: #b3261e; font-size: 13px; margin: 8px 0; }
```

- [ ] **Step 3: Create `Doppler_Website/order.jsx`**

```jsx
const { useState, useEffect, useMemo } = React;

function getSeatId() {
  return new URLSearchParams(window.location.search).get('seat');
}

function Menu({ menu, cart, setQty }) {
  return menu.categories.map((cat) => (
    <div key={cat.id}>
      <div className="cat-title">{cat.title}</div>
      {cat.items.map((it) => (
        <div className="menu-item" key={it.id}>
          <div className="mi-main">
            <div className="mi-name">{it.name}</div>
            <div className="mi-note">{it.note}</div>
          </div>
          <div className="mi-price">₹{it.price}</div>
          <div className="qty">
            <button onClick={() => setQty(it.id, (cart[it.id] || 0) - 1)} aria-label="less">–</button>
            <span className="n">{cart[it.id] || 0}</span>
            <button onClick={() => setQty(it.id, (cart[it.id] || 0) + 1)} aria-label="more">+</button>
          </div>
        </div>
      ))}
    </div>
  ));
}

function Confirmation({ result, seatLabel }) {
  const [status, setStatus] = useState('new');
  useEffect(() => {
    const es = window.DopplerAPI.streamOrder(result.orderId, (msg) => { if (msg.status) setStatus(msg.status); });
    return () => es.close();
  }, [result.orderId]);
  const label = { new: 'Order received', preparing: 'Preparing', served: 'Served', paid: 'Paid · thank you', cancelled: 'Cancelled' }[status];
  return (
    <div className="confirm">
      <div className="status-chip">{label}</div>
      <div className="big">{seatLabel}</div>
      <p>Pay at the counter when you're ready.</p>
      <div className="balance">
        Balance: {result.pointsBalance} pts · you'll earn ~{result.estimatedPoints} pts once paid
      </div>
    </div>
  );
}

function OrderApp() {
  const seatId = getSeatId();
  const [menu, setMenu] = useState(null);
  const [seat, setSeat] = useState(null);
  const [fatal, setFatal] = useState('');
  const [cart, setCart] = useState({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!seatId) { setFatal('No seat in the link. Please scan the QR at your table again.'); return; }
    window.DopplerAPI.getSeat(seatId)
      .then((s) => { if (!s.active) setFatal('This seat is not active. Please ask a staff member.'); else setSeat(s); })
      .catch(() => setFatal('We couldn\'t find this seat. Please scan the QR again.'));
    window.DopplerAPI.loadMenu().then(setMenu).catch(() => setFatal('Menu failed to load.'));
  }, []);

  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(50, q); return n; });

  const subtotal = useMemo(() => {
    if (!menu) return 0;
    const prices = {}; menu.categories.forEach((c) => c.items.forEach((i) => { prices[i.id] = i.price; }));
    return Object.entries(cart).reduce((sum, [id, q]) => sum + (prices[id] || 0) * q, 0);
  }, [cart, menu]);

  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = items.length > 0 && emailValid && !submitting;

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const r = await window.DopplerAPI.placeOrder({ seatId, email, name, items });
      setResult(r);
    } catch (e) { setErr(e.message); } finally { setSubmitting(false); }
  };

  if (fatal) return <div className="order-wrap"><p className="err">{fatal}</p></div>;
  if (!menu || !seat) return <div className="order-wrap"><p>Loading…</p></div>;
  if (result) return <div className="order-wrap"><Confirmation result={result} seatLabel={seat.label} /></div>;

  return (
    <div className="order-wrap">
      <div className="order-head">
        <span className="order-seat">{seat.label}</span>
        <span className="order-edition">{menu.edition}</span>
      </div>
      <Menu menu={menu} cart={cart} setQty={setQty} />
      <div style={{ marginTop: 28 }}>
        <input className="field" type="email" placeholder="Email (required for points)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {err && <p className="err">{err}</p>}
      <div className="order-bar">
        <span>{items.length} item(s) · ₹{subtotal}</span>
        <button disabled={!canSubmit} onClick={submit}>{submitting ? 'Sending…' : 'Place order'}</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('order-root')).render(<OrderApp />);
```

- [ ] **Step 4: Manual verification (real browser)**

Start the server (`npm start`). Create a seat via admin (Task 12) OR run `seed.sql`, then get a seat id: in `psql` `SELECT id, label FROM seats LIMIT 1;`. Open `http://localhost:3000/order.html?seat=<id>`.
Expected: seat label shows; add items, +/- adjusts qty and subtotal; "Place order" is disabled until an item is added AND a valid email is entered; after submit, the confirmation shows the seat, balance, and estimated points; an invalid `?seat=` shows the friendly error.

- [ ] **Step 5: Commit**

```
git add Doppler_Website/order.html Doppler_Website/order.css Doppler_Website/order.jsx
git commit -m "feat(web): customer seat-QR order page with live status"
```

---

## Task 12: Admin — login gate + Orders board + Seats/QR + Customers + Settings

**Files:**
- Modify: `Doppler_Website/admin.html`

**Interfaces:**
- Consumes: `window.DopplerAPI`, `qrcode` CDN library.
- Adds a login overlay shown until `DopplerAPI.me()` succeeds, and four new tab panels wired to the API. Existing localStorage-based tabs (Events/Menu/Photos/Jobs/Careers) are left intact.

- [ ] **Step 1: Add the QR library + backend client to `admin.html` `<head>`/scripts**

In `Doppler_Website/admin.html`, add these script tags (near the existing `doppler-data.js` include, before the inline admin script):

```html
<script src="doppler-backend.js"></script>
<script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js" crossorigin="anonymous"></script>
```

- [ ] **Step 2: Add the four new tab buttons**

In the `<div class="tabs">` block (currently around `admin.html:593-599`), append:

```html
<button class="tab" data-tab="orders">§ Orders</button>
<button class="tab" data-tab="seats">§ Seats &amp; QR</button>
<button class="tab" data-tab="customers">§ Customers</button>
<button class="tab" data-tab="points">§ Points Settings</button>
```

- [ ] **Step 3: Add the login overlay markup**

Immediately inside `<body>` (before existing admin chrome), add:

```html
<div id="login-overlay" style="position:fixed;inset:0;background:#1a1410;color:#f4efe6;display:flex;align-items:center;justify-content:center;z-index:9999;">
  <div style="width:320px;text-align:center;">
    <h2 style="font-family:'Instrument Serif',serif;font-size:32px;">Doppler Admin</h2>
    <input id="login-email" class="field" type="email" placeholder="Staff email" style="width:100%;padding:12px;margin:8px 0;">
    <input id="login-pass" class="field" type="password" placeholder="Password" style="width:100%;padding:12px;margin:8px 0;">
    <button id="login-btn" style="width:100%;padding:12px;margin-top:8px;cursor:pointer;">Sign in</button>
    <p id="login-err" style="color:#ff9a8a;font-size:13px;min-height:18px;"></p>
  </div>
</div>
```

- [ ] **Step 4: Add the four panel containers**

Where the other tab panels live (each existing panel is a `<section data-panel="...">`), add:

```html
<section data-panel="orders" hidden>
  <div id="orders-board" class="board"></div>
</section>
<section data-panel="seats" hidden>
  <form id="seat-form"><input id="seat-label" placeholder="Label e.g. Table 7" required><input id="seat-zone" placeholder="Zone (optional)"><button>Add seat</button></form>
  <div id="seats-list"></div>
  <button id="print-all-qr">Print all QR codes</button>
</section>
<section data-panel="customers" hidden>
  <input id="cust-search" placeholder="Search email or name">
  <div id="customers-list"></div>
  <div id="customer-detail"></div>
</section>
<section data-panel="points" hidden>
  <label>Earn points per ₹1 <input id="set-earn" type="number" step="0.01"></label>
  <label>₹ value per point <input id="set-redeem" type="number" step="0.01"></label>
  <label>Minimum redemption (points) <input id="set-min" type="number"></label>
  <label>Site base URL (for QR) <input id="set-url" type="text" style="width:100%"></label>
  <button id="save-settings">Save settings</button>
  <p id="settings-msg"></p>
</section>
```

- [ ] **Step 5: Append the admin backend logic (new `<script>` at end of body)**

Add a new `<script>` block after the existing inline admin script:

```html
<script>
(function () {
  const API = window.DopplerAPI;

  // ---- Login gate ----
  async function checkAuth() {
    try { await API.me(); document.getElementById('login-overlay').style.display = 'none'; bootStaff(); }
    catch { document.getElementById('login-overlay').style.display = 'flex'; }
  }
  document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    try { await API.login(email, pass); document.getElementById('login-err').textContent = ''; checkAuth(); }
    catch (e) { document.getElementById('login-err').textContent = e.message; }
  };

  let booted = false;
  function bootStaff() {
    if (booted) return; booted = true;
    initOrders(); initSeats(); initCustomers(); initSettings();
  }

  // ---- Orders board (live) ----
  const STATUSES = ['new', 'preparing', 'served', 'paid'];
  async function renderOrders() {
    const orders = await API.listOrders();
    const board = document.getElementById('orders-board');
    board.innerHTML = '';
    orders.filter(o => o.status !== 'cancelled').forEach((o) => {
      const items = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ');
      const card = document.createElement('div');
      card.className = 'order-card';
      const nextBtns = STATUSES.filter(s => s !== o.status && s !== 'paid')
        .map(s => `<button data-act="status" data-id="${o.id}" data-status="${s}">${s}</button>`).join('');
      card.innerHTML = `
        <strong>${o.seat_label}</strong> · ${o.status} · ₹${o.subtotal}<br>
        <small>${o.customer_email}</small><br>${items}<br>
        ${nextBtns}
        ${o.status !== 'paid' ? `<button data-act="pay" data-id="${o.id}">Mark paid</button>` : `<button data-act="redeem" data-id="${o.id}" data-cust="${o.customer_email}">Redeem pts</button>`}
      `;
      board.appendChild(card);
    });
  }
  function initOrders() {
    renderOrders();
    API.streamBoard(() => renderOrders());
    document.getElementById('orders-board').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const id = b.dataset.id;
      try {
        if (b.dataset.act === 'status') await API.setStatus(id, b.dataset.status);
        else if (b.dataset.act === 'pay') { const r = await API.payOrder(id); alert(`Paid. Awarded ${r.pointsEarned} pts (balance ${r.pointsBalance}).`); }
        else if (b.dataset.act === 'redeem') { const p = parseInt(prompt('Points to redeem:'), 10); if (p) { const r = await API.redeemOrder(id, p); alert(`Redeemed ₹${r.redeemedValue} (balance ${r.pointsBalance}).`); } }
        renderOrders();
      } catch (err) { alert(err.message); }
    });
  }

  // ---- Seats & QR ----
  async function renderSeats() {
    const seats = await API.listSeats();
    const settings = await API.getSettings();
    const base = settings.site_base_url || window.location.origin;
    const list = document.getElementById('seats-list');
    list.innerHTML = '';
    seats.forEach((s) => {
      const url = `${base}/order.html?seat=${s.id}`;
      const row = document.createElement('div');
      row.className = 'seat-row';
      row.innerHTML = `<strong>${s.label}</strong> ${s.zone ? '· ' + s.zone : ''} ${s.active ? '' : '(inactive)'}
        <canvas data-qr="${url}"></canvas>
        <a download="${s.label}.png" data-dl>Download QR</a>
        <button data-toggle="${s.id}" data-active="${s.active}">${s.active ? 'Deactivate' : 'Activate'}</button>`;
      list.appendChild(row);
      const canvas = row.querySelector('canvas');
      window.QRCode.toCanvas(canvas, url, { width: 160 }, () => {
        row.querySelector('[data-dl]').href = canvas.toDataURL('image/png');
      });
    });
  }
  function initSeats() {
    renderSeats();
    document.getElementById('seat-form').onsubmit = async (e) => {
      e.preventDefault();
      await API.createSeat(document.getElementById('seat-label').value, document.getElementById('seat-zone').value);
      e.target.reset(); renderSeats();
    };
    document.getElementById('seats-list').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-toggle]'); if (!b) return;
      await API.updateSeat(b.dataset.toggle, { active: b.dataset.active !== 'true' }); renderSeats();
    });
    document.getElementById('print-all-qr').onclick = () => window.print();
  }

  // ---- Customers ----
  async function renderCustomers(q) {
    const list = await API.listCustomers(q);
    const el = document.getElementById('customers-list');
    el.innerHTML = list.map(c => `<div class="cust-row" data-id="${c.id}">${c.email} · ${c.points} pts · ${c.name || ''}</div>`).join('');
  }
  function initCustomers() {
    renderCustomers('');
    document.getElementById('cust-search').addEventListener('input', (e) => renderCustomers(e.target.value));
    document.getElementById('customers-list').addEventListener('click', async (e) => {
      const row = e.target.closest('.cust-row'); if (!row) return;
      const c = await API.getCustomer(row.dataset.id);
      const hist = c.history.map(h => `${h.delta > 0 ? '+' : ''}${h.delta} (${h.reason})`).join(', ');
      const detail = document.getElementById('customer-detail');
      detail.innerHTML = `<h3>${c.email}</h3><p>${c.points} pts · last visit ${new Date(c.last_visit).toLocaleString()}</p>
        <p>History: ${hist || 'none'}</p>
        <button id="adj-btn">Adjust points</button>`;
      document.getElementById('adj-btn').onclick = async () => {
        const delta = parseInt(prompt('Adjust by (e.g. -50 or 100):'), 10);
        const reason = prompt('Reason:') || 'adjust';
        if (Number.isInteger(delta) && delta !== 0) { try { await API.adjustCustomer(c.id, delta, reason); renderCustomers(document.getElementById('cust-search').value); detail.innerHTML = ''; } catch (err) { alert(err.message); } }
      };
    });
  }

  // ---- Settings ----
  async function initSettings() {
    const s = await API.getSettings();
    document.getElementById('set-earn').value = s.earn_per_rupee;
    document.getElementById('set-redeem').value = s.redeem_rupee_per_point;
    document.getElementById('set-min').value = s.min_redeem_points;
    document.getElementById('set-url').value = s.site_base_url;
    document.getElementById('save-settings').onclick = async () => {
      try {
        await API.putSettings({
          earn_per_rupee: parseFloat(document.getElementById('set-earn').value),
          redeem_rupee_per_point: parseFloat(document.getElementById('set-redeem').value),
          min_redeem_points: parseInt(document.getElementById('set-min').value, 10),
          site_base_url: document.getElementById('set-url').value.trim(),
        });
        document.getElementById('settings-msg').textContent = 'Saved.';
      } catch (e) { document.getElementById('settings-msg').textContent = e.message; }
    };
  }

  checkAuth();
})();
</script>
```

> **Note for the implementer:** the existing admin uses a `data-tab`/`data-panel` show-hide mechanism (see the current inline script's tab handler near `admin.html:593`). The new `<section data-panel="...">` blocks must use the SAME class/attribute convention the existing tabs use so the existing tab switcher reveals them — inspect the current tab handler and match it exactly (it may toggle a `hidden` attribute or an `active` class). Adjust the markup in Steps 4 accordingly.

- [ ] **Step 6: Manual end-to-end verification**

Start server, open `http://localhost:3000/admin.html`. Expected:
1. Login overlay blocks the page; wrong password shows an error; correct staff login (from Task 3) reveals admin.
2. **Seats & QR**: add "Table 7" → it appears with a scannable QR encoding `<base>/order.html?seat=<id>`; Download QR saves a PNG; Deactivate toggles state.
3. Scan/open that QR URL on a phone/second tab → place an order.
4. **Orders**: the new order appears on the board live (no refresh); advance status → customer's confirmation screen updates live; **Mark paid** → alert shows awarded points.
5. **Customers**: search the email → see balance; open detail → history shows the `earn` row; Adjust works.
6. **Points Settings**: change earn rate, Save, place another order → estimated points reflect the new rate.

- [ ] **Step 7: Commit**

```
git add Doppler_Website/admin.html
git commit -m "feat(admin): login gate + live orders board, seats/QR, customers, points settings"
```

---

## Task 13: Deployment runbook (Cloudflare Tunnel + pm2)

**Files:**
- Create: `server/DEPLOY.md`

- [ ] **Step 1: Create `server/DEPLOY.md`**

````markdown
# Doppler — Café PC Deployment (Windows 11)

## 1. Prerequisites
- Install Node.js 18+ and PostgreSQL.
- Create the database and role:
  ```
  psql -U postgres -c "CREATE ROLE doppler LOGIN PASSWORD 'choose-a-strong-pw';"
  psql -U postgres -c "CREATE DATABASE doppler OWNER doppler;"
  ```

## 2. App setup
```
cd server
copy .env.example .env   # then edit .env: DATABASE_URL, SESSION_SECRET (long random), PUBLIC_BASE_URL
npm install
npm run init-db
npm run create-user -- owner@doppler.coffee a-strong-password
```

## 3. Keep it running (pm2)
```
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start index.js --name doppler
pm2 save
```

## 4. Expose on your domain (Cloudflare Tunnel — free HTTPS, no port-forwarding)
1. Add your GoDaddy domain to Cloudflare (free plan); at GoDaddy, change the nameservers to the two Cloudflare gives you. Wait for "Active".
2. Install cloudflared, then:
   ```
   cloudflared tunnel login
   cloudflared tunnel create doppler
   cloudflared tunnel route dns doppler app.<yourdomain>
   ```
3. Create `config.yml` for the tunnel pointing `app.<yourdomain>` → `http://localhost:3000`, then:
   ```
   cloudflared tunnel run doppler        # test
   cloudflared service install            # run on boot
   ```
4. In admin → Points Settings, set **Site base URL** to `https://app.<yourdomain>` and (re)print seat QR codes.

## 5. Verify
- Visit `https://app.<yourdomain>/admin.html` from a phone on cellular → login works over HTTPS.
- Scan a seat QR → order page loads and an order reaches the live board.

## Backups
Schedule a daily `pg_dump`:
```
pg_dump -U doppler doppler > backup-%DATE%.sql
```
````

- [ ] **Step 2: Commit**

```
git add server/DEPLOY.md
git commit -m "docs: café PC deployment runbook (Cloudflare Tunnel + pm2)"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** seats/customers/orders/ledger/settings schema (T1); points scheme + admin-configurable rates (T2/T8); email-required ordering (T5/T6/T11); pay-at-counter + points-on-paid (T5/T7); live board via SSE (T4/T7/T12); customer balance + history, staff-only redemption (T5/T11/T12); seats + QR generation (T12); admin auth (T3/T9/T12); Cloudflare Tunnel reachability + Windows pm2 (T13); pure-function tests (T2); server-side price/points authority + RLS-equivalent (server-only point writes) (T5/T7).
- **Menu duplication tradeoff (per spec §3):** ordering uses `menu.json` (read by both client and server, so they always agree); the marketing menu page still uses `doppler-data.js`. If prices change, update `menu.json`. Moving the menu fully into the DB remains the documented future step.
- **Type consistency:** API client method names in T10 match route definitions in T6/T7/T8; `DopplerAPI` method names are used verbatim in T11/T12; service function names (`placeOrder`, `markPaid`, `redeemPoints`, `adjustPoints`, `setStatus`, `recentHistory`, `getSettings`) are consistent across T5, T6, T7, T8.
- **Admin tab integration caveat:** the exact show/hide convention of the existing admin tabs must be matched (flagged in T12 Step 5 note) since the current mechanism wasn't fully read; the implementer inspects `admin.html`'s tab handler and matches it.
```
