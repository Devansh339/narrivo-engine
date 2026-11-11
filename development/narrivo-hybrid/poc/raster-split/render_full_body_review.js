const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = __dirname;
const rendersDir = path.join(rootDir, 'renders');
const artifactDir = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\01ffa989-5f6c-4f11-b92d-bfb9a28144cf';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Commander Vance — Full-Body Master Artwork vs. Approved Gate 1 Master Bust</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0d0f14;
    color: #e8ecf4;
    font-family: 'Segoe UI', system-ui, sans-serif;
    padding: 24px 32px;
    width: 1920px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #262b38;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  h1 { font-size: 22px; font-weight: 700; color: #fff; }
  .subtitle { font-size: 13px; color: #9aa4b8; margin-top: 4px; }
  .badge {
    background: #142e24;
    border: 1px solid #28a745;
    color: #75f096;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .main-layout {
    display: grid;
    grid-template-columns: 880px 480px 480px;
    gap: 20px;
  }
  .card {
    background: #151922;
    border: 1px solid #262c3a;
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
  }
  .card-header {
    border-bottom: 1px solid #222836;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .card-title { font-size: 14px; font-weight: 700; color: #fff; }
  .card-sub { font-size: 11px; color: #8c96ab; margin-top: 2px; }
  .view-frame {
    background: #7a7a7a;
    border: 1px solid #303748;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .view-frame img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .h-full { height: 960px; }
  .h-half { height: 460px; }
  .audit-list {
    margin-top: 12px;
    font-size: 11.5px;
    color: #c2cadb;
    line-height: 1.55;
    padding-left: 18px;
  }
  .audit-list li { margin-bottom: 6px; }
  .audit-list strong { color: #fff; }
  .zoom-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
</head>
<body>
  <header>
    <div>
      <h1>COMMANDER VANCE — FULL-BODY MASTER ARTWORK VISUAL BENCHMARK</h1>
      <div class="subtitle">Side-by-side comparison between the new Full-Body Master Artwork (896×1600 @ 9:16 vertical) and the approved Gate 1 Master Bust reference.</div>
    </div>
    <div class="badge">AWAITING VISUAL APPROVAL</div>
  </header>

  <div class="main-layout">
    <!-- Col 1: Full-Body Master -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">1. FULL-BODY MASTER ARTWORK (NEW PRODUCTION REFERENCE)</div>
        <div class="card-sub">Complete Character • Relaxed A-Pose • No Cropping • Solid Neutral Grey (#7A7A7A) Background</div>
      </div>
      <div class="view-frame h-full">
        <img src="source/00_master_full_body.jpg" />
      </div>
    </div>

    <!-- Col 2: Gate 1 Bust Reference & Upper Body Alignment -->
    <div class="zoom-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">2. APPROVED GATE 1 MASTER BUST (PRIMARY IDENTITY REF)</div>
          <div class="card-sub">Approved Facial Identity, Palette, Hair, Shading & Direction 3 Lighting</div>
        </div>
        <div class="view-frame h-half">
          <img src="source/00_master_bust.jpg" />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">3. UPPER BODY & IDENTITY CONSISTENCY AUDIT</div>
          <div class="card-sub">Head-to-Chest Feature Verification</div>
        </div>
        <ul class="audit-list">
          <li><strong>Facial Identity:</strong> Same strong jawline, stubble density, warm brown iris hue, and confident relaxed expression.</li>
          <li><strong>Hairstyle & Silhouette:</strong> Matching espresso swept-back hairstyle, crown volume, textured bangs, and sweeping locks.</li>
          <li><strong>Flight Jacket & Collar:</strong> Distressed brown leather texture, fleece shearling collar, and matching brass-ring harness.</li>
          <li><strong>Lighting Scheme:</strong> Direction 3 warm key lighting from viewer's right with cool cyan/teal rim lighting on viewer's left edge.</li>
        </ul>
      </div>
    </div>

    <!-- Col 3: Full-Body Anatomy & Segmentation Readiness -->
    <div class="zoom-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">4. FULL-BODY ANATOMY & COSTUME AUDIT</div>
          <div class="card-sub">Limbs, Hands, Cargo Trousers & Boots Verification</div>
        </div>
        <ul class="audit-list">
          <li><strong>A-Pose Separation:</strong> Arms clearly abducted away from torso flanks with negative space beneath armpits to allow clean layer segmentation.</li>
          <li><strong>Hands & Fingers:</strong> Both hands fully visible in natural relaxed posture with anatomically defined knuckles and individual fingers.</li>
          <li><strong>Cargo Trousers:</strong> Olive-drab/khaki cargo trousers with authentic fabric folds, belt buckle, and distinct thigh pocket flaps.</li>
          <li><strong>Combat Boots:</strong> Dark brown lace-up combat boots with rugged lug soles, fully visible on ground plane with zero cropping.</li>
          <li><strong>Segmentation Readiness:</strong> Clean silhouette against solid neutral grey background, ready for direct pixel segmentation and hidden-overlap reconstruction.</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">5. PRODUCTION SPECIFICATIONS</div>
          <div class="card-sub">Resolution & Pipeline Alignment</div>
        </div>
        <ul class="audit-list">
          <li><strong>Composition:</strong> High-resolution 9:16 vertical portrait composition, character occupying full vertical span with breathing room.</li>
          <li><strong>Preservation:</strong> Original source file preserved unmodified in <code>development/narrivo-hybrid/poc/raster-split/source/00_master_full_body.jpg</code>.</li>
          <li><strong>Next Steps (Post-Approval):</strong> Apply direct segmentation and hidden-overlap reconstruction to extract head, hair, neck, torso, collar, arms, hands, trousers, and boots.</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'full_body_master_review.html'), html);

// Render headless screenshot
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outPng = path.join(rendersDir, 'full_body_master_review.png');
execFileSync(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1920,1180',
  '--virtual-time-budget=2500',
  `--screenshot=${outPng}`,
  'file:///' + path.join(rootDir, 'full_body_master_review.html').replace(/\\/g, '/')
]);
fs.copyFileSync(outPng, path.join(artifactDir, 'full_body_master_review.png'));
console.log('Comparison review render complete.');
