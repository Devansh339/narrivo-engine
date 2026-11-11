const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html>
<html>
<body>
<canvas id='c'></canvas>
<script>
async function run() {
  const imgThigh = new Image();
  imgThigh.src = '/thigh.png';
  await new Promise(r => imgThigh.onload = r);
  const cvs = document.getElementById('c');
  cvs.width = imgThigh.width; cvs.height = imgThigh.height;
  const ctx = cvs.getContext('2d');
  ctx.drawImage(imgThigh, 0, 0);
  const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;

  // Thigh cropBox is x=200, y=651
  const report = [];
  for (let my of [660, 700, 740, 780, 820]) {
    const ly = my - 651;
    let segs = [];
    let cur = null;
    for (let lx = 0; lx < cvs.width; lx++) {
      const idx = (ly * cvs.width + lx) * 4;
      const op = data[idx+3] > 50;
      if (!cur) cur = { op, start: lx + 200, end: lx + 200 };
      else if (cur.op === op) cur.end = lx + 200;
      else { segs.push(cur); cur = { op, start: lx + 200, end: lx + 200 }; }
    }
    if (cur) segs.push(cur);
    report.push({ masterY: my, segs });
  }

  await fetch('/done', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(report) });
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, {'Content-Type':'text/html'}); res.end(html); }
  else if (req.url === '/thigh.png') { res.writeHead(200, {'Content-Type':'image/png'}); res.end(fs.readFileSync(rootDir + '/fullbody-seg/visible/10_upper_leg_left.png')); }
  else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const rep = JSON.parse(body);
      console.log('--- LEFT THIGH HORIZONTAL SEGMENTS (Master coords) ---');
      for (const r of rep) {
        console.log(`y=${r.masterY}: ` + r.segs.map(s => (s.op ? '[THIGH_FABRIC:' : '[TRANSPARENT_HOLE:') + s.start + '..' + s.end + ']').join(' '));
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
