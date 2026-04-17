const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  '#98FB98': '#8B1E2F',
  '#98fb98': '#8B1E2F',
  '#ebffe2': '#E8E2D9',
  '#EBFFE2': '#E8E2D9',
  '#84967e': '#8B6560',
  '#131313': '#0A0C0E',
  '#1c1b1b': '#0A0C0E',
  '#0e0e0e': '#08090a',
  '#3a3939': '#21080b',
  '#2a2a2a': '#140c0d',
  'text-neutral-500': 'text-[#8B6560]',
  'text-neutral-400': 'text-[#E8E2D9]',
  'border-neutral-700': 'border-[#8B6560]/30',
  'border-neutral-800': 'border-[#8B6560]/10',
  'bg-neutral-800': 'bg-[#8B1E2F]/10'
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
