const { execFileSync } = require('child_process');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
try {
  const out = execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=3000',
    'file:///' + path.resolve(__dirname, 'fullbody_articulation_test.html').replace(/\\/g, '/')
  ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('STDOUT:', out);
} catch (e) {
  console.log('STDERR:', e.stderr);
  console.log('STDOUT:', e.stdout);
}
