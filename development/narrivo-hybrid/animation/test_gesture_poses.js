const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const testDir = path.join(rootDir, 'renders', 'pose_tests');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(segDir, 'manifest.json'), 'utf8'));

// We will test several candidate configurations for each requested correction:
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

  window.renderPose = function(pose) {
    renderer.render(ctx, pose, { is1080: true, background: 'studio' });
    return cvs.toDataURL('image/jpeg', 0.95);
  };
  window.ready = true;
}
run();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(testDir, 'test.html'), testHtml);
console.log('Test harness written.');
