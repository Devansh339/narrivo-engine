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

  const yLines = [400, 450, 500, 550, 600];
  const probe = {};
  for (const y of yLines) {
    probe[y] = [];
    for (let x = 450; x <= 580; x += 5) {
      const idx = (y * w + x) * 4;
      const r = raw[idx], g = raw[idx+1], b = raw[idx+2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      probe[y].push({ x, rgb: [r, g, b], sat, isGrey: (sat < 14 && Math.hypot(r-122, g-122, b-122) < 36) });
    }
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(probe)
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
      for (const [y, pts] of Object.entries(p)) {
        console.log('--- Right Y = ' + y + ' ---');
        console.log(pts.map(pt => pt.x + (pt.isGrey ? '[BG]' : '[FG]') + ':' + pt.rgb.join(',')).join(' '));
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
