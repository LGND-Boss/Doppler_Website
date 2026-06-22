const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, '..', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const priceMap = {};
const nameMap = {};
const stationMap = {};
for (const cat of menu.categories) {
  for (const item of cat.items) {
    priceMap[item.id] = item.price;
    nameMap[item.id] = item.name;
    // Per-item station wins, else category station, else default to the bar.
    stationMap[item.id] = item.station || cat.station || 'bar';
  }
}

module.exports = { menu, priceMap, nameMap, stationMap };
