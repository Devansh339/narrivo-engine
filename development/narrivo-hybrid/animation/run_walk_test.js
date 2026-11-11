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

  // Test Walk with Sagittal Perspective & Foot Lift:
  function getWalkSagittal(phase) {
    const p = JSON.parse(JSON.stringify(def));
    const phiL = phase * 2 * Math.PI;
    const phiR = phiL + Math.PI;

    // Pelvic bob (down at contact, up at passing)
    const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    p.pelvis.ty = -4.5 * bob;
    const lateral = Math.sin(phiL);
    p.pelvis.tx = lateral * 3.0; // shifts toward stance leg
    p.pelvis.rot = lateral * 1.5;

    p.torso.rot = -p.pelvis.rot * 0.7;
    p.torso.ty = p.pelvis.ty * 0.25;
    p.head.rot = -p.torso.rot * 0.8;

    // Leg dynamics:
    // Left leg swing phase: when sin(phiL) > 0
    const swingL = Math.max(0, Math.sin(phiL));
    const swingR = Math.max(0, Math.sin(phiR));

    // Stance leg: firmly planted, hip angle matches pelvic tilt
    p.hipL.rot = -lateral * 1.2;
    p.hipR.rot = -lateral * 1.2;

    // Swing leg knee lift (vertical translation, zero coronal shearing!):
    // When swinging, knee and boot lift upward off ground:
    p.kneeL = p.kneeL || { rot: 0 };
    p.kneeR = p.kneeR || { rot: 0 };
    p.bootL = p.bootL || { rot: 0 };
    p.bootR = p.bootR || { rot: 0 };

    p.hipL.ty = -swingL * 6.0;   // thigh lifts 6px
    p.kneeL.ty = -swingL * 10.0; // knee lifts another 10px
    p.bootL.ty = -swingL * 16.0; // boot lifts 16px off floor!

    p.hipR.ty = -swingR * 6.0;
    p.kneeR.ty = -swingR * 10.0;
    p.bootR.ty = -swingR * 16.0;

    // Slight scale in perspective (forward step is slightly larger)
    p.hipL.scaleY = 1.0 - swingL * 0.03;
    p.hipR.scaleY = 1.0 - swingR * 0.03;

    // Opposing arm swing:
    p.shldL.rot = -Math.sin(phiL) * 6.5;
    p.shldR.rot = -Math.sin(phiR) * 6.5;
    p.shldL.ty = -Math.abs(Math.sin(phiL)) * 1.5;
    p.shldR.ty = -Math.abs(Math.sin(phiR)) * 1.5;

    const armFwdL = Math.max(0, -Math.sin(phiL));
    const armFwdR = Math.max(0, -Math.sin(phiR));
    p.elbL.rot = armFwdL * 12.0;
    p.elbR.rot = -armFwdR * 12.0;

    p.wrtL.rot = -Math.cos(phiL) * 3.0;
    p.wrtR.rot = -Math.cos(phiR) * 3.0;

    return p;
  }

  const p1 = getWalkSagittal(0.25); // peak left swing
  const p2 = getWalkSagittal(0.50); // passing / contact
  const p3 = getWalkSagittal(0.75); // peak right swing
  const p4 = getWalkSagittal(1.00); // passing / contact

  const tests = [
    { name: 'walk_sagittal_peakL.jpg', pose: p1 },
    { name: 'walk_sagittal_passL.jpg', pose: p2 },
    { name: 'walk_sagittal_peakR.jpg', pose: p3 },
    { name: 'walk_sagittal_passR.jpg', pose: p4 }
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

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9019');
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

server.listen(9019, () => {
  console.log('Test server on 9019...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9019/'
  ]);
});
