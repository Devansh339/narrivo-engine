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
  const imgMaster = new Image();
  imgMaster.src = '/master.jpg';
  await new Promise(r => imgMaster.onload = r);

  const imgNeutral = new Image();
  imgNeutral.src = '/neutral.png';
  await new Promise(r => imgNeutral.onload = r);

  const w = imgMaster.width, h = imgMaster.height;
  const cvs = document.getElementById('c');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');

  ctx.drawImage(imgMaster, 0, 0);
  const rawM = ctx.getImageData(0, 0, w, h).data;

  ctx.drawImage(imgNeutral, 0, 0);
  const rawN = ctx.getImageData(0, 0, w, h).data;

  let sampleDiffs = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dr = Math.abs(rawM[idx] - rawN[idx]);
      const dg = Math.abs(rawM[idx+1] - rawN[idx+1]);
      const db = Math.abs(rawM[idx+2] - rawN[idx+2]);
      if (Math.max(dr, dg, db) > 2) {
        if (sampleDiffs.length < 30) {
          sampleDiffs.push({ x, y, m: [rawM[idx], rawM[idx+1], rawM[idx+2]], n: [rawN[idx], rawN[idx+1], rawN[idx+2]] });
        }
      }
    }
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleDiffs })
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
  } else if (req.url === '/neutral.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync(rootDir + '/fullbody-seg/fullframe/01_reassembled_full_neutral.png'));
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const p = JSON.parse(body);
      console.log('Sample diffs (first 30):', JSON.stringify(p.sampleDiffs, null, 2));
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
