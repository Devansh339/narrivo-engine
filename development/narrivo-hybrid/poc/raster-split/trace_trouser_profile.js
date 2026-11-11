const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <canvas id='c'></canvas>
      <script>
      const img = new Image();
      img.src = '/img';
      img.onload = () => {
        const c = document.getElementById('c');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        const profile = [];
        for (let y = 600; y <= 940; y += 10) {
          let leftMinX = 999, leftMaxX = 0;
          let rightMinX = 999, rightMaxX = 0;
          // left leg
          for (let x = 140; x < 380; x++) {
            const idx = (y * img.width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            if (Math.abs(r - 122) > 10 || Math.abs(g - 122) > 10 || Math.abs(b - 122) > 10) {
              if (x < leftMinX) leftMinX = x;
              if (x > leftMaxX) leftMaxX = x;
            }
          }
          // right leg
          for (let x = 380; x < 620; x++) {
            const idx = (y * img.width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            if (Math.abs(r - 122) > 10 || Math.abs(g - 122) > 10 || Math.abs(b - 122) > 10) {
              if (x < rightMinX) rightMinX = x;
              if (x > rightMaxX) rightMaxX = x;
            }
          }
          profile.push({ y, leftMinX, leftMaxX, rightMinX, rightMaxX });
        }
        fetch('/done', { method: 'POST', body: JSON.stringify(profile) });
      };
      </script>
    `);
  } else if (req.url === '/img') {
    res.writeHead(200, {'Content-Type': 'image/jpeg'});
    res.end(fs.readFileSync(path.join(rootDir, 'source', '00_master_full_body.jpg')));
  } else if (req.url === '/done') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      const data = JSON.parse(b);
      console.log('Outer silhouette profile from y=600 to 940:');
      data.forEach(d => console.log(`y=${d.y}: left=[${d.leftMinX}..${d.leftMaxX}] right=[${d.rightMinX}..${d.rightMaxX}]`));
      res.end();
      process.exit(0);
    });
  }
});
server.listen(8993, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:8993/'
  ]);
});
