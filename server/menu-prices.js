const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, '..', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const priceMap = {};
const nameMap = {};
const stationMap = {};
const addonMap = {};        // addonId -> { name, price }
const itemAddons = {};      // itemId -> Set-like array of allowed addonId

const groups = menu.addonGroups || {};
function registerAddon(a) { addonMap[a.id] = { name: a.name, price: a.price }; return a.id; }
for (const g of Object.values(groups)) g.forEach(registerAddon);

for (const cat of menu.categories) {
  const groupIds = (cat.addonGroups || []).flatMap((g) => (groups[g] || []).map((a) => a.id));
  for (const item of cat.items) {
    priceMap[item.id] = item.price;
    nameMap[item.id] = item.name;
    // Per-item station wins, else category station, else default to the bar.
    stationMap[item.id] = item.station || cat.station || 'bar';
    const itemAo = (item.addons || []).map(registerAddon);
    itemAddons[item.id] = Array.from(new Set([...groupIds, ...itemAo]));
  }
}

module.exports = { menu, priceMap, nameMap, stationMap, addonMap, itemAddons };
