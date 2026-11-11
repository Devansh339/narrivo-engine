const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'source', '00_master_bust.jpg');
const rendersDir = path.join(rootDir, 'renders');

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
async function run() {
  const img = new Image();
  img.src = '/master.jpg';
  await new Promise(r => img.onload = r);

  // Create a 2x2 panel of zoomed regions with 10px/20px coordinate labels
  const regions = [
    { title: '1. Hair / Forehead / Ears / Back-Hair Tufts', sx: 240, sy: 170, sw: 420, sh: 360, scale: 2.2 },
    { title: '2. Jawline / Chin / Neck / Henley Seam', sx: 290, sy: 440, sw: 320, sh: 370, scale: 2.2 },
    { title: '3. Left & Right Shearling Collar', sx: 155, sy: 485, sw: 585, sh: 340, scale: 1.8 },
    { title: '4. Left & Right Shoulders / Sleeve Seams', sx: 0, sy: 620, sw: 896, sh: 580, scale: 1.25 }
  ];

  const canvas = document.createElement('canvas');
  canvas.width = 2000;
  canvas.height = 1700;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#181a20';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const positions = [
    { dx: 20, dy: 40 },
    { dx: 1020, dy: 40 },
    { dx: 20, dy: 880 },
    { dx: 850, dy: 880 }
  ];

  regions.forEach((reg, i) => {
    const pos = positions[i];
    const dw = Math.round(reg.sw * reg.scale);
    const dh = Math.round(reg.sh * reg.scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(reg.title, pos.dx, pos.dy - 10);

    ctx.save();
    ctx.beginPath();
    ctx.rect(pos.dx, pos.dy, dw, dh);
    ctx.clip();
    ctx.drawImage(img, reg.sx, reg.sy, reg.sw, reg.sh, pos.dx, pos.dy, dw, dh);

    ctx.font = 'bold 10px monospace';
    const step = 20;
    const startX = Math.ceil(reg.sx / step) * step;
    for (let x = startX; x < reg.sx + reg.sw; x += step) {
      const px = pos.dx + (x - reg.sx) * reg.scale;
      ctx.beginPath();
      ctx.moveTo(px, pos.dy);
      ctx.lineTo(px, pos.dy + dh);
      ctx.strokeStyle = x % 100 === 0 ? 'rgba(0,255,255,0.75)' : 'rgba(255,255,0,0.45)';
      ctx.lineWidth = x % 100 === 0 ? 1.5 : 0.8;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(px + 1, pos.dy + 2, 24, 12);
      ctx.fillStyle = x % 100 === 0 ? '#00ffff' : '#ffff88';
      ctx.fillText(String(x), px + 2, pos.dy + 11);
    }

    const startY = Math.ceil(reg.sy / step) * step;
    for (let y = startY; y < reg.sy + reg.sh; y += step) {
      const py = pos.dy + (y - reg.sy) * reg.scale;
      ctx.beginPath();
      ctx.moveTo(pos.dx, py);
      ctx.lineTo(pos.dx + dw, py);
      ctx.strokeStyle = y % 100 === 0 ? 'rgba(0,255,255,0.75)' : 'rgba(255,255,0,0.45)';
      ctx.lineWidth = y % 100 === 0 ? 1.5 : 0.8;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(pos.dx + 2, py + 1, 26, 12);
      ctx.fillStyle = y % 100 === 0 ? '#00ffff' : '#ffff88';
      ctx.fillText(String(y), pos.dx + 3, py + 10);
    }
    ctx.restore();
  });

  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: canvas.toDataURL('image/png') })
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
      fs.writeFileSync(path.join(rendersDir, 'master_zoom_grids.png'), Buffer.from(b64, 'base64'));
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
