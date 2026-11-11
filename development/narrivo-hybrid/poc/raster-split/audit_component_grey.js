const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html>
<html>
<body>
<canvas id="c"></canvas>
<script>
async function run() {
  const manifest = JSON.parse(await (await fetch('/manifest.json')).text());
  const compMap = {};
  manifest.components.forEach(c => compMap[c.key] = c);

  const imgs = {};
  await Promise.all(manifest.components.map(c => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = '/reconstructed/' + c.key + '.png';
    if (img.complete) resolve();
    imgs[c.key] = img;
  })));

  // Inspect each individual component image for grey pixels (#7A7A7A approx)
  const compGreyReport = [];
  for (const c of manifest.components) {
    const img = imgs[c.key];
    const cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
    let opaqueCount = 0;
    let greyPixels = 0;
    let sampleGrey = [];
    for (let y = 0; y < cvs.height; y++) {
      for (let x = 0; x < cvs.width; x++) {
        const idx = (y * cvs.width + x) * 4;
        const a = data[idx + 3];
        if (a > 30) {
          opaqueCount++;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          const dist = Math.hypot(r - 122, g - 122, b - 122);
          if (sat < 12 && dist < 25) {
            greyPixels++;
            if (sampleGrey.length < 5) {
              // Master canvas coords
              sampleGrey.push({ localX: x, localY: y, masterX: c.cropBox.x + x, masterY: c.cropBox.y + y, rgb: [r, g, b], a });
            }
          }
        }
      }
    }
    compGreyReport.push({
      key: c.key,
      z: c.zOrder,
      width: img.width,
      height: img.height,
      opaqueCount,
      greyPixels,
      greyPct: Number(((greyPixels / (opaqueCount || 1)) * 100).toFixed(2)),
      sampleGrey
    });
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(compGreyReport)
  });
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(path.join(rootDir, 'fullbody-seg', 'manifest.json')));
  } else if (req.url.startsWith('/reconstructed/')) {
    const fPath = path.join(rootDir, 'fullbody-seg', req.url);
    if (fs.existsSync(fPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(fPath));
    } else {
      res.writeHead(404); res.end('not found');
    }
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const report = JSON.parse(body);
      console.log('--- COMPONENT GREY PIXEL AUDIT ---');
      for (const r of report) {
        if (r.greyPixels > 50) {
          console.log(`[ALERT] ${r.key} (z=${r.z}): ${r.greyPixels} grey pixels (${r.greyPct}% of ${r.opaqueCount})! Samples:`, JSON.stringify(r.sampleGrey));
        } else {
          console.log(`[OK] ${r.key} (z=${r.z}): ${r.greyPixels} grey pixels.`);
        }
      }
      res.writeHead(200); res.end('ok');
      setTimeout(() => process.exit(0), 100);
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', 'http://127.0.0.1:' + port + '/']);
});
