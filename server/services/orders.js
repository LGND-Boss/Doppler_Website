const db = require('../db');
const { publish } = require('../events');
const { priceMap, nameMap, stationMap, addonMap, itemAddons } = require('../menu-prices');
const { cartSubtotal, pointsForSpend, validateRedeem, redeemValue, taxFor } = require('./points');

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

// Normalize client items into line items using server data (prices, names, add-ons).
function buildLineItems(items) {
  return items.map(({ id, qty, note, addons }) => {
    const chosen = (addons || [])
      .filter((aid) => addonMap[aid] && (itemAddons[id] || []).includes(aid))
      .map((aid) => ({ id: aid, name: addonMap[aid].name, price: addonMap[aid].price }));
    const addonTotal = chosen.reduce((s, a) => s + a.price, 0);
    return {
      id, qty, note: note || '', name: nameMap[id], price: priceMap[id], station: stationMap[id],
      addons: chosen, lineTotal: (priceMap[id] + addonTotal) * qty,
    };
  });
}

// Derive the overall status from per-station readiness. 'paid'/'cancelled' are terminal
// and never recomputed here.
function deriveStatus(order) {
  const barDone = !order.needs_bar || order.bar_ready;
  const kitchenDone = !order.needs_kitchen || order.kitchen_ready;
  if (barDone && kitchenDone) return 'served';
  if (order.bar_ready || order.kitchen_ready) return 'preparing';
  return 'new';
}

async function placeOrder({ seatId, email, name, items }) {
  const settings = await getSettings();
  const subtotal = cartSubtotal(items, { priceMap, addonMap, itemAddons }); // throws on bad input
  const lineItems = buildLineItems(items);
  const taxPercent = Number(settings.tax_percent);
  const tax = taxFor(subtotal, taxPercent);
  const total = subtotal + tax;
  const estimatedPoints = pointsForSpend(subtotal, Number(settings.earn_per_rupee));
  const needsBar = lineItems.some((l) => l.station === 'bar');
  const needsKitchen = lineItems.some((l) => l.station === 'kitchen');

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
      `INSERT INTO orders (seat_id, customer_id, items, subtotal, tax_amount, needs_bar, needs_kitchen)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [seatId, customer.id, JSON.stringify(lineItems), subtotal, tax, needsBar, needsKitchen]
    );
    const orderId = orderRes.rows[0].id;
    const history = await recentHistory(client, customer.id);

    const result = {
      orderId, seatLabel: seat.label, subtotal, taxPercent, tax, total, estimatedPoints,
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

// A station (bar|kitchen) marks its items ready; status is recomputed from flags.
async function setStationReady(orderId, station) {
  if (station !== 'bar' && station !== 'kitchen') throw new Error('invalid station');
  const col = station === 'bar' ? 'bar_ready' : 'kitchen_ready';
  return db.tx(async (client) => {
    const ordRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    const order = ordRes.rows[0];
    if (!order) throw new Error('order not found');
    if (order.status === 'paid' || order.status === 'cancelled') throw new Error('order is closed');
    const updatedFlags = { ...order, [col]: true };
    const status = deriveStatus(updatedFlags);
    const { rows } = await client.query(
      `UPDATE orders SET ${col} = true, status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId, status]
    );
    publish('board', { type: 'status', orderId, status });
    publish('order:' + orderId, { status });
    return rows[0];
  });
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

module.exports = { getSettings, placeOrder, setStatus, setStationReady, markPaid, redeemPoints, adjustPoints, recentHistory };
