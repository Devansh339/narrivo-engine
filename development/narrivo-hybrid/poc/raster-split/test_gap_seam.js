const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const img = new Image(); img.src = '/fg.png';
  await new Promise(r => { img.onload = r; if (img.complete) r(); });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  
  // Proposed seams:
  // leftFlank:
  // [268, 222], [266, 260], [268, 305], [272, 350], [274, 385],
  // [270, 415], [262, 450], [255, 480], [250, 510], [246, 550], [245, 600], [240, 640], [240, 840]
  
  // rightFlank:
  // [500, 222], [502, 260], [500, 305], [496, 350], [494, 385],
  // [498, 415], [512, 450], [520, 480], [524, 510], [527, 550], [528, 600], [540, 640], [540, 840]
  
  function evalX(pts, y) {
    if (y <= pts[0][1]) return pts[0][0];
    for (let i = 0; i < pts.length - 1; i++) {
      if (y >= pts[i][1] && y <= pts[i+1][1]) {
        const t = (y - pts[i][1]) / (pts[i+1][1] - pts[i][1]);
        return pts[i][0] + t * (pts[i+1][0] - pts[i][0]);
      }
    }
    return pts[pts.length - 1][0];
  }
  
  const leftPts = [
    [268, 222], [266, 260], [268, 305], [272, 350], [274, 385],
    [270, 415], [262, 450], [255, 480], [250, 510], [246, 550], [245, 600],
    [236, 640], [234, 760], [230, 810], [230, 840]
  ];
  const rightPts = [
    [500, 222], [502, 260], [500, 305], [496, 350], [494, 385],
    [498, 415], [512, 450], [520, 480], [524, 510], [527, 550], [528, 600],
    [544, 640], [546, 760], [550, 810], [550, 840]
  ];
  
  const report = [];
  for (let y = 520; y <= 840; y += 10) {
    const lx = Math.round(evalX(leftPts, y));
    const rx = Math.round(evalX(rightPts, y));
    const lAlpha = data[(y * img.width + lx) * 4 + 3];
    const rAlpha = data[(y * img.width + rx) * 4 + 3];
    report.push({ y, lx, lAlpha, rx, rAlpha });
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(report) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/fg.png') res.end(fs.readFileSync(rootDir + '/fullbody-seg/fullframe/00_full_master_foreground.png'));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      const data = JSON.parse(b);
      console.log('Seam alpha at each y:');
      data.forEach(d => console.log(`y=${d.y}: Left(x=${d.lx}, alpha=${d.lAlpha}) | Right(x=${d.rx}, alpha=${d.rAlpha})`));
      res.end(); process.exit(0);
    });
  }
});
server.listen(9009, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9009/'
  ]);
});
