/**
 * Diagnostic script: renders 00_master_bust.jpg with a precision coordinate grid
 * and also zoomed-in coordinate grids around key anatomical boundaries so we can
 * design exact pixel-level segmentation masks.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'source', '00_master_bust.jpg');
const rendersDir = path.join(rootDir, 'renders');
if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
async function run() {
  const img = new Image();
  img.src = '/master.jpg';
  await new Promise(r => img.onload = r);

  const w = img.width;
  const h = img.height;

  // Full grid image
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  ctx.font = 'bold 12px monospace';
  for (let x = 0; x < w; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    if (x % 100 === 0) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
    } else if (x % 50 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
    }
    ctx.stroke();
    if (x % 50 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x + 2, 4, 32, 14);
      ctx.fillRect(x + 2, h - 18, 32, 14);
      ctx.fillStyle = x % 100 === 0 ? '#00ffff' : '#ffff00';
      ctx.fillText(String(x), x + 4, 15);
      ctx.fillText(String(x), x + 4, h - 7);
    }
  }

  for (let y = 0; y < h; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    if (y % 100 === 0) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
    } else if (y % 50 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
    }
    ctx.stroke();
    if (y % 50 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(4, y + 2, 36, 14);
      ctx.fillRect(w - 40, y + 2, 36, 14);
      ctx.fillStyle = y % 100 === 0 ? '#00ffff' : '#ffff00';
      ctx.fillText(String(y), 6, y + 13);
      ctx.fillText(String(y), w - 38, y + 13);
    }
  }

  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      width: w,
      height: h,
      dataUrl: canvas.toDataURL('image/png')
    })
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
    res.end(fs.readFileSync(sourceFile));
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const p = JSON.parse(body);
      const b64 = p.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(rendersDir, 'master_grid_overlay.png'), Buffer.from(b64, 'base64'));
      console.log('Master dimensions:', p.width + 'x' + p.height);
      res.writeHead(200);
      res.end('ok');
      setTimeout(() => process.exit(0), 150);
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', `http://127.0.0.1:${port}/`]);
});
