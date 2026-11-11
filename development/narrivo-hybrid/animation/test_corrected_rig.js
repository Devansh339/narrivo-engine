const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const testDir = path.join(rootDir, 'renders', 'test_corrected');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#000;margin:0;">
<canvas id="c" width="1080" height="1920"></canvas>
<script src="/engine_corrected.js"></script>
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

  const poses = [
    { name: '01_idle_neutral', pose: VanceEngine.evaluateIdle(1.6) },
    { name: '02_walk_stride_left', pose: VanceEngine.evaluateWalk(0.27) },
    { name: '03_walk_stride_right', pose: VanceEngine.evaluateWalk(0.81) },
    { name: '04_gesture_pointing', pose: VanceEngine.evaluateGesture('pointing', 1.0) },
    { name: '05_gesture_waving', pose: VanceEngine.evaluateGesture('waving', 1.0) },
    { name: '06_gesture_open_palms', pose: VanceEngine.evaluateGesture('open_palms', 1.0) },
    { name: '07_gesture_thinking', pose: VanceEngine.evaluateGesture('thinking', 1.0) },
    { name: '08_gesture_hands_on_hips', pose: VanceEngine.evaluateGesture('hands_on_hips', 1.0) },
    { name: '09_gesture_arms_crossed', pose: VanceEngine.evaluateGesture('arms_crossed', 1.0) }
  ];

  for (const item of poses) {
    renderer.render(ctx, item.pose, { width: 1080, height: 1920, is1080: true, background: 'studio' });
    await fetch('/save?name=' + item.name + '.jpg', {
      method: 'POST',
      body: cvs.toDataURL('image/jpeg', 0.92)
    });
  }

  await fetch('/done', { method: 'POST' });
}
run();
</script>
</body>
</html>`;

// Create experimental engine with corrected kinematics
let engineSrc = fs.readFileSync(path.join(rootDir, 'engine.js'), 'utf8');

// Replace evaluateWalk with corrected frontal walk kinematics:
const correctedWalkFn = `
  function evaluateWalk(timeSec) {
    const p = createDefaultPose();

    // Locomotion cadence: 1.08 seconds per full stride cycle (approx 111 steps/min)
    const stridePeriod = 1.08;
    const phase = (timeSec % stridePeriod) / stridePeriod; // 0.0 to 1.0
    const phiL = phase * 2 * Math.PI;
    const phiR = phiL + Math.PI;

    // Pelvic Kinematics:
    // Vertical bob: reaches lowest point at heel strike (0.0, 0.5), peak at passing (0.25, 0.75)
    // Keep bob subtle (-2.5px native = -3.5px in 1080p) so character stays solidly grounded:
    const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    p.pelvis.ty = -2.8 * bob;

    // Lateral weight transfer toward supporting stance leg:
    const lateralSway = Math.sin(phiL);
    p.pelvis.tx  = lateralSway * 1.8;
    p.pelvis.rot = lateralSway * 0.8;

    // Upper Torso Counter-Balance:
    p.torso.rot = -p.pelvis.rot * 0.7;
    p.torso.ty  = p.pelvis.ty * 0.25;

    // Head Stabilization (Gaze remains horizontal and focused):
    p.head.rot = -p.torso.rot * 0.75;
    p.neck.rot = -p.torso.rot * 0.35;

    // FRONTAL LEG KINEMATICS (Strictly prevent lateral splay & preserve knee/ankle seams):
    // In frontal bipedal walking, hip coronal rotation is very subtle (+/- 1.8 deg):
    p.hipL.rot = Math.sin(phiL) * 1.8;
    p.hipR.rot = Math.sin(phiR) * 1.8;

    // Subtle vertical knee/leg lift on the forward-swinging recovery leg:
    const swingL = Math.max(0, -Math.sin(phiL));
    const swingR = Math.max(0, -Math.sin(phiR));

    p.hipL.ty = -swingL * 3.2;
    p.hipR.ty = -swingR * 3.2;

    // Knee flexion during swing: subtle (-4.5 deg max) staying well within the 26px knee overlap dome:
    p.kneeL.rot = -(swingL * 4.5);
    p.kneeR.rot = -(swingR * 4.5);

    // Boot ankle rotation: stay planar (0 deg) to guarantee zero horizontal ankle slits:
    p.bootL.rot = 0;
    p.bootR.rot = 0;

    // Opposing Arm Swing (Arm swings counter to corresponding leg stride):
    // Kept within +/- 5.0 deg so upper sleeves never detach from shoulder armscye:
    p.shldL.rot = -Math.sin(phiL) * 4.8;
    p.shldR.rot = -Math.sin(phiR) * 4.8;

    // Forearm subtle forward flexion on forward swing:
    const armFwdL = Math.max(0, -Math.sin(phiL));
    const armFwdR = Math.max(0, -Math.sin(phiR));
    p.elbL.rot = armFwdL * 6.5;
    p.elbR.rot = -armFwdR * 6.5;

    // Natural wrist lag:
    p.wrtL.rot = -Math.cos(phiL) * 1.5;
    p.wrtR.rot = -Math.cos(phiR) * 1.5;

    return p;
  }
