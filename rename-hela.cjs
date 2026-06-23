const fs = require('fs');
const path = require('path');

const fromTo = [
  { from: /hela_user_id/g, to: 'mallbuy_user_id' },
  { from: /helavest_currency/g, to: 'mallbuy_currency' },
  { from: /Hela<span className="text-emerald-600">Shop<\/span>/g, to: 'Mall<span className="text-emerald-600">Buy</span>' },
  { from: /HELA777/g, to: 'MALL777' }
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
