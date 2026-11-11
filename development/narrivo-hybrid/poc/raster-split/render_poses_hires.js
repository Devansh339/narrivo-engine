const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'fullbody-seg', 'manifest.json'), 'utf8'));

const html = `<!DOCTYPE html>
<html>
<body style="margin:0;background:#000;">
<canvas id="c0" width="768" height="1376"></canvas>
<canvas id="c2" width="768" height="1376"></canvas>
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

  const deg = d => d * Math.PI / 180;

  function renderPose(cvs, p) {
    const ctx = cvs.getContext('2d');
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

  renderPose(document.getElementById('c0'), { headR:0, neckR:0, shldLR:0, shldRR:0, elbLR:0, elbRR:0, wrtLR:0, wrtRR:0, hipLR:0, hipRR:0, kneeLR:0, kneeRR:0 });
  renderPose(document.getElementById('c2'), { headR:-2.0, neckR:-1.0, shldLR:1.5, shldRR:-1.5, elbLR:6.0, elbRR:-6.0, wrtLR:2.0, wrtRR:-2.0, hipLR:0, hipRR:0, kneeLR:0, kneeRR:0 });

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      c0: document.getElementById('c0').toDataURL(),
      c2: document.getElementById('c2').toDataURL()
    })
  });
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, {'Content-Type':'text/html'}); res.end(html); }
  else if (req.url.startsWith('/fullbody-seg/')) {
    const fPath = path.join(rootDir, req.url);
    if (fs.existsSync(fPath)) res.end(fs.readFileSync(fPath));
    else { res.writeHead(404); res.end('not found'); }
  } else if (req.url === '/done') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      const data = JSON.parse(b);
      fs.writeFileSync(path.join(rootDir, 'renders', 'pose0_hires.png'), Buffer.from(data.c0.replace(/^data:image\/png;base64,/, ''), 'base64'));
      fs.writeFileSync(path.join(rootDir, 'renders', 'pose2_hires.png'), Buffer.from(data.c2.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log('Saved pose0_hires.png and pose2_hires.png');
      res.end('ok'); process.exit(0);
    });
  }
});
server.listen(9002, () => {
  spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:9002/'
  ]);
});
