// Pure pricing & points math. No DB, no I/O.

// ctx: { priceMap, addonMap, itemAddons }. Each item: { id, qty, addons?: [addonId] }.
// Add-ons are validated against the item's allowed set and priced server-side, per unit.
function cartSubtotal(items, ctx) {
  const { priceMap, addonMap = {}, itemAddons = {} } = ctx || {};
  if (!Array.isArray(items) || items.length === 0) throw new Error('empty cart');
  let total = 0;
  for (const { id, qty, addons } of items) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error('bad qty');
    if (!priceMap || !(id in priceMap)) throw new Error('unknown item: ' + id);
    let unit = priceMap[id];
    const allowed = itemAddons[id] || [];
    for (const aid of (addons || [])) {
      if (!(aid in addonMap)) throw new Error('unknown add-on: ' + aid);
      if (!allowed.includes(aid)) throw new Error('add-on not allowed for ' + id + ': ' + aid);
      unit += addonMap[aid].price;
    }
    total += unit * qty;
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

// Tax on the pre-tax subtotal, in whole ₹.
function taxFor(subtotal, taxPercent) {
  return Math.max(0, Math.round(subtotal * (taxPercent || 0) / 100));
}

module.exports = { cartSubtotal, pointsForSpend, validateRedeem, redeemValue, taxFor };
