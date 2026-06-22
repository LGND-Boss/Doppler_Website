const { test } = require('node:test');
const assert = require('node:assert');
const {
  cartSubtotal, pointsForSpend, validateRedeem, redeemValue, taxFor,
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

test('taxFor rounds tax on subtotal', () => {
  assert.equal(taxFor(700, 5), 35);
  assert.equal(taxFor(700, 0), 0);
  assert.equal(taxFor(95, 5), 5);   // 4.75 -> 5
  assert.equal(taxFor(700, undefined), 0);
});
