const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  '#8B1E2F': '#A84B2B',
  '#8b1e2f': '#A84B2B',
  '#8B6560': '#6B6560',
  '#8b6560': '#6B6560',
  '#21080b': '#1e110d',
  '#140c0d': '#120b0a',
  '#08090a': '#080808'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldC, newC] of Object.entries(replacements)) {
        if (content.includes(oldC)) {
          content = content.split(oldC).join(newC);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

walkDir(srcDir);
console.log('DONE');
