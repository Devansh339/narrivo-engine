const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const outDir = path.join(rootDir, 'renders', 'corrected_poses');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

// Test poses for all required states
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9022');
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
      fs.writeFileSync(path.join(outDir, name), Buffer.from(b64, 'base64'));
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
<script>
const deg = d => d * Math.PI / 180;
const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

const PIVOTS = {
  pelvis:     { x: 384, y: 655 },
  torso:      { x: 384, y: 450 },
  neck:       { x: 384, y: 255 },
  head:       { x: 384, y: 185 },
  frontHair:  { x: 384, y: 185 },
  backHair:   { x: 384, y: 155 },
  collarL:    { x: 312, y: 260 },
  collarR:    { x: 456, y: 260 },
  shldL:      { x: 264, y: 260 },
  shldR:      { x: 504, y: 260 },
  elbL:       { x: 214, y: 506 },
  elbR:       { x: 554, y: 506 },
  wrtL:       { x: 215, y: 654 },
  wrtR:       { x: 553, y: 654 },
  hipL:       { x: 348, y: 685 },
  hipR:       { x: 420, y: 685 },
  kneeL:      { x: 344, y: 944 },
  kneeR:      { x: 424, y: 944 },
  bootL:      { x: 345, y: 1125 },
  bootR:      { x: 423, y: 1125 }
};

