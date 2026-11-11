const { execFileSync } = require('child_process');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = execFileSync(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--virtual-time-budget=5000',
  '--dump-dom',
  'file:///' + path.resolve(__dirname, 'fullbody_articulation_test.html').replace(/\\/g, '/')
], { encoding: 'utf8' });

console.log('strip cards count:', (out.match(/class="card"/g) || []).length);
const m = out.match(/<tbody id="perfBody">([\s\S]*?)<\/tbody>/);
if (m) console.log('perfBody:\n' + m[1].trim());
