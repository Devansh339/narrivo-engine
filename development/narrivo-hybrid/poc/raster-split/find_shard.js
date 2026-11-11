const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'fullbody-seg', 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html><body><canvas id='c'></canvas><script>
async function test() {
  const manifest = ${JSON.stringify(manifest)};
  const results = {};
  for (const c of manifest.components) {
    const img = new Image();
    img.src = '/rec/' + c.key + '.png';
    await new Promise(r => { img.onload = r; img.onerror = r; if (img.complete) r(); });

    const cvs = document.createElement('canvas');
    cvs.width = 768; cvs.height = 1376;
    const ctx = cvs.getContext('2d');
    
    ctx.save();
    if (c.key === '09_hand_left') {
      const shld = manifest.components.find(x => x.key === '07_upper_arm_left').pivotMaster;
      const elb = manifest.components.find(x => x.key === '08_forearm_left').pivotMaster;
      const wrt = c.pivotMaster;
      ctx.translate(shld.x, shld.y); ctx.rotate(1.5 * Math.PI / 180); ctx.translate(-shld.x, -shld.y);
      ctx.translate(elb.x, elb.y); ctx.rotate(6 * Math.PI / 180); ctx.translate(-elb.x, -elb.y);
      ctx.translate(wrt.x, wrt.y); ctx.rotate(2 * Math.PI / 180); ctx.translate(-wrt.x, -wrt.y);
    } else if (c.key === '08_forearm_left') {
      const shld = manifest.components.find(x => x.key === '07_upper_arm_left').pivotMaster;
      const elb = c.pivotMaster;
      ctx.translate(shld.x, shld.y); ctx.rotate(1.5 * Math.PI / 180); ctx.translate(-shld.x, -shld.y);
      ctx.translate(elb.x, elb.y); ctx.rotate(6 * Math.PI / 180); ctx.translate(-elb.x, -elb.y);
    } else if (c.key === '07_upper_arm_left') {
      const shld = c.pivotMaster;
      ctx.translate(shld.x, shld.y); ctx.rotate(1.5 * Math.PI / 180); ctx.translate(-shld.x, -shld.y);
    }
    ctx.drawImage(img, c.cropBox.x, c.cropBox.y);
    ctx.restore();
    
    // Check pixel presence in shard region: x=190..235, y=690..780
    const d = ctx.getImageData(190, 690, 45, 90).data;
    let count = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] > 20) count++;
    }
    if (count > 0) results[c.key] = count;
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(results) });
}
test();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, {'Content-Type':'text/html'}); res.end(html); }
  else if (req.url.startsWith('/rec/')) {
    res.writeHead(200, {'Content-Type':'image/png'});
    res.end(fs.readFileSync(path.join(rootDir, 'fullbody-seg', 'reconstructed', path.basename(req.url))));
  }
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      console.log('Components with pixels in shard region (x=190..235, y=690..780):', JSON.parse(b));
      res.end(); process.exit(0);
    });
  }
});
server.listen(8997, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:8997/'
  ]);
});
