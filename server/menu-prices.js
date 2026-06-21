const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, '..', 'menu.json');
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
