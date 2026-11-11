const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const testDir = path.join(rootDir, 'renders', 'pose_tests');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9018');
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
    console.log('All poses captured.');
    res.writeHead(200); res.end('ok');
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  }
});

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

  // Test Candidates:

  // 1. POINTING:
  // We need the right arm clearly extended forward-outward towards a target with pointing hand:
  // Shoulder lifts and extends (-18 deg, ty: -3px), elbow slightly bent (-16 deg), wrist points (-35 deg)
  const point1 = JSON.parse(JSON.stringify(def));
  point1.shldR.rot = -18.0; point1.shldR.ty = -3.0; point1.shldR.tx = -1.0;
  point1.elbR.rot = -16.0; point1.elbR.tx = -2.0; point1.elbR.ty = -1.0;
  point1.wrtR.rot = -38.0;
  point1.head.rot = -3.5; point1.neck.rot = -1.8;
  point1.shldL.rot = +1.0;
  point1.armsInFront = true;

  // Point 2: more extended outward-forward pointing (shoulder -26 deg, elbow -12 deg, wrist -42 deg)
  const point2 = JSON.parse(JSON.stringify(def));
  point2.shldR.rot = -26.0; point2.shldR.ty = -4.0; point2.shldR.tx = -2.0;
  point2.elbR.rot = -14.0; point2.elbR.tx = -4.0; point2.elbR.ty = -2.0;
  point2.wrtR.rot = -45.0;
  point2.head.rot = -4.2; point2.neck.rot = -2.2;
  point2.shldL.rot = +1.2;
  point2.armsInFront = true;

  // 2. WAVING:
  // Arm raised beside head, hand clearly waving beside head
  const wave1 = JSON.parse(JSON.stringify(def));
  wave1.shldR.rot = -14.0; wave1.shldR.ty = -3.0; wave1.shldR.tx = -1.0;
  wave1.elbR.rot = -128.0; wave1.elbR.tx = -12.0; wave1.elbR.ty = -10.0;
  wave1.wrtR.rot = -24.0; // wave outward
  wave1.head.rot = +2.5; wave1.neck.rot = +1.5;
  wave1.armsInFront = true;

  const wave2 = JSON.parse(JSON.stringify(def));
  wave2.shldR.rot = -14.0; wave2.shldR.ty = -3.0; wave2.shldR.tx = -1.0;
  wave2.elbR.rot = -128.0; wave2.elbR.tx = -12.0; wave2.elbR.ty = -10.0;
  wave2.wrtR.rot = +16.0; // wave inward
  wave2.head.rot = +2.5; wave2.neck.rot = +1.5;
  wave2.armsInFront = true;

  // 3. OPEN PALMS:
  // Both arms welcoming/explanatory: elbows slightly bent, forearms angled outward, palms open
  const open1 = JSON.parse(JSON.stringify(def));
  open1.shldL.rot = +12.0; open1.shldL.ty = -2.0; open1.shldL.tx = +1.0;
  open1.shldR.rot = -12.0; open1.shldR.ty = -2.0; open1.shldR.tx = -1.0;
  open1.elbL.rot = +16.0; open1.elbL.tx = +2.0; open1.elbL.ty = -2.0;
  open1.elbR.rot = -16.0; open1.elbR.tx = -2.0; open1.elbR.ty = -2.0;
  open1.wrtL.rot = +12.0; open1.wrtR.rot = -12.0;
  open1.torso.scaleX = 1.015;
  open1.head.rot = +0.5;

  // 4. HANDS ON HIPS:
  // Both hands visibly resting against the waist/hip area, with elbows naturally angled outward.
  // Not hanging beside the body!
  // Left arm: shldL flares out (+14 deg), elbL flexes inward (-52 deg), wrtL anchors at hip (tx: +24px, ty: -35px)
  // Right arm: shldR flares out (-14 deg), elbR flexes inward (+52 deg), wrtR anchors at hip (tx: -24px, ty: -35px)
  const hip1 = JSON.parse(JSON.stringify(def));
  hip1.shldL.rot = +14.0; hip1.shldL.ty = -2.0; hip1.shldL.tx = +1.0;
  hip1.shldR.rot = -14.0; hip1.shldR.ty = -2.0; hip1.shldR.tx = -1.0;
  hip1.elbL.rot = -55.0; hip1.elbL.tx = -8.0; hip1.elbL.ty = -6.0;
  hip1.elbR.rot = +55.0; hip1.elbR.tx = +8.0; hip1.elbR.ty = -6.0;
  hip1.wrtL.rot = -25.0; hip1.wrtL.tx = +22.0; hip1.wrtL.ty = -30.0;
  hip1.wrtR.rot = +25.0; hip1.wrtR.tx = -22.0; hip1.wrtR.ty = -30.0;
  hip1.torso.scaleY = 1.01;
  hip1.armsInFront = true;

  // 5. ARMS CROSSED:
  // An unmistakable crossed-arm pose across the chest (not clasped near abdomen).
  // Left forearm folds across chest, right forearm folds over it:
  const cross1 = JSON.parse(JSON.stringify(def));
  cross1.shldL.rot = -8.0; cross1.shldL.ty = -3.0;
  cross1.shldR.rot = +8.0; cross1.shldR.ty = -3.0;
  cross1.elbL.rot = -85.0; cross1.elbL.tx = -10.0; cross1.elbL.ty = -15.0;
  cross1.elbR.rot = +85.0; cross1.elbR.tx = +10.0; cross1.elbR.ty = -15.0;
  cross1.wrtL.rot = -15.0; cross1.wrtL.tx = +15.0; cross1.wrtL.ty = -25.0;
  cross1.wrtR.rot = +15.0; cross1.wrtR.tx = -15.0; cross1.wrtR.ty = -25.0;
  cross1.head.rot = -1.5; cross1.neck.rot = -0.8;
  cross1.armsInFront = true;

  // 6. WALKING ALTERNATING PHASES:
  // Candidate walking with visible knee lift, alternating strides, opposing arm swing
  function getWalkTest(phase) {
    const p = JSON.parse(JSON.stringify(def));
    const phiL = phase * 2 * Math.PI;
    const phiR = phiL + Math.PI;

    // Pelvic vertical cadence & lateral tilt
    const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    p.pelvis.ty  = -5.0 * bob; // visible 5px pelvic bob
    const lateral = Math.sin(phiL);
    p.pelvis.tx  = lateral * 2.8;
    p.pelvis.rot = lateral * 1.8;

    p.torso.rot  = -p.pelvis.rot * 0.7;
    p.torso.ty   = p.pelvis.ty * 0.3;
    p.head.rot   = -p.torso.rot * 0.8;

    // Alternating leg stride:
    // When left leg swings forward (sin(phiL) > 0):
    // Hip extends/rotates forward in perspective:
    const strideL = Math.sin(phiL);
    const strideR = Math.sin(phiR);
    p.hipL.rot   = strideL * 4.5;
    p.hipR.rot   = strideR * 4.5;

    // Knee flexion: during swing phase (when stride > 0), knee bends lifting lower leg:
    const swingL = Math.max(0, strideL);
    const swingR = Math.max(0, strideR);
    p.kneeL.rot  = -(swingL * 14.0); // visible 14 deg knee lift
    p.kneeR.rot  = -(swingR * 14.0);

    // Boot ankle rotation & vertical contact:
    // Stance foot stays flat on ground (ty: 0); swing foot lifts upward:
    p.bootL.rot  = swingL * 8.0;
    p.bootR.rot  = swingR * 8.0;

    // Opposing arm swing:
    p.shldL.rot  = -Math.sin(phiL) * 8.0;
    p.shldR.rot  = -Math.sin(phiR) * 8.0;
    p.shldL.ty   = -Math.abs(Math.sin(phiL)) * 1.5;
    p.shldR.ty   = -Math.abs(Math.sin(phiR)) * 1.5;

    const armFwdL = Math.max(0, -Math.sin(phiL));
    const armFwdR = Math.max(0, -Math.sin(phiR));
    p.elbL.rot   = armFwdL * 12.0;
    p.elbR.rot   = -armFwdR * 12.0;
    p.wrtL.rot   = -Math.cos(phiL) * 4.0;
    p.wrtR.rot   = -Math.cos(phiR) * 4.0;

    return p;
  }

  const walkContactLeft = getWalkTest(0.25);
  const walkPassingLeft = getWalkTest(0.40);
  const walkContactRight = getWalkTest(0.75);
  const walkPassingRight = getWalkTest(0.90);

  const tests = [
    { name: 'test_point1.jpg', pose: point1 },
    { name: 'test_point2.jpg', pose: point2 },
    { name: 'test_wave1.jpg', pose: wave1 },
    { name: 'test_wave2.jpg', pose: wave2 },
    { name: 'test_open1.jpg', pose: open1 },
    { name: 'test_hip1.jpg', pose: hip1 },
    { name: 'test_cross1.jpg', pose: cross1 },
    { name: 'test_walk_contact_L.jpg', pose: walkContactLeft },
    { name: 'test_walk_passing_L.jpg', pose: walkPassingLeft },
    { name: 'test_walk_contact_R.jpg', pose: walkContactRight },
    { name: 'test_walk_passing_R.jpg', pose: walkPassingRight }
  ];

  for (const t of tests) {
    const b64 = render(t.pose);
    await fetch('/save?name=' + t.name, { method: 'POST', body: b64 });
  }

  await fetch('/done');
}
run();
</script>
</body>
</html>`;

server.listen(9018, () => {
  console.log('Test server on 9018...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9018/'
  ]);
});
