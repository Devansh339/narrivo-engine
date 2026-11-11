const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const rendersDir = path.join(rootDir, 'renders');
const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#000;margin:0;">
<canvas id="c" width="1080" height="1920"></canvas>
<canvas id="zoom" width="1200" height="800"></canvas>
<script src="/engine.js"></script>
<script>
async function run() {
  const manifest = ${JSON.stringify(manifest)};
  const imageMap = {};
  await Promise.all(manifest.components.map(c => new Promise(r => {
    const img = new Image();
    img.onload = () => r();
    img.onerror = () => r();
    img.src = '/comp/' + c.key + '.png';
    if (img.complete) r();
    imageMap[c.key] = img;
  })));

  const renderer = new VanceEngine.VanceRenderer(manifest, imageMap);
  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');
  const zCvs = document.getElementById('zoom');
  const zCtx = zCvs.getContext('2d');

  // Let's test specific poses:
  const poses = [
    { name: 'idle_rest', pose: VanceEngine.evaluateIdle(1.6) },
    { name: 'walk_passing', pose: VanceEngine.evaluateWalk(0.27) },
    { name: 'walk_stride', pose: VanceEngine.evaluateWalk(0.54) },
    { name: 'gesture_pointing', pose: VanceEngine.evaluateGesture('pointing', 1.0) },
    { name: 'gesture_waving', pose: VanceEngine.evaluateGesture('waving', 1.0) },
    { name: 'gesture_open_palms', pose: VanceEngine.evaluateGesture('open_palms', 1.0) },
    { name: 'gesture_arms_crossed', pose: VanceEngine.evaluateGesture('arms_crossed', 1.0) },
    { name: 'gesture_thinking', pose: VanceEngine.evaluateGesture('thinking', 1.0) },
    { name: 'gesture_hands_on_hips', pose: VanceEngine.evaluateGesture('hands_on_hips', 1.0) }
  ];

  for (const item of poses) {
    renderer.render(ctx, item.pose, { width: 1080, height: 1920, is1080: true, background: 'studio' });
    
    // Full frame
    await fetch('/save_img?name=' + item.name + '_full.jpg', {
      method: 'POST',
      body: cvs.toDataURL('image/jpeg', 0.9)
    });

    // 3x Shoulder Zoom Crop (Right shoulder & Armpit: x: 500..850, y: 300..750 in 1080x1920 coords)
    zCtx.clearRect(0, 0, 1200, 800);
    // Draw left shoulder zoom on left, right shoulder zoom on right
    zCtx.drawImage(cvs, 150, 300, 350, 400, 50, 50, 500, 600);
    zCtx.drawImage(cvs, 580, 300, 350, 400, 650, 50, 500, 600);
    zCtx.fillStyle = '#fff';
    zCtx.font = '24px sans-serif';
    zCtx.fillText(item.name + ' - Left Shoulder (3x) / Right Shoulder (3x)', 60, 40);

    await fetch('/save_img?name=' + item.name + '_shoulder_zoom.jpg', {
      method: 'POST',
      body: zCvs.toDataURL('image/jpeg', 0.9)
    });
  }

  await fetch('/done', { method: 'POST' });
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9012');
  const pathname = urlObj.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (pathname === '/engine.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(fs.readFileSync(path.join(rootDir, 'engine.js')));
  } else if (pathname.startsWith('/comp/')) {
    const fPath = path.join(segDir, 'reconstructed', path.basename(pathname));
    if (fs.existsSync(fPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(fPath));
    } else {
      res.writeHead(404); res.end('not found');
    }
  } else if (pathname === '/save_img') {
    const name = urlObj.searchParams.get('name');
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const b64 = body.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(rendersDir, name), Buffer.from(b64, 'base64'));
      console.log('Saved inspection image:', name);
      res.writeHead(200); res.end('ok');
    });
  } else if (pathname === '/done') {
    res.writeHead(200); res.end('ok');
    console.log('Inspection complete!');
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  }
});

server.listen(9012, () => {
  console.log('Inspection server listening on 9012...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9012/'
  ]);
});
