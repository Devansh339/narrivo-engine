const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const outDir = path.join(rootDir, 'renders', 'calibrated_test');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#000;margin:0;">
<canvas id="c" width="1080" height="1920"></canvas>
<script>
const deg = d => d * Math.PI / 180;
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); }

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
    hipL:      { rot: 0, tx: 0, ty: 0 },
    hipR:      { rot: 0, tx: 0, ty: 0 },
    kneeL:     { rot: 0 },
    kneeR:     { rot: 0 },
    bootL:     { rot: 0 },
    bootR:     { rot: 0 },
    armsInFront: false
  };
}

function evaluateIdle(timeSec) {
  const p = createDefaultPose();
  const breath = Math.sin(timeSec * (2 * Math.PI / 3.2) - Math.PI / 2) * 0.5 + 0.5;
  p.torso.scaleY = 1.0 + 0.0075 * breath;
  p.torso.scaleX = 1.0 + 0.0035 * breath;
  p.torso.ty     = -1.6 * breath;
  p.shldL.rot    = -0.75 * breath;
  p.shldR.rot    = +0.75 * breath;

  const sway = Math.sin(timeSec * (2 * Math.PI / 5.4));
  p.pelvis.tx    = sway * 1.5;
  p.pelvis.rot   = sway * 0.45;
  p.hipL.rot     = -sway * 0.40;
  p.hipR.rot     = -sway * 0.40;

  p.head.rot     = Math.sin(timeSec * 1.25) * 0.65;
  p.neck.rot     = Math.sin(timeSec * 1.05) * 0.40;
  p.wrtL.rot     = Math.sin(timeSec * 1.4) * 0.35;
  p.wrtR.rot     = -Math.sin(timeSec * 1.35) * 0.35;
  return p;
}

function evaluateWalk(timeSec) {
  const p = createDefaultPose();
  const stridePeriod = 1.08;
  const phase = (timeSec % stridePeriod) / stridePeriod;
  const phiL = phase * 2 * Math.PI;
  const phiR = phiL + Math.PI;

  // Pelvic cadence: subtle bob and lateral weight transfer
  const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
  p.pelvis.ty  = -2.5 * bob;
  const lateral = Math.sin(phiL);
  p.pelvis.tx  = lateral * 1.6;
  p.pelvis.rot = lateral * 0.65;

  p.torso.rot  = -p.pelvis.rot * 0.65;
  p.torso.ty   = p.pelvis.ty * 0.25;
  p.head.rot   = -p.torso.rot * 0.75;
  p.neck.rot   = -p.torso.rot * 0.35;

  // FRONTAL LEG KINEMATICS:
  // ZERO vertical displacement on hips (ty=0) to guarantee knee integrity.
  p.hipL.rot   = Math.sin(phiL) * 1.6;
  p.hipR.rot   = Math.sin(phiR) * 1.6;

  // Knee flexion: subtle (-2.5 deg max during swing):
  const swingL = Math.max(0, -Math.sin(phiL));
  const swingR = Math.max(0, -Math.sin(phiR));
  p.kneeL.rot  = -(swingL * 2.5);
  p.kneeR.rot  = -(swingR * 2.5);

  p.bootL.rot  = 0;
  p.bootR.rot  = 0;

  // Opposing arm swing: +/- 3.8 deg:
  p.shldL.rot  = -Math.sin(phiL) * 3.8;
  p.shldR.rot  = -Math.sin(phiR) * 3.8;

  const armFwdL = Math.max(0, -Math.sin(phiL));
  const armFwdR = Math.max(0, -Math.sin(phiR));
  p.elbL.rot   = armFwdL * 4.5;
  p.elbR.rot   = -armFwdR * 4.5;

  p.wrtL.rot   = -Math.cos(phiL) * 1.2;
  p.wrtR.rot   = -Math.cos(phiR) * 1.2;
  return p;
}

