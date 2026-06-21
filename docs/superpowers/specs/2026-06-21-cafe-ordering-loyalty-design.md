# Doppler — Seat-QR Ordering & Loyalty Points

**Date:** 2026-06-21
**Status:** Approved design, pre-implementation
**Project:** `E:\Dopler\Doppler_Website` (static React-via-CDN marketing site for Doppler, a specialty coffee café in Jaipur)

---

## 1. Goal

Let a dine-in customer **scan a QR code at their seat**, see the menu on their own phone, enter their **email (required)**, and **place an order tied to that seat**. The café earns repeat business through a **loyalty points** program: customers accrue points on paid orders and redeem them for ₹-off in future. Staff run everything — seats, QR generation, the live order board, and point redemption — from the existing **admin page**, now secured behind a login.

This is a "fancy café" experience: the customer and admin surfaces must match the site's existing concrete/bone aesthetic (Space Grotesk + Instrument Serif + Tiro Devanagari, grain texture, ₹ INR pricing).

---

## 2. Key decisions (locked)

| Area | Decision |
|------|----------|
| Data layer | **Self-hosted: local Postgres on a café PC**, fronted by a **Node.js + Express API** (a browser cannot talk to Postgres directly; the API server holds DB credentials and enforces all rules). |
| Reachability | Café PC exposed on the customer's GoDaddy **domain via a Cloudflare Tunnel** (`cloudflared`), giving automatic HTTPS and a single stable URL (e.g. `https://app.<domain>`). Works identically on café WiFi and cellular. No router/port-forwarding. DNS for the domain is moved to Cloudflare (domain stays registered at GoDaddy). |
| Payment | **Pay at counter / staff.** The app only sends the order; customer pays staff as usual. Points are awarded when staff mark the order **paid**. (No payment gateway in this phase.) |
| Staff order handling | **Live orders board** in admin via **Server-Sent Events (SSE)**: new orders appear in real time, grouped by seat, with a status pipeline. |
| Email | **Required to place an order** → every customer is in the loyalty database automatically. |
| Points scheme | **Points by spend**, all rates **admin-configurable**. Defaults: **earn 1 point per ₹10 spent**, **redeem 1 point = ₹1**, minimum redemption configurable (default 50 pts). (~10% reward rate = industry standard.) |
| Points UX | **Customer sees their balance + recent history** on their phone after ordering; **redemption is staff-only** in admin (points can't be self-gamed). |
| Admin auth | **Staff email + password**, handled in Node (bcrypt-hashed passwords, secure httpOnly session cookie). `npm run create-user` to add staff. |
| Order menu source | Reads the **canonical menu shipped in `doppler-data.js`** (identical for everyone). Per-device localStorage menu edits do **not** flow to orders. Moving the menu into the backend is a noted future step. |
| Process supervision | Node server kept alive across reboots via **pm2** on Windows (café PC is Windows 11). |

### Known tradeoffs (accepted)
- Ordering depends on the café PC being **on** and its **internet up** (traffic routes through Cloudflare). Inherent to self-hosting.
- **No customer login**: anyone who types an email on the order page can see that email's points balance (low-sensitivity). Email verification (OTP) is a possible future addition.
- Backups, OS uptime, and `cloudflared`/Postgres upkeep are the café's responsibility.

---

## 3. Architecture

The existing static marketing site is unchanged and stays where it is currently hosted. A **new self-contained app** (customer order page + extended admin + API) is served by the Node server on the café PC, reached at a subdomain such as `app.<domain>` through the Cloudflare Tunnel.

```
Customer phone (WiFi or cellular)
        │  scans QR → https://app.<domain>/order.html?seat=<id>
        ▼
Cloudflare edge (HTTPS, stable URL)
        │  secure outbound tunnel (cloudflared)
        ▼
Café PC (Windows 11, kept alive by pm2)
   ┌─────────────────────────────────────────┐
   │ Node.js + Express                        │
   │  • serves order.html / admin.html / JS   │
   │  • REST API + SSE                         │
   │  • holds DB credentials, enforces rules   │
   │            │ pg                            │
   │            ▼                               │
   │ Local PostgreSQL                          │
   └─────────────────────────────────────────┘
```

### Components & responsibilities

- **`order.html` + its JS** — mobile-first customer page. Resolves seat from `?seat=<id>`, renders menu, builds a cart, collects email, posts the order, then shows confirmation + live status + points balance/history. Knows only the public API.
- **`admin.html` (extended)** — staff console. Adds a login gate and three tabs (Orders, Seats & QR, Customers & Points) plus points settings. Talks to the authenticated API + SSE.
- **Node API server** — the only component that touches Postgres. Public endpoints (seat lookup, place order, order status stream) and authenticated staff endpoints (everything else). Enforces the rule that **points change only through staff actions**, inside SQL transactions. Serves static files. Applies rate-limiting + input validation on public routes.
- **PostgreSQL** — the single source of truth (seats, customers, orders, points ledger, settings).

### New / changed files (planned)
```
server/
  index.js              # Express app: static + API + SSE wiring
  db.js                 # pg pool
  auth.js               # session + bcrypt login, requireStaff middleware
  routes/
    public.js           # GET seat, POST place-order, GET order status (SSE)
    orders.js           # staff: list/advance status, mark-paid, redeem
    seats.js            # staff: CRUD seats
    customers.js        # staff: search, history, adjust points
    settings.js         # staff: points rates + site base URL
  services/
    points.js           # PURE functions: cartTotal(), pointsForSpend(), redemptionValue()  (unit-tested)
    orders.js           # transactional order/paid/redeem logic
  scripts/
    create-user.js      # npm run create-user
  schema.sql            # tables, indexes, seed settings row
  seed.sql              # optional sample seats
  .env.example          # DB url, SESSION_SECRET, PUBLIC_BASE_URL, points defaults
  package.json
test/
  points.test.js        # unit tests for services/points.js (pure logic)
Doppler_Website/
  order.html            # NEW customer page
  order.jsx / order.js  # NEW customer logic (match existing CDN style)
  admin.html            # EXTENDED: login gate + 3 tabs + settings
  doppler-backend.js    # NEW thin client wrapper around the API (mirrors DopplerData shape)
docs/superpowers/specs/2026-06-21-cafe-ordering-loyalty-design.md
```
Exact server folder location and customer-page filename to be confirmed during planning; the marketing site files remain untouched except `admin.html` and the optional topbar "Order" link.

---

## 4. Data model (PostgreSQL)

- **`seats`** — `id` (uuid pk), `label` (text, e.g. "Table 7"), `zone` (text, nullable), `active` (bool, default true), `created_at`.
- **`customers`** — `id` (uuid pk), `email` (citext, unique), `name` (text, nullable), `points` (int, default 0, ≥0), `created_at`, `last_visit`.
- **`orders`** — `id` (uuid pk), `seat_id` (fk→seats), `customer_id` (fk→customers), `status` (enum: `new` | `preparing` | `served` | `paid` | `cancelled`, default `new`), `items` (jsonb: `[{name, price, qty, note}]`), `subtotal` (int, ₹), `points_earned` (int, default 0), `points_redeemed` (int, default 0), `notes` (text), `created_at`, `updated_at`.
- **`points_ledger`** — `id` (uuid pk), `customer_id` (fk), `order_id` (fk, nullable), `delta` (int, +earn / −redeem / ±adjust), `reason` (text: `earn` | `redeem` | `adjust`), `created_at`. The auditable history that powers the customer's balance + history view; `customers.points` is the cached running total.
- **`settings`** — single-row key/value (or typed columns): `earn_per_rupee` (default 0.1 → 1 pt per ₹10), `redeem_rupee_per_point` (default 1), `min_redeem_points` (default 50), `site_base_url`.
- **`staff_users`** — `id`, `email` (unique), `password_hash` (bcrypt), `created_at`.

Indexes: `customers.email`, `orders.status`, `orders.created_at`, `points_ledger.customer_id`.

---

## 5. API surface

**Public (no auth, rate-limited, validated):**
- `GET /api/seat/:id` → `{ label, active }` (404 / inactive → friendly error on page).
- `POST /api/order` `{ seat_id, email, name?, items[] }` → transaction: upsert customer by email, recompute subtotal **server-side** from the canonical menu (never trust client prices), create order `status=new`, update `last_visit`; returns `{ order_id, points_balance, recent_history, estimated_points }`.
- `GET /api/order/:id/stream` (SSE) → emits status changes for the customer's confirmation screen.

**Staff (session-authenticated):**
- `POST /api/login`, `POST /api/logout`, `GET /api/me`.
- `GET /api/orders/stream` (SSE) → live board feed.
- `GET /api/orders?status=` , `POST /api/orders/:id/status {status}`.
- `POST /api/orders/:id/pay` → transaction: set `paid`, compute `points_earned` from subtotal × earn rate, increment `customers.points`, insert `earn` ledger row.
- `POST /api/orders/:id/redeem {points}` → transaction: validate ≥ min and ≤ balance, set `points_redeemed`, decrement balance, insert `redeem` ledger row, adjust effective total.
- Seats CRUD: `GET/POST/PATCH /api/seats` (+ deactivate).
- Customers: `GET /api/customers?q=`, `GET /api/customers/:id` (with history), `POST /api/customers/:id/adjust {delta, reason}`.
- Settings: `GET/PUT /api/settings`.

**Security invariants:**
- Only `pay`, `redeem`, and `adjust` (all staff-only) ever change points. The public order endpoint can never write points.
- Subtotal and points are always computed server-side from server-held data.
- All point mutations happen inside a single SQL transaction with the ledger insert, so balance and history can never diverge.

---

## 6. User flows

### Customer (order.html)
1. Scan seat QR → `…/order.html?seat=<id>`. Page fetches seat → shows **"Table 7"** (or a friendly error if the seat is invalid/inactive).
2. Browse menu (canonical shipped menu), add items with qty + per-item note, see running total.
3. Enter **email (required)** + optional name.
4. **Place order** → order created `new`; confirmation screen shows the order summary, "**pay at counter**", current **points balance**, "**you'll earn ~X points when paid**", and recent history.
5. Status updates live (`new → preparing → served`) via SSE, in the café's aesthetic.

### Staff (admin.html)
- **Login gate** over the whole admin; logout.
- **Orders** — live board grouped by seat, status pipeline `new → preparing → served → paid`; buttons advance status; **Mark paid** awards points; **Redeem** applies ₹-off (validated against balance + min).
- **Seats & QR** — add / edit / deactivate seats (label, zone); generate, download, and print a QR per seat (client-side QR lib, CDN), encoding `site_base_url/order.html?seat=<id>`; print-all sheet.
- **Customers & Points** — searchable list (email, name, balance, last visit); view ledger history; manual ± adjust with reason.
- **Settings** — points rates (earn / redeem / min) + `site_base_url` used in QR codes.

---

## 7. Testing & verification

- **Unit (TDD):** pure functions in `services/points.js` — `cartTotal(items, menu)`, `pointsForSpend(subtotal, rate)`, `redemptionValue(points, rate)`, plus min-redemption / non-negative-balance guards. Written test-first.
- **Manual smoke checklist:** place an order from a seat URL → appears on admin board in real time → advance status → mark paid → points credited → redeem in admin → balance + ledger correct → customer confirmation reflects balance.
- No build step is added to the front-end; the front-end stays CDN/no-build. Tests run via the Node `test/` folder.

---

## 8. Setup (one-time, café PC — Windows 11)

1. Install **Node.js** and **PostgreSQL**.
2. Create the database; run `schema.sql` (and optional `seed.sql`).
3. Copy `.env.example` → `.env`; set DB URL, `SESSION_SECRET`, `PUBLIC_BASE_URL` (e.g. `https://app.<domain>`), and points defaults.
4. `npm install`; `npm run create-user` to make the first staff login.
5. Install **`cloudflared`**, authenticate, create a tunnel mapping `app.<domain>` → `localhost:<port>`; move the GoDaddy domain's DNS to Cloudflare and add the route.
6. Start the server under **pm2** with restart-on-boot.
7. In admin → Settings, set the site base URL; in Seats & QR, create seats and print their QR codes.

---

## 9. Suggested implementation phases

1. **Backend foundation** — Postgres schema, Node/Express skeleton, `pg`, `.env`, staff auth + `create-user`, pure `services/points.js` with unit tests.
2. **Customer order page** — `order.html`, seat lookup, menu/cart, place-order endpoint, confirmation + SSE status.
3. **Admin: live Orders board** — login gate, SSE board, status pipeline, mark-paid (points award).
4. **Admin: Seats & QR** — seat CRUD + QR generation/printing.
5. **Admin: Customers & Points + Settings** — customer search/history, redeem, manual adjust, points-rate settings.
6. **Deployment** — Cloudflare Tunnel, pm2, end-to-end smoke test on a real phone.
