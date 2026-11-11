const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const img = new Image(); img.src = '/fg.png';
  await new Promise(r => { img.onload = r; if (img.complete) r(); });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  
  const rep = [];
  for (let y = 770; y <= 810; y += 5) {
    let row = { y, lGaps: [], rGaps: [] };
    for (let x = 200; x <= 250; x++) {
      const idx = (y * img.width + x) * 4;
      const a = data[idx + 3], r = data[idx], g = data[idx + 1], b = data[idx + 2];
      row.lGaps.push({ x, a, isOlive: (g > r - 15 && g > b + 15 && g > 40 && g < 130), r, g, b });
    }
    for (let x = 535; x <= 585; x++) {
      const idx = (y * img.width + x) * 4;
      const a = data[idx + 3], r = data[idx], g = data[idx + 1], b = data[idx + 2];
      row.rGaps.push({ x, a, isOlive: (g > r - 15 && g > b + 15 && g > 40 && g < 130), r, g, b });
    }
    rep.push(row);
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(rep) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/fg.png') res.end(fs.readFileSync(rootDir + '/fullbody-seg/fullframe/00_full_master_foreground.png'));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      const data = JSON.parse(b);
      data.forEach(d => {
        const lOpaque = d.lGaps.filter(p => p.a > 50);
        const rOpaque = d.rGaps.filter(p => p.a > 50);
        console.log(`y=${d.y}:`);
        console.log(`  Left: ` + lOpaque.map(p => `x=${p.x}(${p.isOlive?'OLIVE':'HAND'}:${p.r},${p.g},${p.b})`).join(' '));
        console.log(`  Right: ` + rOpaque.map(p => `x=${p.x}(${p.isOlive?'OLIVE':'HAND'}:${p.r},${p.g},${p.b})`).join(' '));
      });
      res.end(); process.exit(0);
    });
  }
});
server.listen(9010, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9010/'
  ]);
});
