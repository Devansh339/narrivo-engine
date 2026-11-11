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

  const p = { title: '1. SHOULDER ROTATION', headR: 3.5, neckR: 2.0, shldLR: 3.0, shldRR: -3.0, elbLR: 1.5, elbRR: -1.5, wrtLR: 1.0, wrtRR: -1.0, hipLR: 0, hipRR: 0, kneeLR: 0, kneeRR: 0 };
  const deg = d => d * Math.PI / 180;

  // Let's render Pose 1 on transparent canvas and inspect where non-transparent pixels are!
  const cvs = document.getElementById('c');
  cvs.width = 768; cvs.height = 1376;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, 768, 1376);

  function drawPart(key, transformFn) {
    const c = compMap[key];
    ctx.save();
    if (transformFn) transformFn(ctx, c);
    ctx.drawImage(imgs[key], c.cropBox.x, c.cropBox.y);
    ctx.restore();
  }

  const neckP = compMap['04_neck'].pivotMaster;
  const headP = compMap['02_head_face'].pivotMaster;
  const hipLP = compMap['10_upper_leg_left'].pivotMaster;
  const kneeLP = compMap['11_lower_leg_left'].pivotMaster;
  const hipRP = compMap['10_upper_leg_right'].pivotMaster;
  const kneeRP = compMap['11_lower_leg_right'].pivotMaster;
  const shldLP = compMap['07_upper_arm_left'].pivotMaster;
  const elbLP = compMap['08_forearm_left'].pivotMaster;
  const wrtLP = compMap['09_hand_left'].pivotMaster;
  const shldRP = compMap['07_upper_arm_right'].pivotMaster;
  const elbRP = compMap['08_forearm_right'].pivotMaster;
  const wrtRP = compMap['09_hand_right'].pivotMaster;

  // Draw stack:
  drawPart('01_back_hair', ctx => {
    ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
    ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
  });
  drawPart('04_neck', ctx => {
    ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
  });
  drawPart('12_boot_left', ctx => {
    ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
    ctx.translate(kneeLP.x, kneeLP.y); ctx.rotate(deg(p.kneeLR)); ctx.translate(-kneeLP.x, -kneeLP.y);
  });
  drawPart('12_boot_right', ctx => {
    ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
    ctx.translate(kneeRP.x, kneeRP.y); ctx.rotate(deg(p.kneeRR)); ctx.translate(-kneeRP.x, -kneeRP.y);
  });
  drawPart('11_lower_leg_left', ctx => {
    ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
    ctx.translate(kneeLP.x, kneeLP.y); ctx.rotate(deg(p.kneeLR)); ctx.translate(-kneeLP.x, -kneeLP.y);
  });
  drawPart('11_lower_leg_right', ctx => {
    ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
    ctx.translate(kneeRP.x, kneeRP.y); ctx.rotate(deg(p.kneeRR)); ctx.translate(-kneeRP.x, -kneeRP.y);
  });
  drawPart('10_upper_leg_left', ctx => {
    ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
  });
  drawPart('10_upper_leg_right', ctx => {
    ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
  });
  drawPart('09_pelvis_belt', () => {});
  drawPart('09_hand_left', ctx => {
    ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
    ctx.translate(elbLP.x, elbLP.y); ctx.rotate(deg(p.elbLR)); ctx.translate(-elbLP.x, -elbLP.y);
    ctx.translate(wrtLP.x, wrtLP.y); ctx.rotate(deg(p.wrtLR || 0)); ctx.translate(-wrtLP.x, -wrtLP.y);
  });
  drawPart('09_hand_right', ctx => {
    ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
    ctx.translate(elbRP.x, elbRP.y); ctx.rotate(deg(p.elbRR)); ctx.translate(-elbRP.x, -elbRP.y);
    ctx.translate(wrtRP.x, wrtRP.y); ctx.rotate(deg(p.wrtRR || 0)); ctx.translate(-wrtRP.x, -wrtRP.y);
  });
  drawPart('08_forearm_left', ctx => {
    ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
    ctx.translate(elbLP.x, elbLP.y); ctx.rotate(deg(p.elbLR)); ctx.translate(-elbLP.x, -elbLP.y);
  });
  drawPart('08_forearm_right', ctx => {
    ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
    ctx.translate(elbRP.x, elbRP.y); ctx.rotate(deg(p.elbRR)); ctx.translate(-elbRP.x, -elbRP.y);
  });
  drawPart('07_upper_arm_left', ctx => {
    ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
  });
  drawPart('07_upper_arm_right', ctx => {
    ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
  });
  drawPart('06_jacket_torso', () => {});
  drawPart('05_collar_left', () => {});
  drawPart('05_collar_right', () => {});
  drawPart('02_head_face', ctx => {
    ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
    ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
  });
  drawPart('03_front_hair', ctx => {
    ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
    ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
  });

  // Now inspect the pixels in the flank region: x = 200..320, y = 350..750
  const data = ctx.getImageData(0, 0, 768, 1376).data;
  const flankScan = [];
  for (let y = 350; y <= 750; y += 25) {
    let row = { y, leftArm: null, gap: null, torso: null };
    // Scan left side from x = 150 to x = 320
    let lastA = 0;
    let segs = [];
    let curSeg = null;
    for (let x = 140; x <= 320; x++) {
      const idx = (y * 768 + x) * 4;
      const a = data[idx + 3];
      const isOpaque = a > 50;
      if (curSeg === null) {
        curSeg = { opaque: isOpaque, startX: x, endX: x };
      } else if (curSeg.opaque === isOpaque) {
        curSeg.endX = x;
      } else {
        segs.push(curSeg);
        curSeg = { opaque: isOpaque, startX: x, endX: x };
      }
    }
    if (curSeg) segs.push(curSeg);
    flankScan.push({ y, segs });
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flankScan)
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
      const scan = JSON.parse(body);
      console.log('--- POSE 1 FLANK TRANSPARENCY SCAN (Left side x=140..320) ---');
      for (const r of scan) {
        const segStr = r.segs.map(s => (s.opaque ? '[OPAQUE:' : '[TRANSPARENT_GAP:') + s.startX + '..' + s.endX + ']').join(' ');
        console.log(`y=${r.y}: ${segStr}`);
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
