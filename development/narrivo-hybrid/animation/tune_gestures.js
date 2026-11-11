const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const outDir = path.join(rootDir, 'renders', 'gesture_variations');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#000;margin:0;">
<canvas id="c" width="1080" height="1920"></canvas>
<script>
const deg = d => d * Math.PI / 180;

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

  // Variations for Hands on Hips:
  // Var A: Subtle waist anchor
  const hipA = createDefaultPose();
  hipA.shldL.rot = +2.0; hipA.shldR.rot = -2.0;
  hipA.elbL.rot = -8.0;  hipA.elbR.rot = +8.0;
  hipA.wrtL.tx = +14.0;  hipA.wrtR.tx = -14.0;
  hipA.wrtL.ty = -18.0;  hipA.wrtR.ty = -18.0;
  hipA.wrtL.rot = -8.0;  hipA.wrtR.rot = +8.0;
  hipA.armsInFront = true;

  // Var B: Slightly more flared elbows with wrist cupped at hips
  const hipB = createDefaultPose();
  hipB.shldL.rot = +3.0; hipB.shldR.rot = -3.0;
  hipB.elbL.rot = -10.0; hipB.elbR.rot = +10.0;
  hipB.wrtL.tx = +18.0;  hipB.wrtR.tx = -18.0;
  hipB.wrtL.ty = -22.0;  hipB.wrtR.ty = -22.0;
  hipB.wrtL.rot = -12.0; hipB.wrtR.rot = +12.0;
  hipB.armsInFront = true;

  // Variations for Arms Crossed:
  const crossA = createDefaultPose();
  crossA.shldL.rot = -3.5; crossA.shldR.rot = +3.5;
  crossA.shldL.ty = -2.0;  crossA.shldR.ty = -2.0;
  crossA.elbL.rot = -40.0; crossA.elbR.rot = +40.0;
  crossA.elbL.tx = -2.0;   crossA.elbR.tx = +2.0;
  crossA.elbL.ty = -2.0;   crossA.elbR.ty = -2.0;
  crossA.wrtL.rot = -6.0;  crossA.wrtR.rot = +6.0;
  crossA.armsInFront = true;

  const crossB = createDefaultPose();
  crossB.shldL.rot = -4.0; crossB.shldR.rot = +4.0;
  crossB.shldL.ty = -2.0;  crossB.shldR.ty = -2.0;
  crossB.elbL.rot = -32.0; crossB.elbR.rot = +32.0;
  crossB.wrtL.tx = +10.0;  crossB.wrtR.tx = -10.0;
  crossB.wrtL.ty = -10.0;  crossB.wrtR.ty = -10.0;
  crossB.armsInFront = true;

  // Variations for Pointing:
  const pointA = createDefaultPose();
  pointA.shldR.rot = -4.0; pointA.shldR.ty = -2.0;
  pointA.elbR.rot  = -12.0; pointA.elbR.tx = -2.0;
  pointA.wrtR.rot  = -6.0;
  pointA.head.rot  = -2.5; pointA.neck.rot = -1.5;

  const variations = [
    { name: 'hip_var_A.jpg', pose: hipA },
    { name: 'hip_var_B.jpg', pose: hipB },
    { name: 'cross_var_A.jpg', pose: crossA },
    { name: 'cross_var_B.jpg', pose: crossB },
    { name: 'point_var_A.jpg', pose: pointA }
  ];

  for (const v of variations) {
    render(v.pose);
    await fetch('/save?name=' + v.name, {
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

fs.writeFileSync(path.join(rootDir, 'tune_gestures.html'), html);

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9016');
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
    console.log('Variations saved!');
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  }
});

server.listen(9016, () => {
  console.log('Listening on 9016...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9016/'
  ]);
});
