const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. Component Gallery HTML (All 13 processed transparent PNGs on checkerboard)
const galleryHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gate 2 — Extracted Transparent Component Gallery</title>
  <style>
    body {
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px 32px;
    }
    header {
      border-bottom: 1px solid #232f4a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 { font-size: 20px; margin: 0 0 4px 0; color: #f8fafc; }
    p { font-size: 13px; color: #94a3b8; margin: 0; }
    .badge {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
    }
    .card {
      background: #141b2d;
      border: 1px solid #232f4a;
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 6px;
      text-align: center;
    }
    .checkerboard {
      width: 100%;
      height: 210px;
      background-image:
        linear-gradient(45deg, #1e2536 25%, transparent 25%),
        linear-gradient(-45deg, #1e2536 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e2536 75%),
        linear-gradient(-45deg, transparent 75%, #1e2536 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      background-color: #151a28;
      border-radius: 6px;
      border: 1px solid #293552;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 6px;
      box-sizing: border-box;
    }
    .checkerboard img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .note {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 8px;
      line-height: 1.35;
      width: 100%;
    }
    .note .err { color: #f87171; font-weight: 600; }
    .note .ok { color: #34d399; font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Gate 2 Quality Control — Extracted Transparent Component Layers (13 PNGs)</h1>
      <p>Each component generated from the approved Master Bust reference, keyed from flat #7A7A7A grey to transparent PNG, and inspected prior to assembly.</p>
    </div>
    <div class="badge">QC Result: Style & Anatomy Drift Detected — STOP Condition Triggered</div>
  </header>
  <div class="grid">
    <div class="card">
      <div class="card-title">1. Back Hair / Nape (684×838)</div>
      <div class="checkerboard"><img src="processed/01_back_hair.png"></div>
      <div class="note"><span class="err">Perspective Error:</span> Generated 180° rear view of head/ears/neck instead of back-layer behind front face.</div>
    </div>
    <div class="card">
      <div class="card-title">2. Head & Face Base (618×828)</div>
      <div class="checkerboard"><img src="processed/02_head_face_base.png"></div>
      <div class="note"><span class="err">Lighting Flip:</span> Cyan rim light flipped to viewer's right (was viewer's left on Master Bust).</div>
    </div>
    <div class="card">
      <div class="card-title">3. Front Hair / Bangs (713×768)</div>
      <div class="checkerboard"><img src="processed/03_front_hair.png"></div>
      <div class="note"><span class="err">Shape Drift:</span> Redrawn as wide curtain bangs + detached floating sideburn tufts; does not fit cranium.</div>
    </div>
    <div class="card">
      <div class="card-title">4. Neck Column (631×708)</div>
      <div class="checkerboard"><img src="processed/04_neck.png"></div>
      <div class="note"><span class="err">Style & Angle Drift:</span> Worm's-eye anatomical medical etching with exposed tracheal rings.</div>
    </div>
    <div class="card">
      <div class="card-title">5. Jacket Torso (838×937)</div>
      <div class="checkerboard"><img src="processed/05_jacket_torso.png"></div>
      <div class="note"><span class="err">Garment Drift:</span> Added cap-sleeve pauldrons & stand-up leather collar; cyan rim light lost.</div>
    </div>
    <div class="card">
      <div class="card-title">6a. Left Shearling Collar (421×686)</div>
      <div class="checkerboard"><img src="processed/06_collar_left.png"></div>
      <div class="note"><span class="err">Contour Mismatch:</span> Floating C-curve does not match torso's stand-up collar geometry.</div>
    </div>
    <div class="card">
      <div class="card-title">6b. Right Shearling Collar (421×686)</div>
      <div class="checkerboard"><img src="processed/06_collar_right.png"></div>
      <div class="note"><span class="err">Contour Mismatch:</span> Incompatible inner neck radius vs. torso opening.</div>
    </div>
    <div class="card">
      <div class="card-title">7a. Left Upper Arm (336×868)</div>
      <div class="checkerboard"><img src="processed/07_upper_arm_left.png"></div>
      <div class="note"><span class="err">Anatomy Error:</span> Generated full arm down to buttoned wrist cuff instead of upper arm only.</div>
    </div>
    <div class="card">
      <div class="card-title">7b. Right Upper Arm (336×868)</div>
      <div class="checkerboard"><img src="processed/07_upper_arm_right.png"></div>
      <div class="note"><span class="err">Anatomy & Light Error:</span> Full arm with wrist cuff; cyan rim light on wrong side.</div>
    </div>
    <div class="card">
      <div class="card-title">8a. Left Forearm (387×753)</div>
      <div class="checkerboard"><img src="processed/08_forearm_left.png"></div>
      <div class="note"><span class="err">Style Drift:</span> Oversized stitched elbow pad + dual-sided cyan rim light + ribbed cuff.</div>
    </div>
    <div class="card">
      <div class="card-title">8b. Right Forearm (388×753)</div>
      <div class="checkerboard"><img src="processed/08_forearm_right.png"></div>
      <div class="note"><span class="err">Style Drift:</span> Incompatible with upper arm (which already has a buttoned wrist cuff).</div>
    </div>
    <div class="card">
      <div class="card-title">9a. Left Hand (393×808)</div>
      <div class="checkerboard"><img src="processed/09_hand_left.png"></div>
      <div class="note"><span class="err">Style & Pose Drift:</span> Flat dorsal mannequin hand with hard wrist cut line below tab.</div>
    </div>
    <div class="card">
      <div class="card-title">9b. Right Hand (393×808)</div>
      <div class="checkerboard"><img src="processed/09_hand_right.png"></div>
      <div class="note"><span class="err">Shading Drift:</span> Lacks master bust's painted skin contrast and directional rim light.</div>
    </div>
    <div class="card" style="grid-column: span 2; justify-content: center; background: rgba(239, 68, 68, 0.07); border-color: rgba(239, 68, 68, 0.35); padding: 16px;">
      <div class="card-title" style="color: #f87171; font-size: 14px;">Gate 2 Empirical Finding</div>
      <div class="note" style="font-size: 12px; line-height: 1.55;">
        While alpha extraction from neutral #7A7A7A grey succeeded cleanly with zero magenta halo contamination, <strong>generating body parts as separate AI image calls produced severe inter-part incompatibilities</strong>: flipped rim lighting, incompatible collar/shoulder geometry, full-arm duplication in the upper-arm asset, worm's-eye neck perspective, and mismatched hair silhouette.
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'gate2_component_gallery.html'), galleryHtml, 'utf8');

// 2. Assembled Character vs Approved Master HTML
const assembledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gate 2 — Assembled Components vs. Approved Master Bust</title>
  <style>
    body {
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px 32px;
    }
    header {
      border-bottom: 1px solid #232f4a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    p { font-size: 13px; color: #94a3b8; margin: 0; }
    .badge {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr 380px;
      gap: 20px;
      align-items: stretch;
    }
    .panel {
      background: #141b2d;
      border: 1px solid #232f4a;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .panel h2 {
      font-size: 14px;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 12px 0;
      align-self: flex-start;
    }
    .stage {
      width: 640px;
      height: 854px;
      background: #7A7A7A;
      border-radius: 8px;
      border: 1px solid #334155;
      position: relative;
      overflow: hidden;
    }
    .stage.checker {
      background-image:
        linear-gradient(45deg, #242c3d 25%, transparent 25%),
        linear-gradient(-45deg, #242c3d 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #242c3d 75%),
        linear-gradient(-45deg, transparent 75%, #242c3d 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
      background-color: #1a202e;
    }
    .stage img.master {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .layer {
      position: absolute;
      transform-origin: center center;
    }
    .diag-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .diag-item {
      background: rgba(15, 23, 42, 0.65);
      border-left: 3px solid #f87171;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.5;
    }
    .diag-item strong { color: #f8fafc; display: block; margin-bottom: 2px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Gate 2 Quality Control — Assembled Components vs. Approved Master Bust</h1>
      <p>Side-by-side comparison of the Gate 1 Approved Master Bust and the composite character assembled from the 13 individually generated components.</p>
    </div>
    <div class="badge">STOP CONDITION MET: Inconsistencies Reported Below</div>
  </header>
  <div class="grid">
    <div class="panel">
      <h2>1. Approved Gate 1 Master Bust (Reference)</h2>
      <div class="stage">
        <img class="master" src="source/00_master_bust.jpg">
      </div>
    </div>

    <div class="panel">
      <h2>2. Assembled from Individually Generated Components</h2>
      <div class="stage checker">
        <!-- Z-order assembly of the generated components matched to bust scale -->
        <!-- 1. Back hair -->
        <img class="layer" src="processed/01_back_hair.png" style="width: 390px; left: 125px; top: 38px; opacity: 0.95;">
        <!-- 7. Upper arms -->
        <img class="layer" src="processed/07_upper_arm_left.png" style="width: 185px; left: -10px; top: 470px; transform: rotate(8deg);">
        <img class="layer" src="processed/07_upper_arm_right.png" style="width: 185px; left: 465px; top: 470px; transform: rotate(-8deg);">
        <!-- 5. Jacket Torso -->
        <img class="layer" src="processed/05_jacket_torso.png" style="width: 560px; left: 40px; top: 385px;">
        <!-- 4. Neck -->
        <img class="layer" src="processed/04_neck.png" style="width: 250px; left: 195px; top: 325px;">
        <!-- 6. Shearling Collar Left & Right -->
        <img class="layer" src="processed/06_collar_left.png" style="width: 185px; left: 108px; top: 332px;">
        <img class="layer" src="processed/06_collar_right.png" style="width: 185px; left: 347px; top: 332px;">
        <!-- 2. Head & Face Base -->
        <img class="layer" src="processed/02_head_face_base.png" style="width: 286px; left: 177px; top: 102px;">
        <!-- 3. Front Hair -->
        <img class="layer" src="processed/03_front_hair.png" style="width: 356px; left: 142px; top: 28px;">
      </div>
    </div>

    <div class="panel">
      <h2>3. Quality Control Audit Findings</h2>
      <div class="diag-list">
        <div class="diag-item">
          <strong>1. Hair Silhouette & Fit Mismatch</strong>
          The separately generated front hair (<code>03_front_hair</code>) has a different part line, curtain-bangs geometry, and detached sideburn tufts that fail to wrap the bald cranium of <code>02_head_face_base</code>, leaving exposed skull temples and floating hair locks.
        </div>
        <div class="diag-item">
          <strong>2. Back Hair 180° Perspective Inversion</strong>
          <code>01_back_hair</code> was generated as the back of a head facing away from the camera (including rear ears and rear neck skin), producing double-ears and conflicting hair spikes behind the face.
        </div>
        <div class="diag-item">
          <strong>3. Reversed Rim Lighting Direction</strong>
          On the Master Bust, the cyan rim light is on the viewer's left. On <code>02_head_face_base</code> and <code>07_upper_arm_right</code>, the generator flipped the cyan rim light to the viewer's right, while <code>05_jacket_torso</code> omitted it entirely.
        </div>
        <div class="diag-item">
          <strong>4. Neck Perspective & Style Drift</strong>
          <code>04_neck</code> rendered in a worm's-eye anatomical etching style with exposed tracheal rings and an upward chin shelf that clashes with the straight-on head and henley shirt.
        </div>
        <div class="diag-item">
          <strong>5. Collar & Shoulder Geometry Conflict</strong>
          <code>05_jacket_torso</code> invented a stand-up leather collar and rigid shoulder pauldrons. Layering <code>06_shearling_collar</code> and <code>07_upper_arms</code> on top creates double-collars and protruding pauldron ledges.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'gate2_assembled_vs_master.html'), assembledHtml, 'utf8');

// 3. High-Zoom Seam & Consistency Inspection HTML
const zoomHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gate 2 — High-Zoom Seam & Consistency Inspection</title>
  <style>
    body {
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px 32px;
    }
    header {
      border-bottom: 1px solid #232f4a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    p { font-size: 13px; color: #94a3b8; margin: 0; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .zoom-card {
      background: #141b2d;
      border: 1px solid #232f4a;
      border-radius: 10px;
      padding: 14px;
    }
    .zoom-title {
      font-size: 14px;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .zoom-title span.tag {
      color: #f87171;
      font-size: 11px;
      text-transform: uppercase;
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .viewport {
      height: 340px;
      border-radius: 6px;
      border: 1px solid #334155;
      position: relative;
      overflow: hidden;
      background: #1a202e;
    }
    .viewport-label {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(11, 15, 25, 0.85);
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      z-index: 20;
      border: 1px solid #334155;
    }
    .caption {
      margin-top: 10px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Gate 2 Quality Control — High-Zoom Inspection (Hair, Neck, Collar, Shoulders)</h1>
      <p>2.5× magnified comparison between the Approved Master Bust and the Assembled Generated Components at key anatomical junctions.</p>
    </div>
  </header>
  <div class="grid">
    <!-- Panel 1: Hair & Cranium -->
    <div class="zoom-card">
      <div class="zoom-title">
        <span>A. Hair & Cranium Junction (2.5× Zoom)</span>
        <span class="tag">Fail: Silhouette & Lighting Mismatch</span>
      </div>
      <div class="pair">
        <div class="viewport">
          <div class="viewport-label">Master Bust Reference</div>
          <img src="source/00_master_bust.jpg" style="position:absolute; width: 700px; left: -140px; top: -40px;">
        </div>
        <div class="viewport">
          <div class="viewport-label">Assembled Components</div>
          <img src="processed/01_back_hair.png" style="position:absolute; width: 420px; left: 0px; top: 10px;">
          <img src="processed/02_head_face_base.png" style="position:absolute; width: 310px; left: 55px; top: 80px;">
          <img src="processed/03_front_hair.png" style="position:absolute; width: 385px; left: 18px; top: 0px;">
        </div>
      </div>
      <div class="caption">
        <strong>Findings:</strong> Exposed bald cranium gap on left temple; front hair bangs completely re-styled; detached sideburn tufts floating over cheeks; cyan rim light on face is on the opposite side from the hair's cyan rim light.
      </div>
    </div>

    <!-- Panel 2: Neck & Jawline -->
    <div class="zoom-card">
      <div class="zoom-title">
        <span>B. Neck & Jawline Junction (2.5× Zoom)</span>
        <span class="tag">Fail: Perspective & Texture Drift</span>
      </div>
      <div class="pair">
        <div class="viewport">
          <div class="viewport-label">Master Bust Reference</div>
          <img src="source/00_master_bust.jpg" style="position:absolute; width: 760px; left: -170px; top: -360px;">
        </div>
        <div class="viewport">
          <div class="viewport-label">Assembled Components</div>
          <img src="processed/05_jacket_torso.png" style="position:absolute; width: 620px; left: -100px; top: 120px;">
          <img src="processed/04_neck.png" style="position:absolute; width: 280px; left: 70px; top: 45px;">
          <img src="processed/02_head_face_base.png" style="position:absolute; width: 310px; left: 55px; top: -195px;">
        </div>
      </div>
      <div class="caption">
        <strong>Findings:</strong> The generated neck (<code>04_neck</code>) was drawn from a low worm's-eye angle with harsh anatomical cross-hatching and visible tracheal rings, conflicting with the smooth painterly shading of the Master Bust's throat.
      </div>
    </div>

    <!-- Panel 3: Shearling Collar & Throat -->
    <div class="zoom-card">
      <div class="zoom-title">
        <span>C. Shearling Collar & Henley Opening (2.5× Zoom)</span>
        <span class="tag">Fail: Double Collar & Seam Gaps</span>
      </div>
      <div class="pair">
        <div class="viewport">
          <div class="viewport-label">Master Bust Reference</div>
          <img src="source/00_master_bust.jpg" style="position:absolute; width: 700px; left: -140px; top: -420px;">
        </div>
        <div class="viewport">
          <div class="viewport-label">Assembled Components</div>
          <img src="processed/05_jacket_torso.png" style="position:absolute; width: 600px; left: -90px; top: 40px;">
          <img src="processed/04_neck.png" style="position:absolute; width: 260px; left: 80px; top: -20px;">
          <img src="processed/06_collar_left.png" style="position:absolute; width: 200px; left: -10px; top: -10px;">
          <img src="processed/06_collar_right.png" style="position:absolute; width: 200px; left: 230px; top: -10px;">
        </div>
      </div>
      <div class="caption">
        <strong>Findings:</strong> Because <code>05_jacket_torso</code> invented an upright brown leather collar around the henley shirt, placing the separated shearling collar halves (<code>06_collar_left/right</code>) on top leaves the extra leather stand-up collar sticking out between them.
      </div>
    </div>

    <!-- Panel 4: Shoulders & Upper Arms -->
    <div class="zoom-card">
      <div class="zoom-title">
        <span>D. Shoulders, Harness & Upper Arms (2.5× Zoom)</span>
        <span class="tag">Fail: Pauldron Ledges & Full-Arm Duplication</span>
      </div>
      <div class="pair">
        <div class="viewport">
          <div class="viewport-label">Master Bust Reference</div>
          <img src="source/00_master_bust.jpg" style="position:absolute; width: 660px; left: -120px; top: -520px;">
        </div>
        <div class="viewport">
          <div class="viewport-label">Assembled Components</div>
          <img src="processed/07_upper_arm_left.png" style="position:absolute; width: 200px; left: -20px; top: 80px; transform: rotate(8deg);">
          <img src="processed/07_upper_arm_right.png" style="position:absolute; width: 200px; left: 240px; top: 80px; transform: rotate(-8deg);">
          <img src="processed/05_jacket_torso.png" style="position:absolute; width: 460px; left: -20px; top: 10px;">
        </div>
      </div>
      <div class="caption">
        <strong>Findings:</strong> Prompting for "rounded shoulder socket overlap caps" caused the generator to draw flared armor-like cap sleeves on <code>05_jacket_torso</code>, while <code>07_upper_arms</code> generated entire bent arms down to the wrist cuffs with no cyan rim light on the left shoulder.
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'gate2_zoom_inspection.html'), zoomHtml, 'utf8');
console.log('Generated all 3 Gate 2 inspection HTML pages!');
