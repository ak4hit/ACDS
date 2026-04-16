const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  '#00FF41': '#98FB98',
  '#00ff41': '#98FB98',
  '#72ff70': '#98FB98',
  '#00e639': '#5B8059',
  '#007117': '#2f4d2f',
  '#003907': '#1a2b1a',
  'rgba(0, 255, 65, 0.02)': 'rgba(152, 251, 152, 0.02)',
  'rgba(0,255,65,0.3)': 'rgba(152, 251, 152, 0.3)'
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
