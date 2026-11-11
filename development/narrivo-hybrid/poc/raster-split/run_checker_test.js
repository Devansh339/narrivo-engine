const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const artifactDir = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\01ffa989-5f6c-4f11-b92d-bfb9a28144cf';

const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'fullbody-seg', 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0f14; margin: 0; padding: 20px; font-family: sans-serif; color: #fff; width: 1920px; }
  h1 { font-size: 18px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .card {
    background: #151922; border: 1px solid #262c3a; border-radius: 6px; padding: 8px; text-align: center;
  }
  .title { font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #75f096; }
  canvas {
    width: 350px; height: 627px;
    background-color: #555963;
    background-image:
      linear-gradient(45deg, #434750 25%, transparent 25%),
      linear-gradient(-45deg, #434750 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #434750 75%),
      linear-gradient(-45deg, transparent 75%, #434750 75%);
    background-size: 16px 16px;
    border: 1px solid #303748;
    border-radius: 4px;
    display: block;
  }
</style>
</head>
<body>
<h1>COMMANDER VANCE — CHECKERBOARD BACKGROUND DIAGNOSTIC (ALPHA LEAK vs OPAQUE ARTWORK)</h1>
<div class="grid" id="grid"></div>
<script>
async function run() {
  const manifest = ${JSON.stringify(manifest)};
  const compMap = {};
  manifest.components.forEach(c => compMap[c.key] = c);

  const imgs = {};
  await Promise.all(manifest.components.map(c => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = 'fullbody-seg/reconstructed/' + c.key + '.png';
    if (img.complete) resolve();
    imgs[c.key] = img;
  })));

  const poses = [
    { title: '0. NEUTRAL', headR: 0, neckR: 0, shldLR: 0, shldRR: 0, elbLR: 0, elbRR: 0, wrtLR: 0, wrtRR: 0, hipLR: 0, hipRR: 0, kneeLR: 0, kneeRR: 0 },
    { title: '1. SHOULDER ROTATION', headR: 3.5, neckR: 2.0, shldLR: 3.0, shldRR: -3.0, elbLR: 1.5, elbRR: -1.5, wrtLR: 1.0, wrtRR: -1.0, hipLR: 0, hipRR: 0, kneeLR: 0, kneeRR: 0 },
    { title: '2. ELBOW FLEXION', headR: -2.0, neckR: -1.0, shldLR: 1.5, shldRR: -1.5, elbLR: 6.0, elbRR: -6.0, wrtLR: 2.0, wrtRR: -2.0, hipLR: 0, hipRR: 0, kneeLR: 0, kneeRR: 0 },
    { title: '3. HIP WEIGHT SHIFT', headR: 1.5, neckR: 1.0, shldLR: -2.0, shldRR: 2.0, elbLR: 1.0, elbRR: -1.0, wrtLR: 0, wrtRR: 0, hipLR: 3.0, hipRR: -2.0, kneeLR: -3.5, kneeRR: 2.5 },
    { title: '4. READINESS POSE', headR: -3.0, neckR: -1.8, shldLR: 2.5, shldRR: -1.5, elbLR: 5.0, elbRR: -3.0, wrtLR: 2.0, wrtRR: -1.5, hipLR: -2.0, hipRR: 2.5, kneeLR: 2.0, kneeRR: 4.0 }
  ];

  const deg = d => d * Math.PI / 180;

  function renderPose(ctx, p) {
    ctx.clearRect(0, 0, 768, 1376);

    function drawPart(key, transformFn) {
      const c = compMap[key];
      ctx.save();
      if (transformFn) transformFn(ctx, c);
      ctx.drawImage(imgs[key], c.cropBox.x, c.cropBox.y);
      ctx.restore();
    }

    const neckP = compMap['04_neck'].pivotMaster;
    const headP = compMap['02_head_face'].pivotMaster;
    const hipLP = compMap['10_upper_leg_left'].pivotMaster;
    const kneeLP = compMap['11_lower_leg_left'].pivotMaster;
    const hipRP = compMap['10_upper_leg_right'].pivotMaster;
    const kneeRP = compMap['11_lower_leg_right'].pivotMaster;
    const shldLP = compMap['07_upper_arm_left'].pivotMaster;
    const elbLP = compMap['08_forearm_left'].pivotMaster;
    const wrtLP = compMap['09_hand_left'].pivotMaster;
    const shldRP = compMap['07_upper_arm_right'].pivotMaster;
    const elbRP = compMap['08_forearm_right'].pivotMaster;
    const wrtRP = compMap['09_hand_right'].pivotMaster;

    // Draw stack:
    drawPart('01_back_hair', ctx => {
      ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
      ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
    });
    drawPart('04_neck', ctx => {
      ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
    });
    drawPart('12_boot_left', ctx => {
      ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
      ctx.translate(kneeLP.x, kneeLP.y); ctx.rotate(deg(p.kneeLR)); ctx.translate(-kneeLP.x, -kneeLP.y);
    });
    drawPart('12_boot_right', ctx => {
      ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
      ctx.translate(kneeRP.x, kneeRP.y); ctx.rotate(deg(p.kneeRR)); ctx.translate(-kneeRP.x, -kneeRP.y);
    });
    drawPart('11_lower_leg_left', ctx => {
      ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
      ctx.translate(kneeLP.x, kneeLP.y); ctx.rotate(deg(p.kneeLR)); ctx.translate(-kneeLP.x, -kneeLP.y);
    });
    drawPart('11_lower_leg_right', ctx => {
      ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
      ctx.translate(kneeRP.x, kneeRP.y); ctx.rotate(deg(p.kneeRR)); ctx.translate(-kneeRP.x, -kneeRP.y);
    });
    drawPart('10_upper_leg_left', ctx => {
      ctx.translate(hipLP.x, hipLP.y); ctx.rotate(deg(p.hipLR)); ctx.translate(-hipLP.x, -hipLP.y);
    });
    drawPart('10_upper_leg_right', ctx => {
      ctx.translate(hipRP.x, hipRP.y); ctx.rotate(deg(p.hipRR)); ctx.translate(-hipRP.x, -hipRP.y);
    });
    drawPart('09_pelvis_belt', () => {});
    drawPart('09_hand_left', ctx => {
      ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
      ctx.translate(elbLP.x, elbLP.y); ctx.rotate(deg(p.elbLR)); ctx.translate(-elbLP.x, -elbLP.y);
      ctx.translate(wrtLP.x, wrtLP.y); ctx.rotate(deg(p.wrtLR || 0)); ctx.translate(-wrtLP.x, -wrtLP.y);
    });
    drawPart('09_hand_right', ctx => {
      ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
      ctx.translate(elbRP.x, elbRP.y); ctx.rotate(deg(p.elbRR)); ctx.translate(-elbRP.x, -elbRP.y);
      ctx.translate(wrtRP.x, wrtRP.y); ctx.rotate(deg(p.wrtRR || 0)); ctx.translate(-wrtRP.x, -wrtRP.y);
    });
    drawPart('08_forearm_left', ctx => {
      ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
      ctx.translate(elbLP.x, elbLP.y); ctx.rotate(deg(p.elbLR)); ctx.translate(-elbLP.x, -elbLP.y);
    });
    drawPart('08_forearm_right', ctx => {
      ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
      ctx.translate(elbRP.x, elbRP.y); ctx.rotate(deg(p.elbRR)); ctx.translate(-elbRP.x, -elbRP.y);
    });
    drawPart('06_jacket_torso', () => {});
    drawPart('07_upper_arm_left', ctx => {
      ctx.translate(shldLP.x, shldLP.y); ctx.rotate(deg(p.shldLR)); ctx.translate(-shldLP.x, -shldLP.y);
    });
    drawPart('07_upper_arm_right', ctx => {
      ctx.translate(shldRP.x, shldRP.y); ctx.rotate(deg(p.shldRR)); ctx.translate(-shldRP.x, -shldRP.y);
    });
    drawPart('05_collar_left', () => {});
    drawPart('05_collar_right', () => {});
    drawPart('02_head_face', ctx => {
      ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
      ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
    });
    drawPart('03_front_hair', ctx => {
      ctx.translate(neckP.x, neckP.y); ctx.rotate(deg(p.neckR)); ctx.translate(-neckP.x, -neckP.y);
      ctx.translate(headP.x, headP.y); ctx.rotate(deg(p.headR)); ctx.translate(-headP.x, -headP.y);
    });
  }

  const grid = document.getElementById('grid');
  for (const p of poses) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = \`<div class="title">\${p.title}</div><canvas width="768" height="1376"></canvas>\`;
    grid.appendChild(card);
    renderPose(card.querySelector('canvas').getContext('2d'), p);
  }
}
run();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'test_checker.html'), html);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
execFileSync(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--window-size=1920,800',
  '--virtual-time-budget=5000',
  '--screenshot=' + path.join(rootDir, 'renders', 'checker_test.png'),
  'file:///' + path.resolve(rootDir, 'test_checker.html').replace(/\\/g, '/')
]);
console.log('Checker test rendered to renders/checker_test.png');
fs.copyFileSync(path.join(rootDir, 'renders', 'checker_test.png'), path.join(artifactDir, 'checker_test.png'));
