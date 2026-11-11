const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'source', '00_master_full_body.jpg');
const fgFile = path.join(rootDir, 'fullbody-seg', 'fullframe', '00_full_master_foreground.png');

const html = `<!DOCTYPE html>
<html>
<body>
<script>
async function run() {
  const imgMaster = new Image();
  imgMaster.src = '/master.jpg';
  await new Promise(r => imgMaster.onload = r);

  const imgFg = new Image();
  imgFg.src = '/fg.png';
  await new Promise(r => imgFg.onload = r);

  const w = imgMaster.width, h = imgMaster.height;
  const cMaster = document.createElement('canvas');
  cMaster.width = w; cMaster.height = h;
  const ctxM = cMaster.getContext('2d');
  ctxM.drawImage(imgMaster, 0, 0);
  const rawM = ctxM.getImageData(0, 0, w, h).data;

  const cFg = document.createElement('canvas');
  cFg.width = w; cFg.height = h;
  const ctxF = cFg.getContext('2d');
  ctxF.drawImage(imgFg, 0, 0);
  const rawF = ctxF.getImageData(0, 0, w, h).data;

  const bgR = rawM[40], bgG = rawM[41], bgB = rawM[42];

  function isGrey(r, g, b) {
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    return sat < 14 && dist < 36;
  }

  // Find all pixels in rawF (foreground) that have alpha > 100 AND match grey background!
  let greyInFgCount = 0;
  const greyBoundingBoxes = [];
  const greyMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const idx = p * 4;
      if (rawF[idx + 3] > 100) {
        const r = rawF[idx], g = rawF[idx + 1], b = rawF[idx + 2];
        if (isGrey(r, g, b)) {
          greyInFgCount++;
          greyMap[p] = 1;
        }
      }
    }
  }

  // Find connected components of greyMap
  const visited = new Uint8Array(w * h);
  const components = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (greyMap[p] && !visited[p]) {
        let count = 0;
        let minX = x, maxX = x, minY = y, maxY = y;
        const q = [p];
        visited[p] = 1;
        let head = 0;
        while (head < q.length) {
          const cp = q[head++];
          count++;
          const cx = cp % w, cy = (cp - cx) / w;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          const neighbors = [cp - 1, cp + 1, cp - w, cp + w];
          for (const np of neighbors) {
            if (np >= 0 && np < w * h && greyMap[np] && !visited[np]) {
              visited[np] = 1;
              q.push(np);
            }
          }
        }
        if (count > 20) {
          components.push({ count, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 });
        }
      }
    }
  }

  // Also inspect what is inside fullbody_articulation_test canvas!
  // Send findings
  await fetch('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bgR, bgG, bgB,
      greyInFgCount,
      components
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
  } else if (req.url === '/fg.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync(fgFile));
  } else if (req.url === '/report' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const rep = JSON.parse(body);
      console.log('--- GREY IN FOREGROUND REPORT ---');
      console.log('Total grey pixels in foreground:', rep.greyInFgCount);
      console.log('Connected grey components in foreground (>20 px):', JSON.stringify(rep.components, null, 2));
      res.writeHead(200);
      res.end('ok');
      setTimeout(() => process.exit(0), 100);
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', `http://127.0.0.1:${port}/`]);
});
