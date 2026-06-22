const { test } = require('node:test');
const assert = require('node:assert');
const {
  cartSubtotal, pointsForSpend, validateRedeem, redeemValue, taxFor,
} = require('../server/services/points');

const CTX = {
  priceMap: { espresso: 180, latte: 260, pizza: 480 },
  addonMap: { 'ao-bacon': { name: 'Bacon', price: 180 }, 'ao-oat': { name: 'Oat', price: 100 } },
  itemAddons: { espresso: ['ao-oat'], latte: ['ao-oat'], pizza: ['ao-bacon'] },
};

test('cartSubtotal sums price * qty', () => {
  assert.equal(cartSubtotal([{ id: 'espresso', qty: 2 }, { id: 'latte', qty: 1 }], CTX), 620);
});

test('cartSubtotal adds validated add-on prices per unit', () => {
  // (480 + 180 bacon) * 2 = 1320
  assert.equal(cartSubtotal([{ id: 'pizza', qty: 2, addons: ['ao-bacon'] }], CTX), 1320);
  // espresso 180 + oat 100 = 280
  assert.equal(cartSubtotal([{ id: 'espresso', qty: 1, addons: ['ao-oat'] }], CTX), 280);
});

test('cartSubtotal rejects add-on not allowed for the item', () => {
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 1, addons: ['ao-bacon'] }], CTX), /add-on not allowed/);
});

test('cartSubtotal rejects unknown add-on', () => {
  assert.throws(() => cartSubtotal([{ id: 'pizza', qty: 1, addons: ['ao-nope'] }], CTX), /unknown add-on/);
});

test('cartSubtotal rejects unknown item', () => {
  assert.throws(() => cartSubtotal([{ id: 'nope', qty: 1 }], CTX), /unknown item: nope/);
});

test('cartSubtotal rejects bad qty', () => {
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 0 }], CTX), /bad qty/);
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 1.5 }], CTX), /bad qty/);
  assert.throws(() => cartSubtotal([{ id: 'espresso', qty: 99 }], CTX), /bad qty/);
});

test('cartSubtotal rejects empty cart', () => {
  assert.throws(() => cartSubtotal([], CTX), /empty cart/);
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

test('taxFor rounds tax on subtotal', () => {
  assert.equal(taxFor(700, 5), 35);
  assert.equal(taxFor(700, 0), 0);
  assert.equal(taxFor(95, 5), 5);   // 4.75 -> 5
  assert.equal(taxFor(700, undefined), 0);
});
