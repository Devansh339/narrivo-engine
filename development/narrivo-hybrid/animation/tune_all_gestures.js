const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const testDir = path.join(rootDir, 'renders', 'pose_tests');

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const testHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#090c12;margin:0;">
<canvas id="c" width="1080" height="1920"></canvas>
<script src="/engine.js"></script>
<script>
async function run() {
  const manifest = ${JSON.stringify(manifest)};
  const imageMap = {};
  await Promise.all(manifest.components.map(c => new Promise(r => {
    const img = new Image();
    img.onload = () => r();
    img.onerror = () => r();
    img.src = '/comp/' + c.key + '.png';
    if (img.complete) r();
    imageMap[c.key] = img;
  })));

  const renderer = new VanceEngine.VanceRenderer(manifest, imageMap);
  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');

  function render(pose) {
    renderer.render(ctx, pose, { is1080: true, background: 'studio' });
    return cvs.toDataURL('image/jpeg', 0.95);
  }

  const def = VanceEngine.createDefaultPose();

  // 1. POINTING CANDIDATES:
  // Candidate A: Right arm extends forward-outward at moderate angle with wrist pointing
  const pointA = JSON.parse(JSON.stringify(def));
  pointA.shldR.rot = -8.0; pointA.shldR.ty = -2.0; pointA.shldR.tx = -1.0;
  pointA.elbR.rot = -28.0; pointA.elbR.tx = -2.0; pointA.elbR.ty = -1.0;
  pointA.wrtR.rot = -36.0;
  pointA.head.rot = -3.2; pointA.neck.rot = -1.8;
  pointA.shldL.rot = +1.0;
  pointA.armsInFront = true;

  // Candidate B: Left arm pointing (for comparison, left arm has clean inner sleeve)
  const pointB = JSON.parse(JSON.stringify(def));
  pointB.shldL.rot = +8.0; pointB.shldL.ty = -2.0; pointB.shldL.tx = +1.0;
  pointB.elbL.rot = +28.0; pointB.elbL.tx = +2.0; pointB.elbL.ty = -1.0;
  pointB.wrtL.rot = +36.0;
  pointB.head.rot = +3.2; pointB.neck.rot = +1.8;
  pointB.shldR.rot = -1.0;
  pointB.armsInFront = true;

  // Candidate C: Right arm pointing forward/center (pointing toward viewer/center)
  const pointC = JSON.parse(JSON.stringify(def));
  pointC.shldR.rot = -3.5; pointC.shldR.ty = -1.5;
  pointC.elbR.rot = +35.0; // bends across lower chest
  pointC.wrtR.rot = +45.0; // hand points directly at viewer/target
  pointC.head.rot = -2.5;
  pointC.armsInFront = true;

  // 2. HANDS ON HIPS CANDIDATES:
  // Candidate A: Hands resting against waistband lateral sides, elbows flared outward
  const hipA = JSON.parse(JSON.stringify(def));
  hipA.shldL.rot = +5.0; hipA.shldL.ty = -1.5;
  hipA.shldR.rot = -5.0; hipA.shldR.ty = -1.5;
  hipA.elbL.rot = -22.0; // elbow flares outward
  hipA.elbR.rot = +22.0; // elbow flares outward
  hipA.wrtL.rot = -28.0; hipA.wrtL.tx = +28.0; hipA.wrtL.ty = -32.0; // hand rests on left hip
  hipA.wrtR.rot = +28.0; hipA.wrtR.tx = -28.0; hipA.wrtR.ty = -32.0; // hand rests on right hip
  hipA.torso.scaleY = 1.008;
  hipA.armsInFront = true;

  // Candidate B: Slightly wider elbow flare
  const hipB = JSON.parse(JSON.stringify(def));
  hipB.shldL.rot = +7.0; hipB.shldL.ty = -1.5;
  hipB.shldR.rot = -7.0; hipB.shldR.ty = -1.5;
  hipB.elbL.rot = -26.0;
  hipB.elbR.rot = +26.0;
  hipB.wrtL.rot = -32.0; hipB.wrtL.tx = +34.0; hipB.wrtL.ty = -38.0;
  hipB.wrtR.rot = +32.0; hipB.wrtR.tx = -34.0; hipB.wrtR.ty = -38.0;
  hipB.torso.scaleY = 1.01;
  hipB.armsInFront = true;

  // 3. ARMS CROSSED CANDIDATES:
  // Candidate A: Upper arms fold slightly inward (+8 deg / -8 deg), forearms fold horizontally across chest harness
  const crossA = JSON.parse(JSON.stringify(def));
  crossA.shldL.rot = +6.0; crossA.shldL.ty = -2.0;
  crossA.shldR.rot = -6.0; crossA.shldR.ty = -2.0;
  crossA.elbL.rot = -58.0; crossA.elbL.tx = +4.0; crossA.elbL.ty = -8.0;
  crossA.elbR.rot = +58.0; crossA.elbR.tx = -4.0; crossA.elbR.ty = -8.0;
  crossA.wrtL.rot = -35.0; crossA.wrtL.tx = +32.0; crossA.wrtL.ty = -18.0;
  crossA.wrtR.rot = +35.0; crossA.wrtR.tx = -32.0; crossA.wrtR.ty = -18.0;
  crossA.head.rot = -1.5; crossA.neck.rot = -0.8;
  crossA.armsInFront = true;

  // Candidate B: Right arm over Left arm across upper harness
  const crossB = JSON.parse(JSON.stringify(def));
  crossB.shldL.rot = +4.0; crossB.shldL.ty = -2.0;
  crossB.shldR.rot = -4.0; crossB.shldR.ty = -2.0;
  crossB.elbL.rot = -52.0; crossB.elbL.tx = +6.0; crossB.elbL.ty = -10.0;
  crossB.elbR.rot = +62.0; crossB.elbR.tx = -6.0; crossB.elbR.ty = -12.0;
  crossB.wrtL.rot = -42.0; crossB.wrtL.tx = +38.0; crossB.wrtL.ty = -22.0;
  crossB.wrtR.rot = +42.0; crossB.wrtR.tx = -38.0; crossB.wrtR.ty = -22.0;
  crossB.head.rot = -1.8;
  crossB.armsInFront = true;

  // 4. OPEN PALMS:
  const openA = JSON.parse(JSON.stringify(def));
  openA.shldL.rot = +6.0; openA.shldL.ty = -1.5;
  openA.shldR.rot = -6.0; openA.shldR.ty = -1.5;
  openA.elbL.rot = +14.0; openA.elbL.tx = +2.0;
  openA.elbR.rot = -14.0; openA.elbR.tx = -2.0;
  openA.wrtL.rot = +16.0; openA.wrtL.tx = +6.0;
  openA.wrtR.rot = -16.0; openA.wrtR.tx = -6.0;
  openA.torso.scaleX = 1.018;
  openA.head.rot = +0.8;

  // 5. WAVING:
  const waveA = JSON.parse(JSON.stringify(def));
  waveA.shldR.rot = -5.0; waveA.shldR.ty = -2.5;
  waveA.elbR.rot = -135.0; waveA.elbR.tx = -10.0; waveA.elbR.ty = -8.0;
  waveA.wrtR.rot = -18.0;
  waveA.head.rot = +2.5; waveA.neck.rot = +1.2;
  waveA.armsInFront = true;

  const poses = [
    { name: 'tune_point_A.jpg', pose: pointA },
    { name: 'tune_point_B.jpg', pose: pointB },
    { name: 'tune_point_C.jpg', pose: pointC },
    { name: 'tune_hip_A.jpg', pose: hipA },
    { name: 'tune_hip_B.jpg', pose: hipB },
    { name: 'tune_cross_A.jpg', pose: crossA },
    { name: 'tune_cross_B.jpg', pose: crossB },
    { name: 'tune_open_A.jpg', pose: openA },
    { name: 'tune_wave_A.jpg', pose: waveA }
  ];

  for (const p of poses) {
    const b64 = render(p.pose);
    await fetch('/save?name=' + p.name, { method: 'POST', body: b64 });
  }

  await fetch('/done');
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9020');
  const pathname = urlObj.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(testHtml);
  } else if (pathname === '/engine.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(fs.readFileSync(path.join(rootDir, 'engine.js')));
  } else if (pathname.startsWith('/comp/')) {
    const fPath = path.join(segDir, 'reconstructed', path.basename(pathname));
    if (fs.existsSync(fPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(fPath));
    } else {
      res.writeHead(404); res.end('not found');
    }
  } else if (pathname === '/save') {
    const name = urlObj.searchParams.get('name');
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const b64 = body.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(testDir, name), Buffer.from(b64, 'base64'));
      console.log('Saved', name);
      res.writeHead(200); res.end('ok');
    });
  } else if (pathname === '/done') {
    res.writeHead(200); res.end('ok');
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  }
});

server.listen(9020, () => {
  console.log('Test server on 9020...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9020/'
  ]);
});
