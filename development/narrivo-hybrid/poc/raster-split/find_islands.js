const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const compKeys = ['09_hand_left', '09_hand_right', '08_forearm_left', '08_forearm_right', '10_upper_leg_left', '10_upper_leg_right', '06_jacket_torso'];
  const manifest = JSON.parse(await (await fetch('/manifest.json')).text());
  const report = {};
  for (const k of compKeys) {
    const cMeta = manifest.components.find(x => x.key === k);
    const img = new Image(); img.src = '/vis/' + k + '.png';
    await new Promise(r => { img.onload = r; if (img.complete) r(); });
    const cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    
    // Find connected components (islands)
    const w = img.width, h = img.height;
    const visited = new Uint8Array(w * h);
    const islands = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (data[p * 4 + 3] > 20 && !visited[p]) {
          // flood fill island
          const q = [p];
          visited[p] = 1;
          let count = 0;
          let minX = x, maxX = x, minY = y, maxY = y;
          let rSum = 0, gSum = 0, bSum = 0;
          let head = 0;
          while (head < q.length) {
            const curr = q[head++];
            count++;
            const cx = curr % w, cy = (curr - cx) / w;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            const idx = curr * 4;
            rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2];
            
            const nbs = [curr - 1, curr + 1, curr - w, curr + w];
            for (const nb of nbs) {
              if (nb >= 0 && nb < w * h) {
                const nX = nb % w;
                if (Math.abs(nX - cx) <= 1 && data[nb * 4 + 3] > 20 && !visited[nb]) {
                  visited[nb] = 1;
                  q.push(nb);
                }
              }
            }
          }
          islands.push({
            count,
            bboxLocal: { minX, maxX, minY, maxY },
            bboxMaster: { minX: minX + cMeta.cropBox.x, maxX: maxX + cMeta.cropBox.x, minY: minY + cMeta.cropBox.y, maxY: maxY + cMeta.cropBox.y },
            avgColor: [Math.round(rSum/count), Math.round(gSum/count), Math.round(bSum/count)]
          });
        }
      }
    }
    islands.sort((a,b) => b.count - a.count);
    report[k] = { totalIslands: islands.length, mainSize: islands[0] ? islands[0].count : 0, smallIslands: islands.filter(is => is.count < 1000) };
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(report) });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/manifest.json') res.end(fs.readFileSync(rootDir + '/fullbody-seg/manifest.json'));
  else if (req.url.startsWith('/vis/')) res.end(fs.readFileSync(rootDir + '/fullbody-seg/visible/' + path.basename(req.url)));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      fs.writeFileSync(rootDir + '/island_report.json', b);
      console.log('Saved island_report.json');
      res.end(); process.exit(0);
    });
  }
});
server.listen(9007, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9007/'
  ]);
});
