/**
 * Gate 2: Component Alpha Extraction & Trimming Pipeline
 * Uses headless Chrome's native Canvas2D to load the preserved source JPEGs,
 * remove the neutral grey (#7A7A7A) background with despill/color-unmixing,
 * split left/right component pairs, and write transparent PNGs to processed/.
 * Never modifies files in source/.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceDir = path.join(rootDir, 'source');
const processedDir = path.join(rootDir, 'processed');

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Alpha Extractor</title></head>
<body>
<script>
async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Extracts foreground from uniform neutral grey background (~#7A7A7A)
 * using border + seed flood-fill + soft alpha ramp & color unmixing.
 */
function keyOutGrey(img, cropBox = null, maskDiagramText = false) {
  const sx = cropBox ? cropBox.x : 0;
  const sy = cropBox ? cropBox.y : 0;
  const sw = cropBox ? cropBox.w : img.width;
  const sh = cropBox ? cropBox.h : img.height;

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Estimate background grey from top-left and top-right corners of full image
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = img.width;
  fullCanvas.height = img.height;
  const fctx = fullCanvas.getContext('2d');
  fctx.drawImage(img, 0, 0);
  const corner = fctx.getImageData(10, 10, 1, 1).data;
  const bgR = corner[0], bgG = corner[1], bgB = corner[2];

  function isGreyBg(idx) {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    // Neutral grey within tolerance
    if (sat < 14 && dist < 36) return true;
    return false;
  }

  // Flood fill from all edges of the crop box
  const visited = new Uint8Array(sw * sh);
  const isBg = new Uint8Array(sw * sh);
  const queue = new Int32Array(sw * sh);
  let qHead = 0, qTail = 0;

  function push(x, y) {
    if (x < 0 || x >= sw || y < 0 || y >= sh) return;
    const p = y * sw + x;
    if (visited[p]) return;
    visited[p] = 1;
    const idx = p * 4;
    if (isGreyBg(idx)) {
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < sw; x++) {
    push(x, 0);
    push(x, sh - 1);
  }
  for (let y = 0; y < sh; y++) {
    push(0, y);
    push(sw - 1, y);
  }

  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % sw;
    const y = (p - x) / sw;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // If maskDiagramText is true (for 08_forearms), keep only the largest connected foreground component
  if (maskDiagramText) {
    const fgVisited = new Uint8Array(sw * sh);
    let bestComp = null;
    let bestSize = 0;

    for (let p = 0; p < sw * sh; p++) {
      if (!isBg[p] && !fgVisited[p]) {
        const comp = [];
        let cHead = 0;
        comp.push(p);
        fgVisited[p] = 1;
        while (cHead < comp.length) {
          const cur = comp[cHead++];
          const cx = cur % sw;
          const cy = (cur - cx) / sw;
          const neighbors = [
            cx > 0 ? cur - 1 : -1,
            cx < sw - 1 ? cur + 1 : -1,
            cy > 0 ? cur - sw : -1,
            cy < sh - 1 ? cur + sw : -1
          ];
          for (const nb of neighbors) {
            if (nb >= 0 && !isBg[nb] && !fgVisited[nb]) {
              fgVisited[nb] = 1;
              comp.push(nb);
            }
          }
        }
        if (comp.length > bestSize) {
          bestSize = comp.length;
          bestComp = comp;
        }
      }
    }

    if (bestComp) {
      const keep = new Uint8Array(sw * sh);
      for (const p of bestComp) keep[p] = 1;
      for (let p = 0; p < sw * sh; p++) {
        if (!keep[p]) isBg[p] = 1;
      }
    }
  }

  // Apply transparency and soft edge unmixing (1-2px boundary feather & despill)
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const p = y * sw + x;
      const idx = p * 4;
      if (isBg[p]) {
        data[idx + 3] = 0;
      } else {
        // Check if adjacent to background
        let bgNeighbors = 0;
        if (x > 0 && isBg[p - 1]) bgNeighbors++;
        if (x < sw - 1 && isBg[p + 1]) bgNeighbors++;
        if (y > 0 && isBg[p - sw]) bgNeighbors++;
        if (y < sh - 1 && isBg[p + sw]) bgNeighbors++;

        if (bgNeighbors > 0) {
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
          // Compute soft alpha based on distance from background color
          const alpha = Math.min(1, Math.max(0.15, dist / 45));
          // Color unmix to remove grey fringe
          data[idx] = Math.max(0, Math.min(255, Math.round((r - (1 - alpha) * bgR) / alpha)));
          data[idx + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - alpha) * bgG) / alpha)));
          data[idx + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - alpha) * bgB) / alpha)));
          data[idx + 3] = Math.round(alpha * 255);
        } else {
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Trim to tight non-transparent bounding box with 8px padding
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (data[(y * sw + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX) return { dataUrl: canvas.toDataURL('image/png'), width: sw, height: sh };

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(sw - 1, maxX + pad);
  maxY = Math.min(sh - 1, maxY + pad);

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const trimCanvas = document.createElement('canvas');
  trimCanvas.width = tw;
  trimCanvas.height = th;
  trimCanvas.getContext('2d').drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);

  return {
    dataUrl: trimCanvas.toDataURL('image/png'),
    width: tw,
    height: th,
    cropOffset: { x: sx + minX, y: sy + minY }
  };
}

async function run() {
  const tasks = [
    { src: '01_back_hair.jpg', out: '01_back_hair.png', split: null },
    { src: '02_head_face_base.jpg', out: '02_head_face_base.png', split: null },
    { src: '03_front_hair.jpg', out: '03_front_hair.png', split: null },
    { src: '04_neck.jpg', out: '04_neck.png', split: null },
    { src: '05_jacket_torso.jpg', out: '05_jacket_torso.png', split: null },
    { src: '06_shearling_collar.jpg', outLeft: '06_collar_left.png', outRight: '06_collar_right.png', split: 'lr' },
    { src: '07_upper_arms.jpg', outLeft: '07_upper_arm_left.png', outRight: '07_upper_arm_right.png', split: 'lr' },
    { src: '08_forearms.jpg', outLeft: '08_forearm_left.png', outRight: '08_forearm_right.png', split: 'lr', maskText: true },
    { src: '09_hands.jpg', outLeft: '09_hand_left.png', outRight: '09_hand_right.png', split: 'lr' }
  ];

  const results = [];

  for (const t of tasks) {
    const img = await loadImage('/source/' + t.src);
    if (!t.split) {
      const res = keyOutGrey(img, null, false);
      await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: t.out, dataUrl: res.dataUrl, width: res.width, height: res.height })
      });
      results.push({ name: t.out, width: res.width, height: res.height });
    } else {
      const halfW = Math.floor(img.width / 2);
      const leftRes = keyOutGrey(img, { x: 0, y: 0, w: halfW, h: img.height }, !!t.maskText);
      await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: t.outLeft, dataUrl: leftRes.dataUrl, width: leftRes.width, height: leftRes.height })
      });
      results.push({ name: t.outLeft, width: leftRes.width, height: leftRes.height });

      const rightRes = keyOutGrey(img, { x: halfW, y: 0, w: img.width - halfW, h: img.height }, !!t.maskText);
      await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: t.outRight, dataUrl: rightRes.dataUrl, width: rightRes.width, height: rightRes.height })
      });
      results.push({ name: t.outRight, width: rightRes.width, height: rightRes.height });
    }
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results })
  });
}

run().catch(err => {
  fetch('/done', { method: 'POST', body: JSON.stringify({ error: String(err) }) });
});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.method === 'GET' && req.url.startsWith('/source/')) {
    const file = path.join(sourceDir, path.basename(req.url));
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(fs.readFileSync(file));
    } else {
      res.writeHead(404);
      res.end();
    }
  } else if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const payload = JSON.parse(body);
      const base64 = payload.dataUrl.replace(/^data:image\/png;base64,/, '');
      const outPath = path.join(processedDir, payload.filename);
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved processed PNG:', payload.filename, payload.width + 'x' + payload.height);
      res.writeHead(200);
      res.end('ok');
    });
  } else if (req.method === 'POST' && req.url === '/done') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('Extraction complete:', body);
      res.writeHead(200);
      res.end('ok');
      setTimeout(() => process.exit(0), 200);
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  console.log('Extractor server listening on port', port);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `http://127.0.0.1:${port}/`
  ]);
  proc.on('error', err => {
    console.error('Chrome error:', err);
    process.exit(1);
  });
});
