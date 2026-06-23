const fs = require('fs');
const path = require('path');

const fromTo = [
  { from: /yield/g, to: 'return' },
  { from: /Yield/g, to: 'Return' },
  { from: /yields/g, to: 'returns' },
  { from: /Yields/g, to: 'Returns' }
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
