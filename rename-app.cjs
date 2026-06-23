const fs = require('fs');
const path = require('path');

const fromTo = [
  { from: /HelaInvest/g, to: 'MallBuy' },
  { from: /HelaVest/g, to: 'MallBuy' },
  { from: /Investment Desk/g, to: 'Wholesale Desk' },
  { from: /investment platform/g, to: 'wholesale platform' },
  { from: /investment plans/g, to: 'wholesale packages' },
  { from: /investment/g, to: 'purchase' },
  { from: /Investment/g, to: 'Purchase' },
  { from: /Investments/g, to: 'Purchases' },
  { from: /investments/g, to: 'purchases' },
  { from: /Active Investments/g, to: 'Active Orders' },
  { from: /Invest/g, to: 'Shop' },
  { from: /invest/g, to: 'buy' },
  { from: /invested/g, to: 'purchased' },
  { from: /capital growth/g, to: 'inventory growth' },
  { from: /capital/g, to: 'funds' },
  { from: /Capital/g, to: 'Funds' },
  { from: /trades/g, to: 'orders' },
  { from: /trade/g, to: 'order' },
  { from: /Trades/g, to: 'Orders' },
  { from: /Trade/g, to: 'Order' },
  { from: /compounding yield/g, to: 'wholesale profit' },
  { from: /ROI/g, to: 'Margin' },
  { from: /profit yield/g, to: 'sales profit' },
  { from: /payouts/g, to: 'commissions' },
  { from: /Payouts/g, to: 'Commissions' }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.json') || file.endsWith('.html')) {
         results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.push('./index.html');
files.push('./metadata.json');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  fromTo.forEach(rule => {
    content = content.replace(rule.from, rule.to);
  });
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
