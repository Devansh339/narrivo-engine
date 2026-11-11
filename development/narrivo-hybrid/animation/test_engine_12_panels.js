const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const segDir = path.join(narrivoDir, 'poc', 'raster-split', 'fullbody-seg');
const outDir = path.join(rootDir, 'renders', 'engine_12_panels');
const reviewDir = path.join(narrivoDir, '..', '..', 'collaboration', 'review');
const artifactDir = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\01ffa989-5f6c-4f11-b92d-bfb9a28144cf';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

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

  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');
  const renderer = new VanceEngine.VanceRenderer(manifest, imageMap);

  const panels = [
    { name: '01_idle_inhale.jpg', title: '1. IDLE: INHALE PHASE', meta: 'Chest Lift • Subtle Shoulder Shrug', pose: VanceEngine.evaluateIdle(0.8) },
    { name: '02_idle_exhale.jpg', title: '2. IDLE: EXHALE & SWAY', meta: 'Pelvic Weight Shift • Relaxation', pose: VanceEngine.evaluateIdle(2.4) },
    { name: '03_walk_left_contact.jpg', title: '3. WALK: LEFT CONTACT', meta: 'Left Foot Plant • Right Leg Recovery', pose: VanceEngine.evaluateWalk(0.27) },
    { name: '04_walk_passing_bob.jpg', title: '4. WALK: PASSING BOB', meta: 'Pelvic Bob (-4.5px) • Knee Flexion', pose: VanceEngine.evaluateWalk(0.54) },
    { name: '05_walk_right_contact.jpg', title: '5. WALK: RIGHT CONTACT', meta: 'Right Foot Plant • Left Leg Recovery', pose: VanceEngine.evaluateWalk(0.81) },
    { name: '06_walk_completion.jpg', title: '6. WALK: STANCE REST', meta: 'Bipedal Balance • Zero Notch Tear', pose: VanceEngine.evaluateWalk(1.08) },
    { name: '07_gesture_pointing.jpg', title: '7. GESTURE: POINTING', meta: 'Target Direction • Extended Arm & Hand', pose: VanceEngine.evaluateGesture('pointing', 1.0) },
    { name: '08_gesture_waving.jpg', title: '8. GESTURE: WAVING', meta: 'High Greeting Wave • 2.5 Hz Wrist Wave', pose: VanceEngine.evaluateGesture('waving', 0.10) },
    { name: '09_gesture_open_palms.jpg', title: '9. GESTURE: OPEN PALMS', meta: 'Explanatory Posture • Open Palms', pose: VanceEngine.evaluateGesture('open_palms', 1.0) },
    { name: '10_gesture_thinking.jpg', title: '10. GESTURE: THINKING POSE', meta: 'Hand to Chin • Contemplative Tilt', pose: VanceEngine.evaluateGesture('thinking', 1.0) },
    { name: '11_gesture_hands_on_hips.jpg', title: '11. GESTURE: HANDS ON HIPS', meta: 'Waistband Rest • Outward Flared Elbows', pose: VanceEngine.evaluateGesture('hands_on_hips', 1.0) },
    { name: '12_gesture_arms_crossed.jpg', title: '12. GESTURE: ARMS CROSSED', meta: 'Forearms Folded Over Chest Harness', pose: VanceEngine.evaluateGesture('arms_crossed', 1.0) }
  ];

  for (const p of panels) {
    renderer.render(ctx, p.pose, { is1080: true, background: 'studio' });
    const b64 = cvs.toDataURL('image/jpeg', 0.95);
    await fetch('/save?name=' + p.name, { method: 'POST', body: b64 });
  }

  await fetch('/done');
}
run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:9033');
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
      console.log('Saved panel:', name);
      res.writeHead(200); res.end('ok');
    });
  } else if (pathname === '/done') {
    console.log('All 12 panels captured directly from VanceEngine!');
    res.writeHead(200); res.end('ok');
    setTimeout(() => {
      buildContactSheets();
      server.close();
      process.exit(0);
    }, 500);
  }
});

