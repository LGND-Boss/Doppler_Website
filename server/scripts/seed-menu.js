// One-off / reproducible seed: convert the legacy station-based menu.json into
// the editor model (left/right columns, flat add-ons, editable chrome) and
// publish it into the site_menu table. Safe to re-run.
//
//   npm run seed-menu            # only seeds if site_menu is still empty
//   npm run seed-menu -- --force # overwrite whatever is published
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const MENU_JSON = path.join(__dirname, '..', '..', 'menu.json');

function convert(src) {
  const cats = src.categories || [];
  // Number categories sequentially within each column for the § code label.
  const counters = { left: 0, right: 0 };
  const categories = cats.map((c) => {
    const column = (c.station || 'bar') === 'kitchen' ? 'right' : 'left';
    counters[column] += 1;
    return {
      id: c.id || ('cat-' + counters[column]),
      column,
      title: c.title || '',
      code: '§ ' + String(counters[column]).padStart(2, '0'),
      sub: '',
      items: (c.items || []).map((it) => ({
        name: it.name || '',
        note: it.note || '',
        price: it.price == null ? '' : String(it.price),
      })),
    };
  });

  // The editor's add-ons section is the "milk options" shown on the public
  // banner. Per-item food toppings (matcha/pizzette/brekkie groups) have no
  // place in the editor model, so only the milk group carries over.
  const milk = (src.addonGroups && src.addonGroups.milk) || [];
  const addons = milk.map((a) => ({ name: a.name || '', price: a.price == null ? '' : String(a.price) }));

  return {
    edition: src.edition || 'Full Menu · 2026',
    titleTop: 'The',
    titleMid: 'full',
    titleSerif: 'menu.',
    address: 'Doppler · coffee\nC-Scheme · Jaipur',
    hours: '06:00 — 22:30',
    categories,
    addons,
    kitchenTitle: 'From the brick oven.',
    kitchenBody: 'All-day brekkie, snacks, pizzette, bowls and plates. Made to share — or not.',
    kitchenRange: '',
    finePrintTitle: 'One last thing.',
    finePrintBody: 'All prices in ₹ and exclude applicable taxes unless stated. Veg, vegan, egg and allergen options available — just ask.',
    footTagline: 'Slow water. Second cup is always.',
    footCopyright: '© 2026 Doppler Coffee · ' + (src.edition || 'Full Menu · 2026'),
    footCoords: '26.9130°N · 75.8060°E',
  };
}

async function main() {
  const force = process.argv.includes('--force');
  const src = JSON.parse(fs.readFileSync(MENU_JSON, 'utf8'));
  const doc = convert(src);

  const { rows } = await db.query('SELECT data FROM site_menu WHERE id = 1');
  const existing = rows[0] && rows[0].data;
  if (existing && Object.keys(existing).length && !force) {
    console.log('site_menu already has a published document — skipping (use --force to overwrite).');
    return db.pool.end();
  }

  await db.query('UPDATE site_menu SET data = $1 WHERE id = 1', [JSON.stringify(doc)]);
  const items = doc.categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`Seeded site_menu: ${doc.categories.length} categories, ${items} items, ${doc.addons.length} add-ons.`);
  return db.pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
