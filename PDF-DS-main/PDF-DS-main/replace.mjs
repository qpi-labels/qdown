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

  // bg-zinc-50 / bg-white -> bg-pdf-aluminum
  code = code.replace(/\bbg-zinc-50\b|\bbg-white\b/g, 'bg-pdf-aluminum');
  code = code.replace(/\bbg-zinc-100\b|\bbg-zinc-150\b/g, 'bg-pdf-aluminum'); // Extend based on logic

  // text-zinc-950 / text-zinc-900 -> text-pdf-leather
  code = code.replace(/\btext-zinc-950\b|\btext-zinc-900\b/g, 'text-pdf-leather');
  code = code.replace(/\btext-zinc-700\b|\btext-zinc-800\b|\btext-zinc-805\b/g, 'text-pdf-leather');
  code = code.replace(/\bbg-zinc-800\b|\bbg-zinc-900\b|\bbg-zinc-950\b/g, 'bg-pdf-leather');

  // border-zinc-200 / divide-zinc-200 -> border-pdf-seam
  code = code.replace(/\bborder-zinc-[1-2]00\b|\bborder-zinc-50\b|\bborder-zinc-150\b|\bdivide-zinc-[1-2]00\b|\bdivide-zinc-150\b/g, (match) => {
    if (match.startsWith('border')) return 'border-pdf-seam';
    return 'divide-pdf-seam';
  });
  
  // Also for ring-
  code = code.replace(/\bring-zinc-200\b/g, 'ring-pdf-seam');

  // text-zinc-400 / border-zinc-300 -> text-pdf-focus / border-pdf-focus
  code = code.replace(/\btext-zinc-[4-6][0-9]{1,2}\b|\btext-zinc-300\b|\btext-zinc-200\b/g, 'text-pdf-focus');
  code = code.replace(/\bborder-zinc-[3-9]00\b/g, 'border-pdf-focus');
  code = code.replace(/\bring-zinc-[3-9]00\b/g, 'ring-pdf-focus');

  // bg-zinc-200 / 300 / 400 ... 
  code = code.replace(/\bbg-zinc-[2-6]00\b|\bbg-zinc-450\b/g, 'bg-pdf-seam'); // use seam for bg slider tracks and small elements
  
  // text-white -> text-pdf-aluminum
  code = code.replace(/\btext-white\b/g, 'text-pdf-aluminum');
  
  // bg-red-700 / accent-red-700 -> bg-pdf-red / accent-pdf-red
  code = code.replace(/\bbg-red-[0-9]{2,3}\b/g, 'bg-pdf-red');
  code = code.replace(/\baccent-red-[0-9]{2,3}\b/g, 'accent-pdf-red');
  code = code.replace(/\btext-red-[0-9]{2,3}\b/g, 'text-pdf-red');
  code = code.replace(/\bborder-red-[0-9]{2,3}\b/g, 'border-pdf-red');
  
  // Catch any remaining zinc classes to debug log
  const remaining = code.match(/[a-zA-Z]+-zinc-[0-9]+/g);
  if (remaining) {
    console.log(`Failed to replace all in ${file}:`, remaining);
  }

  // Also replace #FFFFFF etc in JS logic
  code = code.replace(/\'#FFFFFF\'/gi, '\'#ffffff\''); // To match pdf token if checked
  
  fs.writeFileSync(file, code, 'utf8');
}
console.log('Done');
