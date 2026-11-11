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
  
  // Let's sample colors in the left hand region: y=640..830, x=140..270
  // Specifically, what is the boundary between the hand (skin/glove) and the olive cargo fabric?
  const samples = [];
  for (let y = 640; y <= 830; y += 20) {
    const row = [];
    for (let x = 160; x <= 270; x += 5) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      // olive fabric: green is higher or close to red, b is low (e.g. r=80, g=85, b=65)
      // skin: red is much higher than green and blue (r=180, g=130, b=100)
      // leather glove: dark brown (r=60, g=45, b=35)
      row.push({ x, r: p[0], g: p[1], b: p[2] });
    }
    samples.push({ y, row });
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(samples) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/img') res.end(fs.readFileSync(path.join(rootDir, 'source', '00_master_full_body.jpg')));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      const data = JSON.parse(b);
      console.log('Sampled pixels across hand/thigh interface:');
      for (const s of data) {
        console.log(`y=${s.y}:`);
        console.log(s.row.map(r => `x=${r.x}:(${r.r},${r.g},${r.b})`).join(' '));
      }
      res.end(); process.exit(0);
    });
  }
});
server.listen(9004, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9004/'
  ]);
});
