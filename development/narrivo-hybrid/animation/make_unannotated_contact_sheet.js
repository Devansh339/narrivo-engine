const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = __dirname;
const narrivoDir = path.resolve(rootDir, '..');
const cleanFramesDir = path.join(rootDir, 'renders', 'clean_frames');
const reviewDir = path.join(narrivoDir, '..', '..', 'collaboration', 'review');
const artifactDir = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\01ffa989-5f6c-4f11-b92d-bfb9a28144cf';

if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

const frames = [
  'frame_0030.jpg', // 1. Idle Inhale
  'frame_0075.jpg', // 2. Idle Exhale & Sway
  'frame_0130.jpg', // 3. Walk Contact Left
  'frame_0138.jpg', // 4. Walk Passing Bob
  'frame_0146.jpg', // 5. Walk Contact Right
  'frame_0237.jpg', // 6. Walk to Idle Transition
  'frame_0320.jpg', // 7. Gesture: Pointing
  'frame_0385.jpg', // 8. Gesture: Waving
  'frame_0455.jpg', // 9. Gesture: Open Palms
  'frame_0520.jpg', // 10. Gesture: Thinking
  'frame_0585.jpg', // 11. Gesture: Hands on Hips
  'frame_0660.jpg'  // 12. Gesture: Arms Crossed
];

const cardsHtml = frames.map(f => {
  const fPath = path.join(cleanFramesDir, f);
  const b64 = fs.readFileSync(fPath).toString('base64');
  return `
    <div class="card">
      <div class="imgbox">
        <img src="data:image/jpeg;base64,${b64}" />
      </div>
    </div>
  `;
}).join('\n');

const sheetHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Commander Vance — Unannotated Animation Contact Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090c12;
    padding: 20px;
    width: 2400px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
  }
  .card {
    background: #111622;
    border: 1px solid #1e2638;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .imgbox {
    width: 370px;
    height: 658px;
    border-radius: 6px;
    overflow: hidden;
    background: #07090e;
  }
  .imgbox img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
</style>
</head>
<body>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;

const tempHtml = path.join(reviewDir, 'unannotated_sheet.html');
fs.writeFileSync(tempHtml, sheetHtml);

const outPng = path.join(reviewDir, 'vance_unannotated_contact_sheet.png');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Rendering unannotated contact sheet via headless Chrome...');
execFileSync(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--window-size=2400,1380',
  `--screenshot=${outPng}`,
  `file:///${tempHtml.replace(/\\/g, '/')}`
]);

console.log('Saved unannotated contact sheet to:', outPng);
if (fs.existsSync(artifactDir)) {
  fs.copyFileSync(outPng, path.join(artifactDir, 'vance_unannotated_contact_sheet.png'));
  console.log('Copied to artifact directory.');
}

// Clean up temporary html
fs.unlinkSync(tempHtml);
console.log('Done!');
