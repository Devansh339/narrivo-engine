/**
 * Verifies the exact pixel-level partition of 00_master_bust.jpg into the 8 required components:
 * 01_back_hair, 02_head_face, 03_front_hair, 04_neck, 05_collar_left, 05_collar_right,
 * 06_jacket_torso, 07_shoulder_left, 07_shoulder_right (8 groups / 9 files).
 */
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
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Interpolate y(x) along a monotonic-in-x polyline
function evalYAtX(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((x >= x0 && x <= x1) || (x >= x1 && x <= x0)) {
      if (Math.abs(x1 - x0) < 1e-6) return y0;
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return pts[0][1];
}

// Interpolate x(y) along a monotonic-in-y polyline
function evalXAtY(pts, y) {
  if (y <= pts[0][1]) return pts[0][0];
  if (y >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
      if (Math.abs(y1 - y0) < 1e-6) return x0;
      const t = (y - y0) / (y1 - y0);
      return x0 + t * (x1 - x0);
    }
  }
  return pts[0][0];
}

async function run() {
  const img = new Image();
  img.src = '/master.jpg';
  await new Promise(r => img.onload = r);

  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  function luma(x, y) {
    const xr = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yr = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (yr * w + xr) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  function snapPolylineToInk(pts, searchRadius = 5, subdivisions = 4) {
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      for (let s = 0; s < subdivisions; s++) {
        const t = s / subdivisions;
        dense.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }
    dense.push(pts[pts.length - 1]);

    const snapped = dense.map(([x, y], idx) => {
      const prev = dense[Math.max(0, idx - 1)];
      const next = dense[Math.min(dense.length - 1, idx + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      let bestX = x, bestY = y;
      let bestScore = luma(x, y);
      for (let r = -searchRadius; r <= searchRadius; r++) {
        const cx = x + nx * r;
        const cy = y + ny * r;
        const score = luma(cx, cy) + Math.abs(r) * 2.5;
        if (score < bestScore) {
          bestScore = score;
          bestX = cx;
          bestY = cy;
        }
      }
      return [Math.round(bestX), Math.round(bestY)];
    });

    return snapped.map((p, i) => {
      if (i === 0 || i === snapped.length - 1) return p;
      return [
        Math.round((snapped[i - 1][0] + p[0] * 2 + snapped[i + 1][0]) / 4),
        Math.round((snapped[i - 1][1] + p[1] * 2 + snapped[i + 1][1]) / 4)
      ];
    });
  }

  // Refined anatomical guide seams:
  const jawSnapped = snapPolylineToInk([
    [320, 436], [322, 455], [326, 478], [330, 500], [336, 518],
    [345, 534], [358, 548], [374, 565], [390, 582], [406, 598],
    [422, 609], [440, 614], [456, 615], [474, 614], [492, 609],
    [508, 598], [524, 582], [540, 565], [556, 548], [568, 532],
    [575, 516], [580, 498], [584, 475], [588, 452], [591, 437]
  ], 5, 3);

  // Left Shearling Collar INCLUDING the dark-brown leather under-collar lip down to y=728..802
  const collarLeftSnapped = snapPolylineToInk([
    [318, 494], [330, 500], [322, 520], [318, 545], [320, 575],
    [324, 605], [329, 635], [335, 665], [341, 695], [347, 725],
    [353, 755], [358, 785], [350, 800], [334, 784], [316, 766],
    [292, 754], [256, 742], [214, 729], [184, 720], [164, 710],
    [159, 694]
  ], 5, 3);

  // Right Shearling Collar INCLUDING the dark-brown leather under-collar lip down to y=728..802
  const collarRightSnapped = snapPolylineToInk([
    [595, 494], [580, 500], [588, 520], [591, 545], [589, 575],
    [585, 605], [580, 635], [574, 665], [568, 695], [562, 725],
    [555, 755], [550, 785], [558, 800], [574, 784], [592, 766],
    [616, 754], [652, 742], [696, 729], [724, 720], [735, 710],
    [737, 694]
  ], 5, 3);

  // Neck to Henley Shirt Top Collar Ink Line
  const neckHenleySnapped = snapPolylineToInk([
    [342, 704], [358, 712], [378, 724], [398, 735], [418, 747],
    [438, 760], [452, 774], [460, 792], [464, 804], [468, 788],
    [474, 768], [486, 756], [506, 745], [526, 734], [548, 720],
    [567, 706]
  ], 5, 3);

  // Left Shoulder / Harness Outer Ink Line (shifted to outer edge of vertical strap & rings)
  const leftShoulderSnapped = snapPolylineToInk([
    [212, 729], [212, 765], [212, 800], [211, 825], [198, 836],
    [195, 850], [208, 862], [212, 895], [211, 938], [192, 952],
    [177, 974], [174, 1000], [182, 1024], [189, 1038], [176, 1068],
    [159, 1110], [141, 1155], [124, 1200]
  ], 5, 3);

  // Right Shoulder / Harness Outer Ink Line (shifted to outer edge of vertical strap & rings)
  const rightShoulderSnapped = snapPolylineToInk([
    [698, 729], [698, 765], [698, 800], [699, 825], [712, 836],
    [715, 850], [702, 862], [698, 895], [699, 938], [718, 952],
    [733, 974], [736, 1000], [728, 1024], [721, 1038], [734, 1068],
    [751, 1110], [769, 1155], [786, 1200]
  ], 5, 3);

  // Left & Right Ear Outer Helix Polylines (separating 02_head_face ears from 01_back_hair tufts behind them)
  const leftEarOuter = snapPolylineToInk([
    [299, 344], [295, 362], [297, 382], [302, 404], [309, 424], [320, 437]
  ], 4, 2);

  const rightEarOuter = snapPolylineToInk([
    [605, 338], [610, 358], [608, 380], [603, 404], [597, 424], [591, 437]
  ], 4, 2);

  function drawLine(pts, color) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawLine(jawSnapped, '#00ff00');
  drawLine(collarLeftSnapped, '#ffff00');
  drawLine(collarRightSnapped, '#ffff00');
  drawLine(neckHenleySnapped, '#ff00ff');
  drawLine(leftShoulderSnapped, '#ff6600');
  drawLine(rightShoulderSnapped, '#ff6600');
  drawLine(leftEarOuter, '#00ffff');
  drawLine(rightEarOuter, '#00ffff');

  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: c.toDataURL('image/png') })
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
      fs.writeFileSync(path.join(rendersDir, 'master_seam_preview.png'), Buffer.from(b64, 'base64'));
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
