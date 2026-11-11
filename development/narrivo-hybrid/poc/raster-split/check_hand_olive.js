const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const img = new Image(); img.src = '/hand.png';
  await new Promise(r => { img.onload = r; if (img.complete) r(); });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let olive = 0;
  const olivePts = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const idx = (y * c.width + x) * 4;
      if (data[idx+3] > 50) {
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        if (g > r - 15 && g > b + 15 && g > 40 && g < 130) {
          olive++;
          if (olivePts.length < 20) olivePts.push({ lx: x, ly: y, mx: x + 139, my: y + 626, r, g, b });
        }
      }
    }
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify({ olive, olivePts }) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/hand.png') res.end(fs.readFileSync(rootDir + '/fullbody-seg/reconstructed/09_hand_left.png'));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      console.log('Hand left olive pixels:', JSON.parse(b));
      res.end(); process.exit(0);
    });
  }
});
server.listen(9005, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9005/'
  ]);
});