function buildContactSheets() {
  console.log('Building annotated and unannotated contact sheets...');
  const panels = [
    { name: '01_idle_inhale.jpg', num: 1, title: 'IDLE: INHALE PHASE', meta: 'Chest Lift • Subtle Shoulder Shrug' },
    { name: '02_idle_exhale.jpg', num: 2, title: 'IDLE: EXHALE & SWAY', meta: 'Pelvic Weight Shift • Relaxation' },
    { name: '03_walk_left_contact.jpg', num: 3, title: 'WALK: LEFT CONTACT', meta: 'Left Foot Plant • Right Leg Recovery' },
    { name: '04_walk_passing_bob.jpg', num: 4, title: 'WALK: PASSING BOB', meta: 'Pelvic Bob (-4.5px) • Knee Flexion' },
    { name: '05_walk_right_contact.jpg', num: 5, title: 'WALK: RIGHT CONTACT', meta: 'Right Foot Plant • Left Leg Recovery' },
    { name: '06_walk_completion.jpg', num: 6, title: 'WALK: STANCE REST', meta: 'Bipedal Balance • Zero Notch Tear' },
    { name: '07_gesture_pointing.jpg', num: 7, title: 'GESTURE: POINTING', meta: 'Target Direction • Extended Arm & Hand' },
    { name: '08_gesture_waving.jpg', num: 8, title: 'GESTURE: WAVING', meta: 'High Greeting Wave • 2.5 Hz Wrist Wave' },
    { name: '09_gesture_open_palms.jpg', num: 9, title: 'GESTURE: OPEN PALMS', meta: 'Explanatory Posture • Open Palms' },
    { name: '10_gesture_thinking.jpg', num: 10, title: 'GESTURE: THINKING POSE', meta: 'Hand to Chin • Contemplative Tilt' },
    { name: '11_gesture_hands_on_hips.jpg', num: 11, title: 'GESTURE: HANDS ON HIPS', meta: 'Waistband Rest • Outward Flared Elbows' },
    { name: '12_gesture_arms_crossed.jpg', num: 12, title: 'GESTURE: ARMS CROSSED', meta: 'Forearms Folded Over Chest Harness' }
  ];

  // 1. UNANNOTATED SHEET (Cards only, clean character presentation)
  const unannotatedCards = panels.map(p => {
    const b64 = fs.readFileSync(path.join(outDir, p.name)).toString('base64');
    return `
      <div class="card">
        <div class="imgbox"><img src="data:image/jpeg;base64,${b64}" /></div>
      </div>
    `;
  }).join('\n');

  const unannotatedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Commander Vance — Corrected Unannotated Contact Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #090c12; padding: 20px; width: 2400px; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
  .card { background: #111622; border: 1px solid #1e2638; border-radius: 8px; padding: 8px; display: flex; justify-content: center; align-items: center; }
  .imgbox { width: 370px; height: 658px; border-radius: 6px; overflow: hidden; background: #07090e; }
  .imgbox img { width: 100%; height: 100%; object-fit: contain; display: block; }
</style>
</head>
<body>
  <div class="grid">
    ${unannotatedCards}
  </div>
</body>
</html>`;

  const unannotatedHtmlPath = path.join(reviewDir, 'vance_unannotated_temp.html');
  fs.writeFileSync(unannotatedHtmlPath, unannotatedHtml);

  // 2. ANNOTATED SHEET (With descriptive titles and technical metadata)
  const annotatedCards = panels.map(p => {
    const b64 = fs.readFileSync(path.join(outDir, p.name)).toString('base64');
    return `
      <div class="card">
        <div class="card-head">
          <div class="title">${p.num}. ${p.title}</div>
          <div class="meta">${p.meta}</div>
        </div>
        <div class="imgbox"><img src="data:image/jpeg;base64,${b64}" /></div>
      </div>
    `;
  }).join('\n');

  const annotatedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Commander Vance — Corrected 12-Panel Contact Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1017; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; padding: 24px; width: 2400px; }
  header { margin-bottom: 20px; border-bottom: 1px solid #232b3e; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  h1 { font-size: 28px; font-weight: 700; color: #60a5fa; margin-bottom: 6px; }
  .sub { font-size: 15px; color: #94a3b8; }
  .badge { background: #1e293b; border: 1px solid #3b82f6; color: #93c5fd; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
  .card { background: #151b28; border: 1px solid #232d42; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .card-head { padding: 10px 12px; background: #1a2233; border-bottom: 1px solid #232d42; }
  .card-head .title { font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 2px; }
  .card-head .meta { font-size: 11px; color: #94a3b8; }
  .imgbox { width: 100%; height: 640px; background: #0a0d14; display: flex; align-items: center; justify-content: center; }
  .imgbox img { width: 100%; height: 100%; object-fit: contain; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>NARRIVO HYBRID — COMMANDER VANCE ANIMATION CORRECTION PASS</h1>
      <div class="sub">12-Panel Visual Verification Contact Sheet • Sagittal Gait Mechanics • Expressive Communicative Gestures • Zero Cutout Slits</div>
    </div>
    <div class="badge">Milestone Status: Correction Review (Pending Approval)</div>
  </header>
  <div class="grid">
    ${annotatedCards}
  </div>
</body>
</html>`;

  const annotatedHtmlPath = path.join(reviewDir, 'vance_annotated_temp.html');
  fs.writeFileSync(annotatedHtmlPath, annotatedHtml);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  // Render Unannotated PNG
  const unannotatedPng = path.join(reviewDir, 'vance_unannotated_contact_sheet.png');
  console.log('Capturing unannotated sheet to:', unannotatedPng);
  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--window-size=2400,1400',
    '--screenshot=' + unannotatedPng,
    'file:///' + unannotatedHtmlPath.replace(/\\/g, '/')
  ]);
  fs.copyFileSync(unannotatedPng, path.join(artifactDir, 'vance_unannotated_contact_sheet.png'));

  // Render Annotated PNG
  const annotatedPng = path.join(reviewDir, 'vance_annotated_contact_sheet.png');
  console.log('Capturing annotated sheet to:', annotatedPng);
  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--window-size=2400,1540',
    '--screenshot=' + annotatedPng,
    'file:///' + annotatedHtmlPath.replace(/\\/g, '/')
  ]);
  fs.copyFileSync(annotatedPng, path.join(artifactDir, 'vance_corrected_contact_sheet.png'));

  // Clean up temp htmls
  try {
    fs.unlinkSync(unannotatedHtmlPath);
    fs.unlinkSync(annotatedHtmlPath);
  } catch(e) {}

  console.log('Contact sheets generated and copied successfully!');
}

server.listen(9033, () => {
  console.log('Server on 9033...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    'http://localhost:9033/'
  ]);
});
