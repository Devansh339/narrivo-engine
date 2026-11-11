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
  const bgR = raw[40], bgG = raw[41], bgB = raw[42];

  function isBg(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return true;
    const idx = (y * w + x) * 4;
    const r = raw[idx], g = raw[idx+1], b = raw[idx+2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    return (sat < 14 && Math.hypot(r - bgR, g - bgG, b - bgB) < 36);
  }

  // Find the boundary of the torso and the boundary of the arm between y = 350 and y = 640
  const profile = [];
  for (let y = 350; y <= 640; y += 10) {
    // Left side: trace from center x=384 outwards to left
    let leftTorsoEdge = 384;
    while (leftTorsoEdge > 150 && !isBg(leftTorsoEdge, y)) {
      leftTorsoEdge--;
    }
    // Now continue outwards to find where the arm starts (if there is background gap)
    let leftArmInner = leftTorsoEdge;
    while (leftArmInner > 150 && isBg(leftArmInner, y)) {
      leftArmInner--;
    }
    let leftArmOuter = leftArmInner;
    while (leftArmOuter > 100 && !isBg(leftArmOuter, y)) {
      leftArmOuter--;
    }

    // Right side: trace from center x=384 outwards to right
    let rightTorsoEdge = 384;
    while (rightTorsoEdge < 600 && !isBg(rightTorsoEdge, y)) {
      rightTorsoEdge++;
    }
    let rightArmInner = rightTorsoEdge;
    while (rightArmInner < 600 && isBg(rightArmInner, y)) {
      rightArmInner++;
    }
    let rightArmOuter = rightArmInner;
    while (rightArmOuter < 680 && !isBg(rightArmOuter, y)) {
      rightArmOuter++;
    }

    profile.push({
      y,
      left: { torsoEdge: leftTorsoEdge, armInner: leftArmInner, armOuter: leftArmOuter, hasGap: (leftArmInner < leftTorsoEdge) },
      right: { torsoEdge: rightTorsoEdge, armInner: rightArmInner, armOuter: rightArmOuter, hasGap: (rightArmInner > rightTorsoEdge) }
    });
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
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
      const profile = JSON.parse(body);
      console.log('--- TORSO & ARM PROFILE ---');
      for (const p of profile) {
        console.log(`y=${p.y}: Left [Arm:${p.left.armOuter}..${p.left.armInner}] [Gap:${p.left.hasGap ? (p.left.armInner+'..'+p.left.torsoEdge) : 'NONE'}] [TorsoEdge:${p.left.torsoEdge}] | Right [TorsoEdge:${p.right.torsoEdge}] [Gap:${p.right.hasGap ? (p.right.torsoEdge+'..'+p.right.armInner) : 'NONE'}] [Arm:${p.right.armInner}..${p.right.armOuter}]`);
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