function evaluateGesture(name, timeSec) {
  const p = createDefaultPose();
  const breath = Math.sin(timeSec * 2) * 0.5 + 0.5;
  p.torso.scaleY = 1.0 + 0.005 * breath;

  switch (name) {
    case 'pointing':
      // Clearly extended pointing gesture directed forward-right:
      p.shldR.rot = -4.5;
      p.shldR.ty  = -2.0;
      p.elbR.rot  = -16.0;
      p.elbR.tx   = -4.0;
      p.elbR.ty   = -3.0;
      p.wrtR.rot  = -8.0;
      p.head.rot  = -3.0;
      p.neck.rot  = -1.8;
      p.shldL.rot = +1.0;
      break;

    case 'waving':
      // Readable greeting wave beside head:
      p.shldR.rot = -5.0;
      p.shldR.ty  = -2.5;
      p.elbR.rot  = -142.0;
      p.elbR.tx   = -10.0;
      p.elbR.ty   = -8.0;
      p.wrtR.rot  = Math.sin(timeSec * 4.0 * Math.PI) * 12.0;
      p.head.rot  = +2.2;
      p.neck.rot  = +1.2;
      p.shldL.rot = +0.8;
      p.armsInFront = true;
      break;

    case 'open_palms':
      // Natural explanatory stance:
      p.shldL.rot = +4.0;
      p.shldR.rot = -4.0;
      p.elbL.rot  = +8.0;
      p.elbR.rot  = -8.0;
      p.elbL.tx   = -2.0;
      p.elbR.tx   = +2.0;
      p.wrtL.rot  = +5.0;
      p.wrtR.rot  = -5.0;
      p.torso.scaleX = 1.012;
      p.head.rot  = +0.8;
      break;

    case 'thinking':
      // Contemplative pose: right hand touches chin:
      p.shldR.rot = +0.8;
      p.shldR.ty  = -2.0;
      p.elbR.rot  = +134.0;
      p.elbR.tx   = -8.0;
      p.elbR.ty   = -6.0;
      p.wrtR.rot  = +14.0;
      p.shldL.rot = -1.5;
      p.elbL.rot  = -12.0;
      p.head.rot  = +3.2;
      p.neck.rot  = +1.6;
      p.armsInFront = true;
      break;

    case 'hands_on_hips':
      // Confident stance with hands resting directly on hips:
      p.shldL.rot = +3.0;
      p.shldR.rot = -3.0;
      p.shldL.tx  = -2.0;
      p.shldR.tx  = +2.0;
      p.elbL.rot  = -14.0;
      p.elbR.rot  = +14.0;
      p.elbL.tx   = -3.0;
      p.elbR.tx   = +3.0;
      p.wrtL.rot  = -10.0;
      p.wrtR.rot  = +10.0;
      p.torso.scaleY = 1.008;
      p.armsInFront = true;
      break;

    case 'arms_crossed':
      // Folded arms across tactical chest harness:
      p.shldL.rot = -4.5;
      p.shldR.rot = +4.5;
      p.shldL.ty  = -2.0;
      p.shldR.ty  = -2.0;
      p.elbL.rot  = -52.0;
      p.elbR.rot  = +52.0;
      p.elbL.tx   = -4.0;
      p.elbR.tx   = +4.0;
      p.elbL.ty   = -4.0;
      p.elbR.ty   = -4.0;
      p.wrtL.rot  = -6.0;
      p.wrtR.rot  = +6.0;
      p.head.rot  = -1.2;
      p.neck.rot  = -0.6;
      p.armsInFront = true;
      break;
  }
  return p;
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
    // 1080x1920 scaling: 80px top margin, 120px bottom margin
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
      ctx.translate(-P.hipL.x, -P.hipL.y);
    };

    const applyKneeL = ctx => {
      applyHipL(ctx);
      ctx.translate(P.kneeL.x, P.kneeL.y);
      ctx.rotate(deg(p.kneeL.rot));
      ctx.translate(-P.kneeL.x, -P.kneeL.y);
    };

    const applyBootL = ctx => {
      applyKneeL(ctx);
      ctx.translate(P.bootL.x, P.bootL.y);
      ctx.rotate(deg(p.bootL.rot));
      ctx.translate(-P.bootL.x, -P.bootL.y);
    };

    const applyHipR = ctx => {
      applyPelvis(ctx);
      ctx.translate(P.hipR.x + p.hipR.tx, P.hipR.y + p.hipR.ty);
      ctx.rotate(deg(p.hipR.rot));
      ctx.translate(-P.hipR.x, -P.hipR.y);
    };

    const applyKneeR = ctx => {
      applyHipR(ctx);
      ctx.translate(P.kneeR.x, P.kneeR.y);
      ctx.rotate(deg(p.kneeR.rot));
      ctx.translate(-P.kneeR.x, -P.kneeR.y);
    };

    const applyBootR = ctx => {
      applyKneeR(ctx);
      ctx.translate(P.bootR.x, P.bootR.y);
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

    drawPart('01_back_hair', applyHead);
    drawPart('04_neck', applyNeck);
    drawPart('12_boot_left', applyBootL);
    drawPart('12_boot_right', applyBootR);
    drawPart('11_lower_leg_left', applyKneeL);
    drawPart('11_lower_leg_right', applyKneeR);
    drawPart('10_upper_leg_left', applyHipL);
    drawPart('10_upper_leg_right', applyHipR);
    drawPart('09_pelvis_belt', applyPelvis);

    if (!p.armsInFront) {
      drawPart('09_hand_left', applyWrtL);
      drawPart('09_hand_right', applyWrtR);
      drawPart('08_forearm_left', applyElbL);
      drawPart('08_forearm_right', applyElbR);
    }

    drawPart('06_jacket_torso', applyTorso);
    drawPart('07_upper_arm_left', applyShldL);
    drawPart('07_upper_arm_right', applyShldR);

    if (p.armsInFront) {
      drawPart('09_hand_right', applyWrtR);
      drawPart('08_forearm_right', applyElbR);
      drawPart('09_hand_left', applyWrtL);
      drawPart('08_forearm_left', applyElbL);
    }

    drawPart('05_collar_left', applyTorso);
    drawPart('05_collar_right', applyTorso);
    drawPart('02_head_face', applyHead);
    drawPart('03_front_hair', applyHead);

    ctx.restore();
  }

  const testList = [
    { id: 'cal_pointing', pose: evaluateGesture('pointing', 1.0) },
    { id: 'cal_waving', pose: evaluateGesture('waving', 1.0) },
    { id: 'cal_open_palms', pose: evaluateGesture('open_palms', 1.0) },
    { id: 'cal_thinking', pose: evaluateGesture('thinking', 1.0) },
    { id: 'cal_hands_on_hips', pose: evaluateGesture('hands_on_hips', 1.0) },
    { id: 'cal_arms_crossed', pose: evaluateGesture('arms_crossed', 1.0) }
  ];

  for (const item of testList) {
    render(item.pose);
    await fetch('/save?name=' + item.id + '.jpg', {
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

fs.writeFileSync(path.join(rootDir, 'calibrated_test.html'), html);

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9015');
  const pathname = urlObj.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
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
      console.log('Saved:', name);
      res.writeHead(200); res.end('ok');
    });
  } else if (pathname === '/done') {
    res.writeHead(200); res.end('ok');
    console.log('Calibrated renders complete!');
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  }
});

server.listen(9015, () => {
  console.log('Listening on 9015...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9015/'
  ]);
});