`;

// Replace evaluateGesture with corrected, anatomically verified gestures:
const correctedGestureFn = `
  function evaluateGesture(gestureName, timeSec) {
    const p = createDefaultPose();
    const breath = Math.sin(timeSec * 2) * 0.5 + 0.5;
    p.torso.scaleY = 1.0 + 0.005 * breath;

    switch (gestureName) {
      case 'pointing':
        // Assertive forward/target pointing:
        // Right shoulder elevates slightly (-3.5 deg, ty: -2px) staying connected to torso:
        p.shldR.rot = -3.5;
        p.shldR.ty  = -2.0;
        // Right forearm extends forward and points toward target:
        p.elbR.rot  = -8.0;
        p.wrtR.rot  = -4.0;
        // Head and neck turn purposefully toward direction of point:
        p.head.rot  = -2.8;
        p.neck.rot  = -1.6;
        p.torso.rot = -0.8;
        // Left arm remains disciplined at side:
        p.shldL.rot = +1.0;
        break;

      case 'waving':
        // High, friendly greeting wave within safe frame boundaries:
        // Right upper arm raises moderately (-10 deg) staying anchored at shoulder:
        p.shldR.rot = -10.0;
        p.shldR.ty  = -2.5;
        // Right forearm flexes UPWARD beside head (-115 deg counter-clockwise):
        p.elbR.rot  = -112.0;
        // Oscillating 2.0 Hz wrist wave:
        p.wrtR.rot  = Math.sin(timeSec * 4.0 * Math.PI) * 14.0;
        // Pleasant sympathetic head tilt:
        p.head.rot  = +2.5;
        p.neck.rot  = +1.2;
        p.shldL.rot = +1.2;
        p.armsInFront = true;
        break;

      case 'open_palms':
        // Natural welcoming / explanatory posture:
        // Both upper arms articulate slightly outward:
        p.shldL.rot = +4.5;
        p.shldR.rot = -4.5;
        // Forearms articulate outward in open stance:
        p.elbL.rot  = +8.5;
        p.elbR.rot  = -8.5;
        p.wrtL.rot  = +5.0;
        p.wrtR.rot  = -5.0;
        p.torso.scaleX = 1.012;
        p.head.rot  = +0.6;
        break;

      case 'thinking':
        // Classic contemplative pose: hand touches chin/jawline:
        // Right upper arm raises and supports:
        p.shldR.rot = +6.0;
        p.shldR.ty  = -3.0;
        // Right forearm flexes UP and INWARD toward chin (+128 deg clockwise):
        p.elbR.rot  = +126.0;
        p.wrtR.rot  = +12.0;
        // Left arm crosses across waist to support right elbow:
        p.shldL.rot = -6.5;
        p.elbL.rot  = -32.0;
        p.wrtL.rot  = -6.0;
        // Contemplative head tilt:
        p.head.rot  = +3.5;
        p.neck.rot  = +1.8;
        p.armsInFront = true;
        break;

      case 'hands_on_hips':
        // Confident grounded stance with hands resting on waistband:
        // Upper arms abducted slightly with elbows flared:
        p.shldL.rot = +8.0;
        p.shldR.rot = -8.0;
        // Forearms flexed inward toward belt:
        p.elbL.rot  = -42.0;
        p.elbR.rot  = +42.0;
        // Hands cupped at iliac crest / belt:
        p.wrtL.rot  = -18.0;
        p.wrtR.rot  = +18.0;
        p.torso.scaleY = 1.010;
        p.armsInFront = true;
        break;

      case 'arms_crossed':
        // Authoritative folded arms genuinely crossing over tactical chest harness:
        // Both upper arms fold inward across chest:
        p.shldL.rot = -10.0;
        p.shldR.rot = +10.0;
        // Both forearms fold horizontally across chest harness:
        p.elbL.rot  = -68.0;
        p.elbR.rot  = +68.0;
        p.wrtL.rot  = -8.0;
        p.wrtR.rot  = +8.0;
        p.head.rot  = -1.5;
        p.neck.rot  = -0.8;
        p.armsInFront = true;
        break;
    }

    return p;
  }
`;

engineSrc = engineSrc.replace(/function evaluateWalk\(timeSec\) \{[\s\S]*?return p;\s*\}/, correctedWalkFn.trim());
engineSrc = engineSrc.replace(/function evaluateGesture\(gestureName, timeSec\) \{[\s\S]*?return p;\s*\}/, correctedGestureFn.trim());

engineSrc = engineSrc.replace(
  /\/\/ 1080x1920 Viewport Scaling[\s\S]*?ctx\.scale\(scale, scale\);\s*\}/,
  `// 1080x1920 Viewport Scaling
      if (is1080) {
        // Full character height in native coords is y=26 to y=1349 (1323px).
        // Target character height in 1920p is 1720px, giving 90px top margin and 110px bottom margin.
        const scale = 1720 / 1323; // approx 1.300
        const dx = (1080 - 768 * scale) / 2;
        const dy = 80 - 26 * scale; // align hair top at y=80px
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);
      }`
);

fs.writeFileSync(path.join(rootDir, 'engine_corrected.js'), engineSrc);
fs.writeFileSync(path.join(rootDir, 'test_corrected.html'), html);

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9013');
  const pathname = urlObj.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (pathname === '/engine_corrected.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(fs.readFileSync(path.join(rootDir, 'engine_corrected.js')));
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
      console.log('Saved corrected test image:', name);
      res.writeHead(200); res.end('ok');
    });
  } else if (pathname === '/done') {
    res.writeHead(200); res.end('ok');
    console.log('All corrected test images saved!');
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  }
});

server.listen(9013, () => {
  console.log('Testing server on 9013...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9013/'
  ]);
});
