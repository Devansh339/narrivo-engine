const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const rootDir = __dirname;
const html = `<!DOCTYPE html>
<html>
<body>
<canvas id='c'></canvas>
<script>
async function run() {
  const img = new Image();
  img.src = '/master.jpg';
  await new Promise(r => img.onload = r);
  const w = img.width, h = img.height;
  const cvs = document.getElementById('c');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const raw = ctx.getImageData(0, 0, w, h).data;

  function luma(x, y) {
    const idx = (y * w + x) * 4;
    return 0.299 * raw[idx] + 0.587 * raw[idx+1] + 0.114 * raw[idx+2];
  }

  // Trace the crease between upper arm and torso from armpit to elbow/waist:
  // For left arm: between x = 240 and 290
  const leftCrease = [];
  for (let y = 220; y <= 520; y += 15) {
    let minLum = Infinity, bestX = 265;
    for (let x = 240; x <= 285; x++) {
      const lum = luma(x, y);
      if (lum < minLum) { minLum = lum; bestX = x; }
    }
    leftCrease.push([bestX, y, Math.round(minLum)]);
  }

  // For right arm: between x = 480 and 530
  const rightCrease = [];
  for (let y = 220; y <= 520; y += 15) {
    let minLum = Infinity, bestX = 500;
    for (let x = 480; x <= 530; x++) {
      const lum = luma(x, y);
      if (lum < minLum) { minLum = lum; bestX = x; }
    }
    rightCrease.push([bestX, y, Math.round(minLum)]);
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leftCrease, rightCrease })
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
  } else if (req.url === '/master.jpg') {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(fs.readFileSync(rootDir + '/source/00_master_full_body.jpg'));
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const p = JSON.parse(body);
      console.log('LEFT CREASE (x, y, lum):', JSON.stringify(p.leftCrease));
      console.log('RIGHT CREASE (x, y, lum):', JSON.stringify(p.rightCrease));
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