function createDefaultPose() {
  return {
    pelvis:    { tx: 0, ty: 0, rot: 0, scaleX: 1, scaleY: 1 },
    torso:     { tx: 0, ty: 0, rot: 0, scaleX: 1, scaleY: 1 },
    neck:      { rot: 0 },
    head:      { tx: 0, ty: 0, rot: 0 },
    frontHair: { rot: 0 },
    backHair:  { rot: 0 },
    collarL:   { rot: 0 },
    collarR:   { rot: 0 },
    shldL:     { rot: 0, tx: 0, ty: 0 },
    shldR:     { rot: 0, tx: 0, ty: 0 },
    elbL:      { rot: 0, tx: 0, ty: 0 },
    elbR:      { rot: 0, tx: 0, ty: 0 },
    wrtL:      { rot: 0, tx: 0, ty: 0 },
    wrtR:      { rot: 0, tx: 0, ty: 0 },
    hipL:      { rot: 0, tx: 0, ty: 0, scaleX: 1, scaleY: 1 },
    hipR:      { rot: 0, tx: 0, ty: 0, scaleX: 1, scaleY: 1 },
    kneeL:     { rot: 0, tx: 0, ty: 0 },
    kneeR:     { rot: 0, tx: 0, ty: 0 },
    bootL:     { rot: 0, tx: 0, ty: 0 },
    bootR:     { rot: 0, tx: 0, ty: 0 },
    armsInFront: false
  };
}

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

  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');

  function render(pose) {
    ctx.clearRect(0, 0, 1080, 1920);
    const grad = ctx.createRadialGradient(540, 768, 50, 540, 768, 1200);
    grad.addColorStop(0, '#1c2230');
    grad.addColorStop(1, '#0c0f16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.save();
    const scale = 1720 / 1323;
    const dx = (1080 - 768 * scale) / 2;
    const dy = 80 - 26 * scale;
    ctx.translate(dx, dy);
    ctx.scale(scale, scale);

    const drawPart = (key, transformFn) => {
      const c = manifest.components.find(x => x.key === key);
      if (!c || !imageMap[key]) return;
      ctx.save();
      if (transformFn) transformFn(ctx);
      ctx.drawImage(imageMap[key], c.cropBox.x, c.cropBox.y);
      ctx.restore();
    };

    const P = PIVOTS;
    const p = pose;

    const applyPelvis = ctx => {
      ctx.translate(P.pelvis.x + p.pelvis.tx, P.pelvis.y + p.pelvis.ty);
      ctx.rotate(deg(p.pelvis.rot));
      ctx.scale(p.pelvis.scaleX, p.pelvis.scaleY);
      ctx.translate(-P.pelvis.x, -P.pelvis.y);
    };

    const applyTorso = ctx => {
      applyPelvis(ctx);
      ctx.translate(P.torso.x + p.torso.tx, P.torso.y + p.torso.ty);
      ctx.rotate(deg(p.torso.rot));
      ctx.scale(p.torso.scaleX, p.torso.scaleY);
      ctx.translate(-P.torso.x, -P.torso.y);
    };

    const applyNeck = ctx => {
      applyTorso(ctx);
      ctx.translate(P.neck.x, P.neck.y);
      ctx.rotate(deg(p.neck.rot));
      ctx.translate(-P.neck.x, -P.neck.y);
    };

    const applyHead = ctx => {
      applyNeck(ctx);
      ctx.translate(P.head.x + p.head.tx, P.head.y + p.head.ty);
      ctx.rotate(deg(p.head.rot));
      ctx.translate(-P.head.x, -P.head.y);
    };

    const applyHipL = ctx => {
      applyPelvis(ctx);
      ctx.translate(P.hipL.x + p.hipL.tx, P.hipL.y + p.hipL.ty);
      ctx.rotate(deg(p.hipL.rot));
      ctx.scale(p.hipL.scaleX || 1, p.hipL.scaleY || 1);
      ctx.translate(-P.hipL.x, -P.hipL.y);
    };

    const applyKneeL = ctx => {
      applyHipL(ctx);
      ctx.translate(P.kneeL.x + (p.kneeL.tx || 0), P.kneeL.y + (p.kneeL.ty || 0));
      ctx.rotate(deg(p.kneeL.rot));
      ctx.translate(-P.kneeL.x, -P.kneeL.y);
    };

    const applyBootL = ctx => {
      applyKneeL(ctx);
      ctx.translate(P.bootL.x + (p.bootL.tx || 0), P.bootL.y + (p.bootL.ty || 0));
      ctx.rotate(deg(p.bootL.rot));
      ctx.translate(-P.bootL.x, -P.bootL.y);
    };

    const applyHipR = ctx => {
      applyPelvis(ctx);
      ctx.translate(P.hipR.x + p.hipR.tx, P.hipR.y + p.hipR.ty);
      ctx.rotate(deg(p.hipR.rot));
      ctx.scale(p.hipR.scaleX || 1, p.hipR.scaleY || 1);
      ctx.translate(-P.hipR.x, -P.hipR.y);
    };

    const applyKneeR = ctx => {
      applyHipR(ctx);
      ctx.translate(P.kneeR.x + (p.kneeR.tx || 0), P.kneeR.y + (p.kneeR.ty || 0));
      ctx.rotate(deg(p.kneeR.rot));
      ctx.translate(-P.kneeR.x, -P.kneeR.y);
    };

    const applyBootR = ctx => {
      applyKneeR(ctx);
      ctx.translate(P.bootR.x + (p.bootR.tx || 0), P.bootR.y + (p.bootR.ty || 0));
      ctx.rotate(deg(p.bootR.rot));
      ctx.translate(-P.bootR.x, -P.bootR.y);
    };

    const applyShldL = ctx => {
      applyTorso(ctx);
      ctx.translate(P.shldL.x + p.shldL.tx, P.shldL.y + p.shldL.ty);
      ctx.rotate(deg(p.shldL.rot));
      ctx.translate(-P.shldL.x, -P.shldL.y);
    };

    const applyElbL = ctx => {
      applyShldL(ctx);
      ctx.translate(P.elbL.x + (p.elbL.tx || 0), P.elbL.y + (p.elbL.ty || 0));
      ctx.rotate(deg(p.elbL.rot));
      ctx.translate(-P.elbL.x, -P.elbL.y);
    };

    const applyWrtL = ctx => {
      applyElbL(ctx);
      ctx.translate(P.wrtL.x + (p.wrtL.tx || 0), P.wrtL.y + (p.wrtL.ty || 0));
      ctx.rotate(deg(p.wrtL.rot));
      ctx.translate(-P.wrtL.x, -P.wrtL.y);
    };

    const applyShldR = ctx => {
      applyTorso(ctx);
      ctx.translate(P.shldR.x + p.shldR.tx, P.shldR.y + p.shldR.ty);
      ctx.rotate(deg(p.shldR.rot));
      ctx.translate(-P.shldR.x, -P.shldR.y);
    };

    const applyElbR = ctx => {
      applyShldR(ctx);
      ctx.translate(P.elbR.x + (p.elbR.tx || 0), P.elbR.y + (p.elbR.ty || 0));
      ctx.rotate(deg(p.elbR.rot));
      ctx.translate(-P.elbR.x, -P.elbR.y);
    };

    const applyWrtR = ctx => {
      applyElbR(ctx);
      ctx.translate(P.wrtR.x + (p.wrtR.tx || 0), P.wrtR.y + (p.wrtR.ty || 0));
      ctx.rotate(deg(p.wrtR.rot));
      ctx.translate(-P.wrtR.x, -P.wrtR.y);
    };

    // DRAW ORDER
    drawPart('01_back_hair', applyHead);
    drawPart('04_neck', applyNeck);
    drawPart('12_boot_left', applyBootL);
    drawPart('12_boot_right', applyBootR);
    drawPart('11_lower_leg_left', applyKneeL);
    drawPart('11_lower_leg_right', applyKneeR);
    drawPart('10_upper_leg_left', applyHipL);
    drawPart('10_upper_leg_right', applyHipR);
    drawPart('09_pelvis_belt', applyPelvis);

    if (p.drawArmsMode === 'hands_on_hips') {
      drawPart('06_jacket_torso', applyTorso);
      drawPart('08_forearm_left', applyElbL);
      drawPart('08_forearm_right', applyElbR);
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);
      drawPart('09_hand_left', applyWrtL);
      drawPart('09_hand_right', applyWrtR);
    } else if (p.drawArmsMode === 'arms_crossed') {
      drawPart('06_jacket_torso', applyTorso);
      drawPart('08_forearm_left', applyElbL);
      drawPart('09_hand_left', applyWrtL);
      drawPart('08_forearm_right', applyElbR);
      drawPart('09_hand_right', applyWrtR);
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);
    } else if (p.armsInFront) {
      drawPart('06_jacket_torso', applyTorso);
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);
      drawPart('09_hand_right', applyWrtR);
      drawPart('08_forearm_right', applyElbR);
      drawPart('09_hand_left', applyWrtL);
      drawPart('08_forearm_left', applyElbL);
    } else {
      drawPart('09_hand_left', applyWrtL);
      drawPart('09_hand_right', applyWrtR);
      drawPart('08_forearm_left', applyElbL);
      drawPart('08_forearm_right', applyElbR);
      drawPart('06_jacket_torso', applyTorso);
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);
    }

    drawPart('05_collar_left', applyTorso);
    drawPart('05_collar_right', applyTorso);
    drawPart('02_head_face', applyHead);
    drawPart('03_front_hair', applyHead);

    ctx.restore();
    return cvs.toDataURL('image/jpeg', 0.95);
  }

  // 1. IDLE POSE
  const def = createDefaultPose();
  const idle = JSON.parse(JSON.stringify(def));
  idle.torso.scaleY = 1.008;
  idle.torso.ty = -1.6;
  idle.shldL.rot = -0.75;
  idle.shldR.rot = +0.75;

  // 2. WALK CONTACT LEFT
  const walkL = JSON.parse(JSON.stringify(def));
  walkL.pelvis.ty = -4.5;
  walkL.pelvis.tx = +2.8;
  walkL.pelvis.rot = +1.5;
  walkL.torso.rot = -1.0;
  walkL.hipL.ty = -5.0;
  walkL.kneeL.ty = -9.0;
  walkL.bootL.ty = -14.0; // Left foot lifts cleanly in swing!
  walkL.hipL.scaleY = 0.97;
  walkL.shldL.rot = -6.0; walkL.shldL.ty = -1.0;
  walkL.shldR.rot = +6.0; walkL.shldR.ty = -1.0;
  walkL.elbR.rot = -10.0;

  // 3. WALK PASSING BOB
  const walkPass = JSON.parse(JSON.stringify(def));
  walkPass.pelvis.ty = -2.0;

  // 4. WALK CONTACT RIGHT
  const walkR = JSON.parse(JSON.stringify(def));
  walkR.pelvis.ty = -4.5;
  walkR.pelvis.tx = -2.8;
  walkR.pelvis.rot = -1.5;
  walkR.torso.rot = +1.0;
  walkR.hipR.ty = -5.0;
  walkR.kneeR.ty = -9.0;
  walkR.bootR.ty = -14.0; // Right foot lifts cleanly in swing!
  walkR.hipR.scaleY = 0.97;
  walkR.shldL.rot = +6.0; walkR.shldL.ty = -1.0;
  walkR.shldR.rot = -6.0; walkR.shldR.ty = -1.0;
  walkR.elbL.rot = +10.0;

  // 5. POINTING
  // Right arm clearly extends forward towards target with pointing hand
  const point = JSON.parse(JSON.stringify(def));
  point.shldR.rot = -4.5; point.shldR.ty = -1.5;
  point.elbR.rot = -24.0; point.elbR.tx = -1.0;
  point.wrtR.rot = -34.0;
  point.head.rot = -3.2; point.neck.rot = -1.6;
  point.shldL.rot = +1.0;
  point.armsInFront = true;

  // 6. WAVING
  // High greeting wave beside head with active wrist oscillation
  const wave = JSON.parse(JSON.stringify(def));
  wave.shldR.rot = -4.5; wave.shldR.ty = -2.0;
  wave.elbR.rot = -132.0; wave.elbR.tx = -10.0; wave.elbR.ty = -8.0;
  wave.wrtR.rot = -24.0;
  wave.head.rot = +2.5; wave.neck.rot = +1.2;
  wave.armsInFront = true;

  // 7. OPEN PALMS
  // Natural explanatory/welcoming posture with open hands and supinated forearms
  const open = JSON.parse(JSON.stringify(def));
  open.shldL.rot = +6.0; open.shldL.ty = -1.5;
  open.shldR.rot = -6.0; open.shldR.ty = -1.5;
  open.elbL.rot = +15.0; open.elbL.tx = +2.0;
  open.elbR.rot = -15.0; open.elbR.tx = -2.0;
  open.wrtL.rot = +18.0; open.wrtL.tx = +6.0;
  open.wrtR.rot = -18.0; open.wrtR.tx = -6.0;
  open.torso.scaleX = 1.018; open.torso.scaleY = 1.01;
  open.head.rot = +0.8;

  // 8. THINKING
  // Hand to chin / jawline, contemplative tilt
  const think = JSON.parse(JSON.stringify(def));
  think.shldR.rot = +0.8; think.shldR.ty = -2.0;
  think.elbR.rot = +134.0; think.elbR.tx = -8.0; think.elbR.ty = -6.0;
  think.wrtR.rot = +14.0;
  think.shldL.rot = -1.5; think.elbL.rot = -10.0;
  think.head.rot = +3.2; think.neck.rot = +1.6;
  think.armsInFront = true;

  // 9. HANDS ON HIPS
  // Hands resting on waistband/hips, elbows angled outward
  const hips = JSON.parse(JSON.stringify(def));
  hips.shldL.rot = +3.5; hips.shldL.ty = -1.5;
  hips.shldR.rot = -3.5; hips.shldR.ty = -1.5;
  hips.elbL.rot = -15.0; // elbow flared outward
  hips.elbR.rot = +15.0; // elbow flared outward
  hips.wrtL.rot = -18.0; hips.wrtL.tx = +14.0; hips.wrtL.ty = -20.0; // resting on left hip
  hips.wrtR.rot = +18.0; hips.wrtR.tx = -14.0; hips.wrtR.ty = -20.0; // resting on right hip
  hips.torso.scaleY = 1.008;
  hips.drawArmsMode = 'hands_on_hips';

  // 10. ARMS CROSSED
  // Forearms cross horizontally across tactical chest harness
  const cross = JSON.parse(JSON.stringify(def));
  cross.shldL.rot = +2.0; cross.shldL.ty = -1.5;
  cross.shldR.rot = -2.0; cross.shldR.ty = -1.5;
  cross.elbL.rot = -36.0; cross.elbL.tx = +4.0; cross.elbL.ty = -4.0;
  cross.elbR.rot = +38.0; cross.elbR.tx = -4.0; cross.elbR.ty = -6.0;
  cross.wrtL.rot = -22.0; cross.wrtL.tx = +16.0; cross.wrtL.ty = -12.0;
  cross.wrtR.rot = +24.0; cross.wrtR.tx = -16.0; cross.wrtR.ty = -14.0;
  cross.head.rot = -1.2;
  cross.drawArmsMode = 'arms_crossed';

  const poses = [
    { name: '01_idle.jpg', pose: idle },
    { name: '02_walk_contact_L.jpg', pose: walkL },
    { name: '03_walk_passing.jpg', pose: walkPass },
    { name: '04_walk_contact_R.jpg', pose: walkR },
    { name: '05_pointing.jpg', pose: point },
    { name: '06_waving.jpg', pose: wave },
    { name: '07_open_palms.jpg', pose: open },
    { name: '08_thinking.jpg', pose: think },
    { name: '09_hands_on_hips.jpg', pose: hips },
    { name: '10_arms_crossed.jpg', pose: cross }
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

server.listen(9022, () => {
  console.log('Server on 9022...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9022/'
  ]);
});
