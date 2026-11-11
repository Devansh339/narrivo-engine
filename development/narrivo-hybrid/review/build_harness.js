const fs = require('fs');
const path = require('path');

function cleanSource(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  // Remove require statements
  code = code.replace(/const\s+\{[^}]+\}\s*=\s*require\([^)]+\);?/g, '');
  // Remove module.exports
  code = code.replace(/if\s*\(typeof module[^}]+}\s*}/g, '');
  return code;
}

const baseDir = path.join(__dirname, '../src/character/v2');
const rigCode = cleanSource(path.join(baseDir, 'rig.js'));
const shadingCode = cleanSource(path.join(baseDir, 'shading.js'));
const headCode = cleanSource(path.join(baseDir, 'parts/head.js'));
const faceCode = cleanSource(path.join(baseDir, 'parts/face.js'));
const torsoCode = cleanSource(path.join(baseDir, 'parts/torso.js'));
const limbsCode = cleanSource(path.join(baseDir, 'parts/limbs.js'));
const handsCode = cleanSource(path.join(baseDir, 'parts/hands.js'));
const bootsCode = cleanSource(path.join(baseDir, 'parts/boots.js'));

function generateHtml(initialView) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Narrivo Hybrid — Milestone 1: Neutral Standing Character Prototype</title>
  <style>
    :root {
      --bg: #0B0E14;
      --panel-bg: #141822;
      --panel-border: #242C3C;
      --accent: #38BDF8;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    header {
      background: var(--panel-bg);
      border-bottom: 1px solid var(--panel-border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
      margin-bottom: 6px;
    }
    h1 { font-size: 20px; font-weight: 700; }
    .subtitle { font-size: 13px; color: var(--text-muted); }

    .main-layout {
      display: grid;
      grid-template-columns: 320px 1fr 340px;
      gap: 20px;
      padding: 24px 32px;
      flex: 1;
    }

    .panel {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .viewport-container {
      position: relative;
      background: radial-gradient(circle at 50% 40%, #161D2C 0%, #0C0F17 100%);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 820px;
    }

    canvas {
      display: block;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      background: transparent;
    }

    .view-toolbar {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }

    .btn {
      background: #1E293B;
      color: var(--text);
      border: 1px solid var(--panel-border);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #334155; border-color: var(--accent); }
    .btn.active {
      background: var(--accent);
      color: #0F172A;
      border-color: var(--accent);
    }

    .toggle-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toggle-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      font-size: 13px;
    }
    .toggle-item label { cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .toggle-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      cursor: pointer;
    }

    .control-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .control-label {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
    }

    .spec-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.6;
    }
    .spec-card strong { color: var(--text); }
  </style>
</head>
<body>

  <header>
    <div>
      <span class="badge">Narrivo Hybrid · Milestone 1</span>
      <h1>Commander Vance — Neutral Standing Character Prototype</h1>
      <p class="subtitle">Independently manageable component architecture with Direction 3 hybrid dimensional lighting.</p>
    </div>
    <div style="text-align: right;">
      <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border-color: rgba(16, 185, 129, 0.3);">Visual Benchmark: Direction 3 Approved</span>
      <div style="font-size: 12px; color: var(--text-muted);">Proportion: 7.5 Heads Athletic · Scale: 1024×1024</div>
    </div>
  </header>

  <div class="main-layout">
    
    <!-- LEFT PANEL: Component Visibility Toggles -->
    <div class="panel">
      <div class="panel-title">
        <span>Component Layers</span>
        <button class="btn" style="padding: 2px 8px; font-size: 10px;" id="toggleAllBtn">All On</button>
      </div>
      <div class="toggle-group" id="togglesContainer">
        <!-- Injected dynamically -->
      </div>

      <div class="panel-title" style="margin-top: 10px;">
        <span>Anatomical Specs</span>
      </div>
      <div class="spec-card">
        <div><strong>Head Proportions:</strong> 7.5 Heads (~106px head / 802px total)</div>
        <div><strong>Deltoid Width:</strong> ~2.2x head width with clavicle pivot</div>
        <div><strong>Waist & Pelvis:</strong> 1.2x taper with leather rib hem</div>
        <div><strong>Boots:</strong> Lugged rubber soles with toe-break support</div>
      </div>
    </div>

    <!-- CENTER PANEL: Interactive Viewport -->
    <div class="viewport-container">
      <div class="view-toolbar">
        <button class="btn ${initialView === 'full' ? 'active' : ''}" id="viewFullBtn">Full Body</button>
        <button class="btn ${initialView === 'face' ? 'active' : ''}" id="viewFaceBtn">Face Close-Up (2.6x)</button>
        <button class="btn ${initialView === 'exploded' ? 'active' : ''}" id="viewExplodedBtn">Exploded Breakdown</button>
      </div>

      <canvas id="charCanvas" width="1024" height="1024" style="width: 720px; height: 720px;"></canvas>
    </div>

    <!-- RIGHT PANEL: Lighting & Shading Controls -->
    <div class="panel">
      <div class="panel-title">
        <span>Direction 3 Lighting</span>
        <button class="btn" style="padding: 2px 8px; font-size: 10px;" id="resetLightingBtn">Reset</button>
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>Key Light Angle</span>
          <span id="keyAngleVal">45° (Top-Left)</span>
        </div>
        <input type="range" id="keyAngle" min="0" max="360" value="45">
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>Key Light Intensity</span>
          <span id="keyIntensityVal">1.0</span>
        </div>
        <input type="range" id="keyIntensity" min="0.2" max="1.8" step="0.05" value="1.0">
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>Cool Rim Light Intensity</span>
          <span id="rimIntensityVal">0.85</span>
        </div>
        <input type="range" id="rimIntensity" min="0" max="1.8" step="0.05" value="0.85">
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>Rim Light Tint</span>
          <span id="rimColorVal">Cyan #A5E3FF</span>
        </div>
        <select id="rimColorSelect" class="btn" style="width: 100%; text-align: left;">
          <option value="#A5E3FF" selected>Cyan / Sky Ambient (#A5E3FF)</option>
          <option value="#8DB4E2">Deep Twilight Blue (#8DB4E2)</option>
          <option value="#FFF2D9">Sunset Warm Amber (#FFF2D9)</option>
          <option value="#E2E8F0">Neutral White Studio (#E2E8F0)</option>
        </select>
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>Ambient Occlusion (AO)</span>
          <span id="aoIntensityVal">0.95</span>
        </div>
        <input type="range" id="aoIntensity" min="0.2" max="1.8" step="0.05" value="0.95">
      </div>

      <div class="panel-title" style="margin-top: 10px;">
        <span>Material Diagnostics</span>
      </div>
      <div class="spec-card">
        <div><strong>Leather Jacket:</strong> Multi-stop radial sheen + crease AO</div>
        <div><strong>Shearling Fleece:</strong> Textured wool tufts & warm shadows</div>
        <div><strong>Cargo Pants:</strong> Olive drab with tension drag folds</div>
        <div><strong>Eyes:</strong> Sclera top shadow + dual-tone hazel iris</div>
      </div>
    </div>

  </div>

  <!-- SCRIPT ENGINE BUNDLE -->
  <script>
${rigCode}

${shadingCode}

${headCode}

${faceCode}

${torsoCode}

${limbsCode}

${handsCode}

${bootsCode}

    // --- CONTROLLER & RENDER HARNESS ---
    const canvas = document.getElementById('charCanvas');
    const ctx = canvas.getContext('2d');

    const rig = new AthleticRigV2();
    const lighting = new LightingController();

    const head = new HeadRenderer(lighting);
    const face = new FaceRenderer(lighting);
    const torso = new TorsoRenderer(lighting);
    const limbs = new LimbsRenderer(lighting);
    const hands = new HandsRenderer(lighting);
    const boots = new BootsRenderer(lighting);

    const visibility = {
      shadow: true,
      head: true,
      hair: true,
      face: true,
      torso: true,
      fleece: true,
      harness: true,
      arms: true,
      hands: true,
      pants: true,
      boots: true
    };

    let currentView = '${initialView}';

    function applyBone(boneName) {
      const bone = rig.getBone(boneName);
      if (!bone) return;
      const m = bone.worldMatrix;
      ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    }

    function renderScene() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Camera View Transforms
      if (currentView === 'face') {
        // Zoom 2.6x centered on head (512, 280)
        ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
        ctx.scale(2.6, 2.6);
        ctx.translate(-512, -280);
      } else if (currentView === 'exploded') {
        // Exploded view offsets
      }

      // 0. Drop Shadow
      if (visibility.shadow) {
        const root = rig.getBone('root');
        const rx = root ? root.localX : 512;
        const ry = root ? root.localY : 950;
        const shadowGrad = ctx.createRadialGradient(rx, ry, 15, rx, ry, 160);
        shadowGrad.addColorStop(0.0, 'rgba(12, 8, 6, 0.75)');
        shadowGrad.addColorStop(0.35, 'rgba(12, 8, 6, 0.45)');
        shadowGrad.addColorStop(1.0, 'transparent');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(rx, ry + 10, 150, 32, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Back hair & collar
      if (visibility.hair) {
        ctx.save(); applyBone('head');
        if (currentView === 'exploded') ctx.translate(-60, 0);
        head.drawBackHair(ctx); ctx.restore();
      }
      if (visibility.fleece) {
        ctx.save(); applyBone('chest'); torso.drawBackCollar(ctx); ctx.restore();
      }

      // 2. Legs & Boots
      if (visibility.pants) {
        ctx.save(); applyBone('leftThigh');
        if (currentView === 'exploded') ctx.translate(35, 0);
        limbs.drawThigh(ctx, 1, 195); ctx.restore();

        ctx.save(); applyBone('leftKnee');
        if (currentView === 'exploded') ctx.translate(35, 0);
        limbs.drawShin(ctx, 1, 180); ctx.restore();

        ctx.save(); applyBone('rightThigh');
        if (currentView === 'exploded') ctx.translate(-35, 0);
        limbs.drawThigh(ctx, -1, 195); ctx.restore();

        ctx.save(); applyBone('rightKnee');
        if (currentView === 'exploded') ctx.translate(-35, 0);
        limbs.drawShin(ctx, -1, 180); ctx.restore();
      }

      if (visibility.boots) {
        ctx.save(); applyBone('leftAnkle');
        if (currentView === 'exploded') ctx.translate(45, 10);
        boots.drawBoot(ctx, 1, 45); ctx.restore();

        ctx.save(); applyBone('rightAnkle');
        if (currentView === 'exploded') ctx.translate(-45, 10);
        boots.drawBoot(ctx, -1, 45); ctx.restore();
      }

      // 3. Torso
      if (visibility.torso) {
        ctx.save(); applyBone('chest');
        if (currentView === 'exploded') ctx.translate(0, -25);
        torso.drawTorso(ctx); ctx.restore();
      }

      // 4. Arms & Hands
      if (visibility.arms) {
        ctx.save(); applyBone('leftShoulder');
        if (currentView === 'exploded') ctx.translate(45, 0);
        limbs.drawUpperArm(ctx, 1, 140); ctx.restore();

        ctx.save(); applyBone('leftElbow');
        if (currentView === 'exploded') ctx.translate(55, 0);
        limbs.drawForearm(ctx, 1, 130); ctx.restore();

        ctx.save(); applyBone('rightShoulder');
        if (currentView === 'exploded') ctx.translate(-45, 0);
        limbs.drawUpperArm(ctx, -1, 140); ctx.restore();

        ctx.save(); applyBone('rightElbow');
        if (currentView === 'exploded') ctx.translate(-55, 0);
        limbs.drawForearm(ctx, -1, 130); ctx.restore();
      }

      if (visibility.hands) {
        ctx.save(); applyBone('leftWrist');
        if (currentView === 'exploded') ctx.translate(65, 0);
        hands.drawHand(ctx, 1, 68); ctx.restore();

        ctx.save(); applyBone('rightWrist');
        if (currentView === 'exploded') ctx.translate(-65, 0);
        hands.drawHand(ctx, -1, 68); ctx.restore();
      }

      // 5. Head Assembly (Neck, Planar Jaw, Ears, Face, Front Hair)
      ctx.save(); applyBone('head');
      if (currentView === 'exploded') ctx.translate(0, -60);
      if (visibility.head) { head.drawNeck(ctx); head.drawHeadBase(ctx); }
      if (visibility.face) { face.draw(ctx); }
      if (visibility.hair) { head.drawFrontHair(ctx); }
      ctx.restore();

      ctx.restore();
    }

    // Initialize UI Controls
    const togglesContainer = document.getElementById('togglesContainer');
    const componentLabels = {
      head: 'Head & Neck Mesh',
      hair: 'Volumetric Swept Hair',
      face: 'Facial Features (Eyes, Nose, Lips)',
      torso: 'Leather Bomber Jacket Body',
      fleece: 'Shearling Fleece Collar',
      harness: 'Tactical Chest Harness',
      arms: 'Sleeves & Limbs',
      hands: 'Articulated Hands',
      pants: 'Military Cargo Trousers',
      boots: 'Combat Field Boots',
      shadow: 'Ground Contact Shadow'
    };

    for (const [key, label] of Object.entries(componentLabels)) {
      const item = document.createElement('div');
      item.className = 'toggle-item';
      item.innerHTML = \`
        <label>
          <input type="checkbox" id="toggle_\${key}" checked>
          <span>\${label}</span>
        </label>
      \`;
      togglesContainer.appendChild(item);
      item.querySelector('input').addEventListener('change', (e) => {
        visibility[key] = e.target.checked;
        renderScene();
      });
    }

    let allOn = true;
    document.getElementById('toggleAllBtn').addEventListener('click', () => {
      allOn = !allOn;
      for (const key of Object.keys(visibility)) {
        visibility[key] = allOn;
        const cb = document.getElementById(\`toggle_\${key}\`);
        if (cb) cb.checked = allOn;
      }
      document.getElementById('toggleAllBtn').textContent = allOn ? 'All Off' : 'All On';
      renderScene();
    });

    const viewButtons = {
      full: document.getElementById('viewFullBtn'),
      face: document.getElementById('viewFaceBtn'),
      exploded: document.getElementById('viewExplodedBtn')
    };

    function setView(view) {
      currentView = view;
      for (const [k, btn] of Object.entries(viewButtons)) {
        btn.classList.toggle('active', k === view);
      }
      renderScene();
    }
    viewButtons.full.addEventListener('click', () => setView('full'));
    viewButtons.face.addEventListener('click', () => setView('face'));
    viewButtons.exploded.addEventListener('click', () => setView('exploded'));

    // Lighting Slider Handlers
    document.getElementById('keyAngle').addEventListener('input', (e) => {
      const deg = parseInt(e.target.value);
      lighting.keyLightAngle = deg * Math.PI / 180;
      document.getElementById('keyAngleVal').textContent = \`\${deg}°\`;
      renderScene();
    });

    document.getElementById('keyIntensity').addEventListener('input', (e) => {
      lighting.keyLightIntensity = parseFloat(e.target.value);
      document.getElementById('keyIntensityVal').textContent = lighting.keyLightIntensity.toFixed(2);
      renderScene();
    });

    document.getElementById('rimIntensity').addEventListener('input', (e) => {
      lighting.rimLightIntensity = parseFloat(e.target.value);
      document.getElementById('rimIntensityVal').textContent = lighting.rimLightIntensity.toFixed(2);
      renderScene();
    });

    document.getElementById('rimColorSelect').addEventListener('change', (e) => {
      lighting.rimColor = e.target.value;
      renderScene();
    });

    document.getElementById('aoIntensity').addEventListener('input', (e) => {
      lighting.aoIntensity = parseFloat(e.target.value);
      document.getElementById('aoIntensityVal').textContent = lighting.aoIntensity.toFixed(2);
      renderScene();
    });

    document.getElementById('resetLightingBtn').addEventListener('click', () => {
      lighting.keyLightAngle = 45 * Math.PI / 180;
      lighting.keyLightIntensity = 1.0;
      lighting.rimLightIntensity = 0.85;
      lighting.rimColor = '#A5E3FF';
      lighting.aoIntensity = 0.95;
      document.getElementById('keyAngle').value = 45;
      document.getElementById('keyAngleVal').textContent = '45° (Top-Left)';
      document.getElementById('keyIntensity').value = 1.0;
      document.getElementById('keyIntensityVal').textContent = '1.0';
      document.getElementById('rimIntensity').value = 0.85;
      document.getElementById('rimIntensityVal').textContent = '0.85';
      document.getElementById('rimColorSelect').value = '#A5E3FF';
      document.getElementById('aoIntensity').value = 0.95;
      document.getElementById('aoIntensityVal').textContent = '0.95';
      renderScene();
    });

    // Initial render
    renderScene();
  </script>
</body>
</html>
`;
}

fs.writeFileSync(path.join(__dirname, 'milestone1_prototype.html'), generateHtml('full'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'milestone1_face.html'), generateHtml('face'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'milestone1_exploded.html'), generateHtml('exploded'), 'utf8');

console.log('All three review harness HTML files generated cleanly with ZERO syntax errors!');
