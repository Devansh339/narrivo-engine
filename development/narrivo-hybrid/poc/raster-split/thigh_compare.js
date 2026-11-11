const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const html = `<!DOCTYPE html><html><body><canvas id='c'></canvas><script>
async function run() {
  const p0 = new Image(); p0.src = '/p0.png';
  const p2 = new Image(); p2.src = '/p2.png';
  await Promise.all([
    new Promise(r => { p0.onload = r; if (p0.complete) r(); }),
    new Promise(r => { p2.onload = r; if (p2.complete) r(); })
  ]);
  const c = document.getElementById('c');
  c.width = 600; c.height = 400;
  const ctx = c.getContext('2d');
  // crop waist/hip/thigh region x=180..380, y=500..900
  // draw p0 on left (0..300), p2 on right (300..600)
  ctx.drawImage(p0, 180, 500, 200, 400, 0, 0, 300, 400);
  ctx.drawImage(p2, 180, 500, 200, 400, 300, 0, 300, 400);
  await fetch('/done', { method: 'POST', body: c.toDataURL() });
}
run();
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') res.end(html);
  else if (req.url === '/p0.png') res.end(fs.readFileSync(rootDir + '/renders/pose0_hires.png'));
  else if (req.url === '/p2.png') res.end(fs.readFileSync(rootDir + '/renders/pose2_hires.png'));
  else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      fs.writeFileSync(rootDir + '/renders/thigh_compare_crop.png', Buffer.from(b.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log('Saved thigh_compare_crop.png');
      res.end(); process.exit(0);
    });
  }
});
server.listen(9003, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9003/'
  ]);
});
