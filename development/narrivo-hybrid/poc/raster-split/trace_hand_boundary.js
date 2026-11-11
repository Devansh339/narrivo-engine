const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const img = new Image(); img.src = '/img';
  await new Promise(r => { img.onload = r; if (img.complete) r(); });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  
  // Trace inner edge of hand: for each y from 630 to 830, find the maxX of hand pixels
  // In the master artwork, hand pixels are skin (warm/red) or dark leather glove (brown/black)
  // Background canvas is grey: |r-116| < 12 && |g-116| < 12 && |b-116| < 12
  // So hand is between x=140 and the background gap!
  const leftHandMax = [];
  const rightHandMin = [];
  
  for (let y = 630; y <= 830; y += 5) {
    // left hand starts from x=140 outwards to right
    let maxX = 140;
    for (let x = 140; x <= 250; x++) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const isBg = (Math.abs(r - 116) < 14 && Math.abs(g - 116) < 14 && Math.abs(b - 116) < 14);
      if (!isBg) {
        // Check if it's hand (skin or dark glove) rather than olive fabric (g > r - 10)
        const isOlive = (g > r - 15 && g > b + 15 && g > 40 && g < 130);
        if (!isOlive) {
          maxX = x;
        }
      } else {
        // hit background gap!
        if (maxX > 160) break;
      }
    }
    leftHandMax.push({ y, maxX });
    
    // right hand starts from x=620 inwards to left
    let minX = 620;
    for (let x = 620; x >= 510; x--) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const isBg = (Math.abs(r - 116) < 14 && Math.abs(g - 116) < 14 && Math.abs(b - 116) < 14);
      if (!isBg) {
        const isOlive = (g > r - 15 && g > b + 15 && g > 40 && g < 130);
        if (!isOlive) {
          minX = x;
        }
      } else {
        if (minX < 600) break;
      }
    }
    rightHandMin.push({ y, minX });
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify({ leftHandMax, rightHandMin }) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/img') res.end(fs.readFileSync(path.join(rootDir, 'source', '00_master_full_body.jpg')));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      const { leftHandMax, rightHandMin } = JSON.parse(b);
      console.log('--- TRUE HAND BOUNDARIES (Left Hand MaxX, Right Hand MinX) ---');
      leftHandMax.forEach((l, i) => console.log(`y=${l.y}: LeftHandMaxX=${l.maxX} | RightHandMinX=${rightHandMin[i].minX}`));
      res.end(); process.exit(0);
    });
  }
});
server.listen(9006, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9006/'
  ]);
});
