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
  img.src = '/art.png';
  await new Promise(r => img.onload = r);

  const w = img.width, h = img.height;
  const cvs = document.getElementById('c');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Each card is ~348x624 on the strip (which is width=1920)
  // Let's verify that the image loaded properly and canvas has expected dimensions
  const report = {
    width: w,
    height: h,
    nonBlackPixels: 0
  };

  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) report.nonBlackPixels++;
  }

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
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
  } else if (req.url === '/art.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync(rootDir + '/renders/fullbody_articulation_test.png'));
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      console.log('ARTICULATION TEST SCREENSHOT CHECK:', body);
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
