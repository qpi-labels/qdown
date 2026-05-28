import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files.push(...walk(p));
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  }
  return files;
}

const files = walk('src');

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Any instance where bg-pdf-red and text-pdf-red co-exist in the same className string, 
  // replace bg-pdf-red with bg-pdf-aluminum
  code = code.replace(/className=(["`'])(.*?)\1/g, (match, quote, classNames) => {
    if (classNames.includes('bg-pdf-red') && classNames.includes('text-pdf-red')) {
      return `className=${quote}${classNames.replace(/bg-pdf-red/g, 'bg-pdf-aluminum')}${quote}`;
    }
    return match;
  });

  fs.writeFileSync(file, code, 'utf8');
}
console.log('Done');
