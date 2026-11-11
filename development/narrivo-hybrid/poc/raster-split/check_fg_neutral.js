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
  const imgFg = new Image();
  imgFg.src = '/fg.png';
  await new Promise(r => imgFg.onload = r);

  const imgNeutral = new Image();
  imgNeutral.src = '/neutral.png';
  await new Promise(r => imgNeutral.onload = r);

  const w = imgFg.width, h = imgFg.height;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');

  ctx.drawImage(imgFg, 0, 0);
  const rawFg = ctx.getImageData(0, 0, w, h).data;

  ctx.drawImage(imgNeutral, 0, 0);
  const rawN = ctx.getImageData(0, 0, w, h).data;

  let diffWhereFgZero = 0; // neutral has pixel where fg was 0 (overlap leaked outside)
  let diffWhereFgNonZero = 0; // fg was non-zero and neutral differs
  let sampleLeaks = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dr = Math.abs(rawFg[idx] - rawN[idx]);
      const dg = Math.abs(rawFg[idx+1] - rawN[idx+1]);
      const db = Math.abs(rawFg[idx+2] - rawN[idx+2]);
      const da = Math.abs(rawFg[idx+3] - rawN[idx+3]);
      if (Math.max(dr, dg, db, da) > 0) {
        if (rawFg[idx+3] === 0) {
          diffWhereFgZero++;
          if (sampleLeaks.length < 20) sampleLeaks.push({ x, y, nAlpha: rawN[idx+3] });
        } else {
          diffWhereFgNonZero++;
        }
      }
    }
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffWhereFgZero, diffWhereFgNonZero, sampleLeaks })
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
  } else if (req.url === '/fg.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync(rootDir + '/fullbody-seg/fullframe/00_full_master_foreground.png'));
  } else if (req.url === '/neutral.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync(rootDir + '/fullbody-seg/fullframe/01_reassembled_full_neutral.png'));
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const p = JSON.parse(body);
      console.log('Diff breakdown:', JSON.stringify(p, null, 2));
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
