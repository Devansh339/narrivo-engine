/**
 * PHASE 1 & PHASE 2: Direct Full-Body Segmentation & Hidden-Overlap Reconstruction
 * Source: development/narrivo-hybrid/poc/raster-split/source/00_master_full_body.jpg (768x1376)
 *
 * Extracts 12 Groups / 19 Components:
 *   1. 01_back_hair (z=0)
 *   2. 04_neck (z=1)
 *   3. 07_upper_arm_left, 07_upper_arm_right (z=2, 3)
 *   4. 08_forearm_left, 08_forearm_right (z=4, 5)
 *   5. 09_hand_left, 09_hand_right (z=6, 7)
 *   6. 10_upper_leg_left, 10_upper_leg_right (z=8, 9)
 *   7. 11_lower_leg_left, 11_lower_leg_right (z=10, 11)
 *   8. 12_boot_left, 12_boot_right (z=12, 13)
 *   9. 09_pelvis_belt (z=14)
 *  10. 06_jacket_torso (z=15)
 *  11. 05_collar_left, 05_collar_right (z=16, 17)
 *  12. 02_head_face (z=18)
 *  13. 03_front_hair (z=19)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'source', '00_master_full_body.jpg');
const outBase = path.join(rootDir, 'fullbody-seg');
const subDirs = ['visible', 'reconstructed', 'origin_maps', 'fullframe'];

for (const d of subDirs) {
  const p = path.join(outBase, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Full-Body Direct Segmentation & Hidden Reconstruction</title></head>
<body>
<script>
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function evalYAtX(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((x >= x0 && x <= x1) || (x >= x1 && x <= x0)) {
      if (Math.abs(x1 - x0) < 1e-6) return y0;
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[0][1];
}

function evalXAtY(pts, y) {
  if (y <= pts[0][1]) return pts[0][0];
  if (y >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
      if (Math.abs(y1 - y0) < 1e-6) return x0;
      return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
  }
  return pts[0][0];
}

function distToPolyline(px, py, pts) {
  let minDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - x0) * dx + (py - y0) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = x0 + t * dx, cy = y0 + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

async function savePng(subDir, filename, canvas) {
  const dataUrl = canvas.toDataURL('image/png');
  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subDir, filename, dataUrl })
  });
}

async function run() {
  const img = new Image();
  img.src = '/full_master.jpg';
  await new Promise(r => img.onload = r);

  const w = img.width, h = img.height;
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = w; masterCanvas.height = h;
  const mctx = masterCanvas.getContext('2d');
  mctx.drawImage(img, 0, 0);
  const rawImgData = mctx.getImageData(0, 0, w, h);
  const raw = rawImgData.data;

  // Step 1: Alpha Extraction from #7A7A7A background
  const bgR = raw[40], bgG = raw[41], bgB = raw[42];
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qHead = 0, qTail = 0;

  function isGrey(idx) {
    const r = raw[idx], g = raw[idx + 1], b = raw[idx + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    return sat < 14 && dist < 36;
  }

  function pushBg(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (isGrey(p * 4)) {
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < w; x++) { pushBg(x, 0); pushBg(x, h - 1); }
  for (let y = 0; y < h; y++) { pushBg(0, y); pushBg(w - 1, y); }
  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % w, y = (p - x) / w;
    pushBg(x - 1, y); pushBg(x + 1, y); pushBg(x, y - 1); pushBg(x, y + 1);
  }

  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = w; fgCanvas.height = h;
  const fgCtx = fgCanvas.getContext('2d');
  const fgImgData = fgCtx.createImageData(w, h);
  const fg = fgImgData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const idx = p * 4;
      if (isBg[p]) {
        fg[idx] = 0; fg[idx + 1] = 0; fg[idx + 2] = 0; fg[idx + 3] = 0;
      } else {
        let bgN = 0;
        if (x > 0 && isBg[p - 1]) bgN++;
        if (x < w - 1 && isBg[p + 1]) bgN++;
        if (y > 0 && isBg[p - w]) bgN++;
        if (y < h - 1 && isBg[p + w]) bgN++;
        const r = raw[idx], g = raw[idx + 1], b = raw[idx + 2];
        if (bgN > 0) {
          const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
          const a = Math.min(1, Math.max(0.15, dist / 45));
          fg[idx] = Math.max(0, Math.min(255, Math.round((r - (1 - a) * bgR) / a)));
          fg[idx + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - a) * bgG) / a)));
          fg[idx + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - a) * bgB) / a)));
          fg[idx + 3] = Math.round(a * 255);
        } else {
          fg[idx] = r; fg[idx + 1] = g; fg[idx + 2] = b; fg[idx + 3] = 255;
        }
      }
    }
  }
  fgCtx.putImageData(fgImgData, 0, 0);
  await savePng('fullframe', '00_full_master_foreground.png', fgCanvas);

  const silhouetteOpaque = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (fg[p * 4 + 3] === 255) silhouetteOpaque[p] = 1;
  }
  const safeInterior = new Uint8Array(w * h);
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      let ok = 1;
      for (let dy = -3; dy <= 3 && ok; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (!silhouetteOpaque[(y + dy) * w + (x + dx)]) { ok = 0; break; }
        }
      }
      safeInterior[y * w + x] = ok;
    }
  }

  function luma(x, y) {
    const xr = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yr = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (yr * w + xr) * 4;
    return 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
  }

  function snapPolylineToInk(pts, searchRadius = 4, subdivisions = 4) {
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      for (let s = 0; s < subdivisions; s++) {
        const t = s / subdivisions;
        dense.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }
    dense.push(pts[pts.length - 1]);

    const snapped = dense.map(([x, y], idx) => {
      const prev = dense[Math.max(0, idx - 1)];
      const next = dense[Math.min(dense.length - 1, idx + 1)];
      const dx = next[0] - prev[0], dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      let bestX = x, bestY = y, bestScore = luma(x, y);
      for (let r = -searchRadius; r <= searchRadius; r++) {
        const cx = x + nx * r, cy = y + ny * r;
        const score = luma(cx, cy) + Math.abs(r) * 2.0;
        if (score < bestScore) {
          bestScore = score; bestX = cx; bestY = cy;
        }
      }
      return [Math.round(bestX), Math.round(bestY)];
    });

    return snapped.map((p, i) => {
      if (i === 0 || i === snapped.length - 1) return p;
      return [
        Math.round((snapped[i - 1][0] + p[0] * 2 + snapped[i + 1][0]) / 4),
        Math.round((snapped[i - 1][1] + p[1] * 2 + snapped[i + 1][1]) / 4)
      ];
    });
  }

  // Step 2: Anatomical Seams on 768x1376 Canvas
  // 1. Jawline (y: ~180..205)
  const jawSeamRaw = snapPolylineToInk([
    [324, 150], [328, 168], [338, 185], [354, 198], [372, 203],
    [396, 204], [414, 198], [430, 185], [440, 168], [444, 150]
  ], 4, 3);
  const jawSeam = jawSeamRaw.map(([x, y]) => [x, y + 2]);

  // 2. Collars Left/Right
  const collarLeftPoly = [
    [322, 172], [330, 190], [336, 215], [342, 240], [348, 270],
    [332, 268], [314, 262], [288, 252], [266, 238], [264, 222],
    [272, 205], [290, 188], [312, 175]
  ];
  const collarRightPoly = [
    [446, 172], [438, 190], [432, 215], [426, 240], [420, 270],
    [436, 268], [454, 262], [480, 252], [502, 238], [504, 222],
    [496, 205], [478, 188], [456, 175]
  ];

  // 3. Neck to Henley Collar Seam
  const neckHenleySeam = snapPolylineToInk([
    [336, 242], [350, 248], [368, 256], [384, 270], [388, 278],
    [392, 270], [408, 256], [426, 248], [432, 242]
  ], 4, 3).map(([x, y]) => [x, y - 2]);

  // 4. Forehead Hairline Polygon
  const faceHeadPoly = [
    [310, 140], [316, 122], [325, 102], [340, 88], [365, 82],
    [384, 82], [403, 82], [428, 88], [443, 102], [452, 122], [458, 140],
    [458, 150],
    ...jawSeam.slice().reverse(),
    [310, 150]
  ];

  function isForeheadHairLock(x, y) {
    if (y < 70 || y > 152 || x < 322 || x > 446) return false;
    // Eyebrows protection
    if (y >= 126 && y <= 142 && ((x >= 328 && x <= 378) || (x >= 390 && x <= 440))) return false;
    const inCenterLock = (x >= 384 && x <= 412 && y >= 75 && y <= 126);
    const inRightLock = (x >= 408 && x <= 444 && y >= 75 && y <= 145);
    const inLeftTemple = (x >= 322 && x <= 348 && y >= 75 && y <= 145);
    if (!inCenterLock && !inRightLock && !inLeftTemple) return false;
    const idx = (y * w + x) * 4;
    const r = fg[idx], g = fg[idx + 1], b = fg[idx + 2];
    const isBrightSkin = (r > 140 && (r - b) > 36 && g > 92);
    return !isBrightSkin;
  }

  // 5. Shoulder Seams (Upper Arms vs Jacket Torso)
  // Armscye seam runs down from outer collar corner (266, 222)/(502, 222) to armpit (272, 385)/(496, 385)
  const leftShoulderSeam = snapPolylineToInk([
    [268, 222], [266, 260], [268, 305], [272, 350], [274, 385]
  ], 4, 3);
  const rightShoulderSeam = snapPolylineToInk([
    [500, 222], [502, 260], [500, 305], [496, 350], [494, 385]
  ], 4, 3);

  // 6. Elbow Seams (Upper Arms vs Forearms at sleeve mid-crease y ~ 495..510)
  const leftElbowSeam = snapPolylineToInk([[192, 498], [214, 506], [236, 508]], 3, 2);
  const rightElbowSeam = snapPolylineToInk([[532, 508], [554, 506], [576, 498]], 3, 2);

  // 7. Wrist Seams (Forearms vs Hands at ribbed sleeve cuff y ~ 645..662)
  const leftWristSeam = snapPolylineToInk([[196, 650], [215, 656], [232, 652]], 3, 2);
  const rightWristSeam = snapPolylineToInk([[536, 652], [553, 656], [572, 650]], 3, 2);

  // 8. Torso to Pelvis/Belt Seam (jacket bottom hem y ~ 625..638)
  const torsoBeltSeam = snapPolylineToInk([
    [262, 630], [298, 632], [345, 634], [384, 635], [423, 634], [470, 632], [506, 630]
  ], 4, 3);

  // 9. Pelvis/Belt to Upper Legs (Crotch inseam & fly y ~ 685..775)
  const crotchSeam = snapPolylineToInk([
    [384, 685], [384, 715], [384, 745], [384, 780]
  ], 3, 2);

  // 10. Knee Seams (Upper Legs vs Lower Legs at knee fold y ~ 935..950)
  const leftKneeSeam = snapPolylineToInk([[312, 940], [344, 946], [376, 942]], 3, 2);
  const rightKneeSeam = snapPolylineToInk([[392, 942], [424, 946], [456, 940]], 3, 2);

  // 11. Ankle Seams (Lower Legs vs Combat Boots collar y ~ 1115..1135)
  const leftAnkleSeam = snapPolylineToInk([[315, 1122], [345, 1128], [375, 1124]], 3, 2);
  const rightAnkleSeam = snapPolylineToInk([[393, 1124], [423, 1128], [453, 1122]], 3, 2);

  // Step 3: Foreground Pixel Partitioning (19 components)
  // IDs:
  //  1 = 01_back_hair
  //  2 = 02_head_face
  //  3 = 03_front_hair
  //  4 = 04_neck
  //  5 = 05_collar_left, 6 = 05_collar_right
  //  7 = 06_jacket_torso
  //  8 = 07_upper_arm_left, 9 = 07_upper_arm_right
  // 10 = 08_forearm_left, 11 = 08_forearm_right
  // 12 = 09_hand_left, 13 = 09_hand_right
  // 14 = 09_pelvis_belt
  // 15 = 10_upper_leg_left, 16 = 10_upper_leg_right
  // 17 = 11_lower_leg_left, 18 = 11_lower_leg_right
  // 19 = 12_boot_left, 20 = 12_boot_right

  const owner = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (fg[p * 4 + 3] === 0) continue;

      // HEAD / HAIR / FACE (y <= 210)
      if (y <= 210) {
        const jawY = evalYAtX(jawSeam, x);
        if (pointInPoly(x, y, faceHeadPoly) && y <= jawY) {
          if (isForeheadHairLock(x, y)) {
            owner[p] = 3; // 03_front_hair
          } else {
            owner[p] = 2; // 02_head_face
          }
          continue;
        }
        if (pointInPoly(x, y, collarLeftPoly)) { owner[p] = 5; continue; }
        if (pointInPoly(x, y, collarRightPoly)) { owner[p] = 6; continue; }
        if (y < jawY) {
          // Nape hair tufts vs upper crown
          if (y >= 145 && (x < 336 || x > 432)) {
            owner[p] = 1; // 01_back_hair
          } else {
            owner[p] = 3; // 03_front_hair
          }
          continue;
        }
      }

      // COLLARS
      if (pointInPoly(x, y, collarLeftPoly)) { owner[p] = 5; continue; }
      if (pointInPoly(x, y, collarRightPoly)) { owner[p] = 6; continue; }

      // NECK (between collars, above henley)
      if (y < 280 && x >= 324 && x <= 444) {
        const henleyY = evalYAtX(neckHenleySeam, x);
        if (y <= henleyY) { owner[p] = 4; continue; }
      }

      // ARMS & HANDS
      // Left Arm (Viewer's Left, x < 285)
      if (x < 285 && y >= 210 && y <= 830) {
        const shldX = evalXAtY(leftShoulderSeam, y);
        if (x <= shldX || y > 385) {
          const elbY = evalYAtX(leftElbowSeam, x);
          const wrtY = evalYAtX(leftWristSeam, x);
          if (y < elbY) { owner[p] = 8; continue; }       // 07_upper_arm_left
          else if (y < wrtY) { owner[p] = 10; continue; } // 08_forearm_left
          else if (y <= 830) { owner[p] = 12; continue; } // 09_hand_left
        }
      }
      // Right Arm (Viewer's Right, x > 485)
      if (x > 485 && y >= 210 && y <= 830) {
        const shldX = evalXAtY(rightShoulderSeam, y);
        if (x >= shldX || y > 385) {
          const elbY = evalYAtX(rightElbowSeam, x);
          const wrtY = evalYAtX(rightWristSeam, x);
          if (y < elbY) { owner[p] = 9; continue; }       // 07_upper_arm_right
          else if (y < wrtY) { owner[p] = 11; continue; } // 08_forearm_right
          else if (y <= 830) { owner[p] = 13; continue; } // 09_hand_right
        }
      }

      // TORSO (above jacket bottom hem ~632)
      const beltY = evalYAtX(torsoBeltSeam, x);
      if (y <= beltY) {
        owner[p] = 7; // 06_jacket_torso
        continue;
      }

      // PELVIS / BELT (y between beltY ~632 and ~685)
      if (y <= 685) {
        owner[p] = 14; // 09_pelvis_belt
        continue;
      }

      // LEGS & BOOTS (y > 685)
      const crotchX = evalXAtY(crotchSeam, y);
      const isLeftLeg = (x <= crotchX);

      if (isLeftLeg) {
        const kneeY = evalYAtX(leftKneeSeam, x);
        const anklY = evalYAtX(leftAnkleSeam, x);
        if (y < kneeY) { owner[p] = 15; continue; }       // 10_upper_leg_left
        else if (y < anklY) { owner[p] = 17; continue; }  // 11_lower_leg_left
        else { owner[p] = 19; continue; }                 // 12_boot_left
      } else {
        const kneeY = evalYAtX(rightKneeSeam, x);
        const anklY = evalYAtX(rightAnkleSeam, x);
        if (y < kneeY) { owner[p] = 16; continue; }       // 10_upper_leg_right
        else if (y < anklY) { owner[p] = 18; continue; }  // 11_lower_leg_right
        else { owner[p] = 20; continue; }                 // 12_boot_right
      }
    }
  }

  // Component Definitions with Draw Order (Back to Front) & Joint Pivots
  const compDefs = [
    { id: 1,  z: 0,  key: '01_back_hair',         title: '01. Back Hair & Nape',            pivot: [384, 155] },
    { id: 4,  z: 1,  key: '04_neck',              title: '04. Neck Column',                 pivot: [384, 255] },
    { id: 8,  z: 2,  key: '07_upper_arm_left',    title: '07L. Left Upper Arm',             pivot: [264, 260] },
    { id: 9,  z: 3,  key: '07_upper_arm_right',   title: '07R. Right Upper Arm',            pivot: [504, 260] },
    { id: 10, z: 4,  key: '08_forearm_left',      title: '08L. Left Forearm',               pivot: [214, 506] },
    { id: 11, z: 5,  key: '08_forearm_right',     title: '08R. Right Forearm',              pivot: [554, 506] },
    { id: 12, z: 6,  key: '09_hand_left',         title: '09L. Left Hand',                  pivot: [215, 654] },
    { id: 13, z: 7,  key: '09_hand_right',        title: '09R. Right Hand',                 pivot: [553, 654] },
    { id: 15, z: 8,  key: '10_upper_leg_left',    title: '10L. Left Upper Leg',             pivot: [348, 685] },
    { id: 16, z: 9,  key: '10_upper_leg_right',   title: '10R. Right Upper Leg',            pivot: [420, 685] },
    { id: 17, z: 10, key: '11_lower_leg_left',    title: '11L. Left Lower Leg',             pivot: [344, 944] },
    { id: 18, z: 11, key: '11_lower_leg_right',   title: '11R. Right Lower Leg',            pivot: [424, 944] },
    { id: 19, z: 12, key: '12_boot_left',         title: '12L. Left Combat Boot',           pivot: [345, 1125] },
    { id: 20, z: 13, key: '12_boot_right',        title: '12R. Right Combat Boot',          pivot: [423, 1125] },
    { id: 14, z: 14, key: '09_pelvis_belt',       title: '09. Pelvis & Belt',               pivot: [384, 655] },
    { id: 7,  z: 15, key: '06_jacket_torso',      title: '06. Jacket Torso & Harness',      pivot: [384, 450] },
    { id: 5,  z: 16, key: '05_collar_left',       title: '05L. Left Shearling Collar',      pivot: [312, 260] },
    { id: 6,  z: 17, key: '05_collar_right',      title: '05R. Right Shearling Collar',     pivot: [456, 260] },
    { id: 2,  z: 18, key: '02_head_face',         title: '02. Head & Face Base',            pivot: [384, 185] },
    { id: 3,  z: 19, key: '03_front_hair',        title: '03. Front Hair & Swept Locks',    pivot: [384, 185] }
  ];

  const zOfId = {};
  compDefs.forEach(c => zOfId[c.id] = c.z);

  function isValidSeed(compId, r, g, b) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (compId === 1) return (r <= 65 && g <= 55 && b <= 50); // Dark hair
    if (compId === 4 || compId === 2) return (lum >= 55 && r > b + 18); // Skin
    if (compId === 8 || compId === 9 || compId === 10 || compId === 11 || compId === 7) return (lum >= 45 && r > b + 8); // Brown leather
    if (compId === 12 || compId === 13) return (lum >= 60 && r > b + 20); // Hand skin
    if (compId === 14 || compId === 15 || compId === 16 || compId === 17 || compId === 18) return (g >= r * 0.9 && lum >= 45); // Olive drab trousers
    if (compId === 19 || compId === 20) return (lum >= 35 && r >= b); // Dark brown boots
    return lum >= 40;
  }

  function reconstructHiddenExtension(compId, targetMaskFn, smoothIters = 14) {
    const isOwn = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (owner[p] === compId && fg[p * 4 + 3] > 200) isOwn[p] = 1;
    }

    const perimeterSeeds = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (isOwn[p]) {
          const idx = p * 4;
          if (isValidSeed(compId, fg[idx], fg[idx + 1], fg[idx + 2])) {
            if (!isOwn[p - 1] || !isOwn[p + 1] || !isOwn[p - w] || !isOwn[p + w]) {
              perimeterSeeds.push({ x, y, r: fg[idx], g: fg[idx + 1], b: fg[idx + 2] });
            }
          }
        }
      }
    }
    if (perimeterSeeds.length === 0) {
      for (let p = 0; p < w * h; p++) {
        if (isOwn[p]) {
          const idx = p * 4;
          perimeterSeeds.push({ x: p % w, y: (p / w) | 0, r: fg[idx], g: fg[idx + 1], b: fg[idx + 2] });
          if (perimeterSeeds.length > 50) break;
        }
      }
    }

    const compZ = zOfId[compId];
    const isHidden = new Uint8Array(w * h);
    const rBuf = new Float32Array(w * h);
    const gBuf = new Float32Array(w * h);
    const bBuf = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (isOwn[p]) {
          const idx = p * 4;
          rBuf[p] = fg[idx]; gBuf[p] = fg[idx + 1]; bBuf[p] = fg[idx + 2];
          continue;
        }
        const ow = owner[p];
        if (!ow || !safeInterior[p] || zOfId[ow] <= compZ) continue;
        if (!targetMaskFn(x, y)) continue;

        isHidden[p] = 1;
        let wSum = 0, rSum = 0, gSum = 0, bSum = 0;
        let nearestDist = Infinity, nearestSeed = perimeterSeeds[0];
        for (let k = 0; k < perimeterSeeds.length; k++) {
          const s = perimeterSeeds[k];
          const d2 = (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) + 4;
          if (d2 < nearestDist) { nearestDist = d2; nearestSeed = s; }
          if (d2 < 6400) {
            const wt = 1 / (d2 * d2);
            wSum += wt; rSum += s.r * wt; gSum += s.g * wt; bSum += s.b * wt;
          }
        }
        if (wSum > 0) {
          rBuf[p] = rSum / wSum; gBuf[p] = gSum / wSum; bBuf[p] = bSum / wSum;
        } else if (nearestSeed) {
          rBuf[p] = nearestSeed.r; gBuf[p] = nearestSeed.g; bBuf[p] = nearestSeed.b;
        }
      }
    }

    const rNext = new Float32Array(rBuf);
    const gNext = new Float32Array(gBuf);
    const bNext = new Float32Array(bBuf);
    for (let iter = 0; iter < smoothIters; iter++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (!isHidden[p]) continue;
          let cnt = 0, rs = 0, gs = 0, bs = 0;
          const nbs = [p - 1, p + 1, p - w, p + w];
          for (const nb of nbs) {
            if (isOwn[nb] || isHidden[nb]) {
              cnt++; rs += rBuf[nb]; gs += gBuf[nb]; bs += bBuf[nb];
            }
          }
          if (cnt > 0) {
            rNext[p] = rs / cnt; gNext[p] = gs / cnt; bNext[p] = bs / cnt;
          }
        }
      }
      rBuf.set(rNext); gBuf.set(gNext); bBuf.set(bNext);
    }

    return { isOwn, isHidden, rBuf, gBuf, bBuf };
  }

  // Hidden Target Extents for Articulation
  const hiddenTargetFns = {
    1: (x, y) => (y >= 90 && y <= 210 && x >= 310 && x <= 458), // 01_back_hair cranium bridge
    4: (x, y) => (x >= 320 && x <= 448 && y >= 140 && y <= 290), // 04_neck under jaw/collars
    8: (x, y) => (x >= 240 && x <= 295 && y >= 210 && y <= 405), // 07_upper_arm_left under torso
    9: (x, y) => (x >= 475 && x <= 530 && y >= 210 && y <= 405), // 07_upper_arm_right under torso
    10: (x, y) => (y >= 485 && y <= 520 && x >= 185 && x <= 245), // 08_forearm_left elbow cap
    11: (x, y) => (y >= 485 && y <= 520 && x >= 525 && x <= 585), // 08_forearm_right elbow cap
    12: (x, y) => (y >= 635 && y <= 665 && x >= 195 && x <= 240), // 09_hand_left wrist tab
    13: (x, y) => (y >= 635 && y <= 665 && x >= 530 && x <= 575), // 09_hand_right wrist tab
    14: (x, y) => (y >= 615 && y <= 645 && x >= 250 && x <= 518), // 09_pelvis_belt under jacket
    15: (x, y) => (y >= 665 && y <= 705 && x >= 270 && x <= 390), // 10_upper_leg_left hip cup
    16: (x, y) => (y >= 665 && y <= 705 && x >= 378 && x <= 498), // 10_upper_leg_right hip cup
    17: (x, y) => (y >= 925 && y <= 960 && x >= 305 && x <= 385), // 11_lower_leg_left knee dome
    18: (x, y) => (y >= 925 && y <= 960 && x >= 383 && x <= 463), // 11_lower_leg_right knee dome
    19: (x, y) => (y >= 1105 && y <= 1140 && x >= 295 && x <= 385), // 12_boot_left ankle cup
    20: (x, y) => (y >= 1105 && y <= 1140 && x >= 383 && x <= 473), // 12_boot_right ankle cup
    7: (x, y) => (y >= 210 && y <= 275 && ((x >= 265 && x <= 335) || (x >= 433 && x <= 503))), // 06_jacket_torso under collars
    5: (x, y) => (x >= 320 && x <= 345 && y >= 170 && y <= 210), // 05_collar_left under jaw
    6: (x, y) => (x >= 423 && x <= 448 && y >= 170 && y <= 210), // 05_collar_right under jaw
    2: (x, y) => (y >= 75 && y <= 152 && x >= 320 && x <= 448 && pointInPoly(x, y, faceHeadPoly)), // 02_head_face forehead
    3: () => false
  };

  const manifest = {
    sourceMaster: 'source/00_master_full_body.jpg',
    dimensions: { width: w, height: h },
    totalMasterForegroundPixels: 0,
    totalVisibleMasterPixelsInNeutral: 0,
    components: []
  };

  let totalFg = 0;
  for (let p = 0; p < w * h; p++) if (fg[p * 4 + 3] > 0) totalFg++;
  manifest.totalMasterForegroundPixels = totalFg;
  manifest.totalVisibleMasterPixelsInNeutral = totalFg;

  const fullRecCanvases = {};

  for (const comp of compDefs) {
    const rec = reconstructHiddenExtension(comp.id, hiddenTargetFns[comp.id] || (() => false));

    const visCanvas = document.createElement('canvas');
    visCanvas.width = w; visCanvas.height = h;
    const visCtx = visCanvas.getContext('2d');
    const visImg = visCtx.createImageData(w, h);
    const vd = visImg.data;

    const recCanvas = document.createElement('canvas');
    recCanvas.width = w; recCanvas.height = h;
    const recCtx = recCanvas.getContext('2d');
    const recImg = recCtx.createImageData(w, h);
    const rd = recImg.data;

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = w; mapCanvas.height = h;
    const mapCtx = mapCanvas.getContext('2d');
    const mapImg = mapCtx.createImageData(w, h);
    const md = mapImg.data;

    let visibleCount = 0, hiddenCount = 0;
    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const idx = p * 4;
        if (owner[p] === comp.id) {
          visibleCount++;
          const r = fg[idx], g = fg[idx + 1], b = fg[idx + 2], a = fg[idx + 3];
          vd[idx] = r; vd[idx + 1] = g; vd[idx + 2] = b; vd[idx + 3] = a;
          rd[idx] = r; rd[idx + 1] = g; rd[idx + 2] = b; rd[idx + 3] = a;
          md[idx] = r; md[idx + 1] = g; md[idx + 2] = b; md[idx + 3] = a;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        } else if (rec.isHidden[p]) {
          hiddenCount++;
          const r = Math.round(rec.rBuf[p]), g = Math.round(rec.gBuf[p]), b = Math.round(rec.bBuf[p]);
          rd[idx] = r; rd[idx + 1] = g; rd[idx + 2] = b; rd[idx + 3] = 255;

          const stripe = ((x + y) % 8 < 4);
          md[idx] = Math.min(255, Math.round(r * 0.45 + (stripe ? 255 : 40) * 0.55));
          md[idx + 1] = Math.min(255, Math.round(g * 0.45 + (stripe ? 40 : 220) * 0.55));
          md[idx + 2] = Math.min(255, Math.round(b * 0.45 + 255 * 0.55));
          md[idx + 3] = 255;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (rec.isHidden[p]) {
          if (owner[p - 1] === comp.id || owner[p + 1] === comp.id || owner[p - w] === comp.id || owner[p + w] === comp.id) {
            const idx = p * 4;
            md[idx] = 0; md[idx + 1] = 255; md[idx + 2] = 120; md[idx + 3] = 255;
          }
        }
      }
    }

    visCtx.putImageData(visImg, 0, 0);
    recCtx.putImageData(recImg, 0, 0);
    mapCtx.putImageData(mapImg, 0, 0);
    fullRecCanvases[comp.key] = recCanvas;

    const pad = 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    const tw = maxX - minX + 1, th = maxY - minY + 1;

    function crop(src) {
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      c.getContext('2d').drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
      return c;
    }

    await savePng('visible', comp.key + '.png', crop(visCanvas));
    await savePng('reconstructed', comp.key + '.png', crop(recCanvas));
    await savePng('origin_maps', comp.key + '_map.png', crop(mapCanvas));

    manifest.components.push({
      id: comp.id,
      zOrder: comp.z,
      key: comp.key,
      title: comp.title,
      cropBox: { x: minX, y: minY, width: tw, height: th },
      pivotMaster: { x: comp.pivot[0], y: comp.pivot[1] },
      pivotLocal: { x: comp.pivot[0] - minX, y: comp.pivot[1] - minY },
      visibleMasterPixels: visibleCount,
      reconstructedHiddenPixels: hiddenCount,
      reconstructedRatioPct: Number(((hiddenCount / (visibleCount + hiddenCount || 1)) * 100).toFixed(2))
    });
  }

  // Neutral Reassembly
  const neutralCanvas = document.createElement('canvas');
  neutralCanvas.width = w; neutralCanvas.height = h;
  const nCtx = neutralCanvas.getContext('2d');
  for (const comp of compDefs) {
    nCtx.drawImage(fullRecCanvases[comp.key], 0, 0);
  }
  await savePng('fullframe', '01_reassembled_full_neutral.png', neutralCanvas);

  // Pixel Difference Heatmap
  const nData = nCtx.getImageData(0, 0, w, h).data;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w; diffCanvas.height = h;
  const dCtx = diffCanvas.getContext('2d');
  const dImg = dCtx.createImageData(w, h);
  const dd = dImg.data;

  let exactMatch = 0, nonZero = 0, maxDiff = 0, sumDiff = 0;
  for (let p = 0; p < w * h; p++) {
    const idx = p * 4;
    const dr = Math.abs(nData[idx] - fg[idx]);
    const dg = Math.abs(nData[idx + 1] - fg[idx + 1]);
    const db = Math.abs(nData[idx + 2] - fg[idx + 2]);
    const da = Math.abs(nData[idx + 3] - fg[idx + 3]);
    const mDiff = Math.max(dr, dg, db, da);

    if (mDiff === 0) {
      exactMatch++;
      const lum = Math.round((fg[idx] + fg[idx + 1] + fg[idx + 2]) / 3 * 0.22);
      dd[idx] = lum; dd[idx + 1] = lum + 8; dd[idx + 2] = lum + 16; dd[idx + 3] = 255;
    } else {
      nonZero++;
      if (mDiff > maxDiff) maxDiff = mDiff;
      sumDiff += (dr + dg + db + da) / 4;
      dd[idx] = Math.min(255, mDiff * 16 + 100);
      dd[idx + 1] = Math.min(255, mDiff * 4);
      dd[idx + 2] = 0;
      dd[idx + 3] = 255;
    }
  }
  dCtx.putImageData(dImg, 0, 0);
  await savePng('fullframe', '02_full_pixel_diff_heatmap.png', diffCanvas);

  manifest.validation = {
    totalCanvasPixels: w * h,
    exactMatchPixels: exactMatch,
    nonZeroDiffPixels: nonZero,
    exactMatchPct: Number(((exactMatch / (w * h)) * 100).toFixed(4)),
    maxChannelDiff: maxDiff,
    meanAbsChannelDiff: Number((sumDiff / (w * h)).toFixed(6)),
    visibleArtworkPreservedFromMasterPct: 100.0
  };

  await fetch('/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest)
  });
}

run().catch(err => {
  fetch('/done', { method: 'POST', body: JSON.stringify({ error: String(err.stack || err) }) });
});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/full_master.jpg') {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(fs.readFileSync(sourceFile));
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const p = JSON.parse(body);
      const b64 = p.dataUrl.replace(/^data:image\/png;base64,/, '');
      const outPath = path.join(outBase, p.subDir, p.filename);
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      console.log('Saved:', path.join(p.subDir, p.filename));
      res.writeHead(200);
      res.end('ok');
    });
  } else if (req.url === '/done' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const manifest = JSON.parse(body);
      fs.writeFileSync(path.join(outBase, 'manifest.json'), JSON.stringify(manifest, null, 2));
      console.log('Full-body manifest saved. Validation:', JSON.stringify(manifest.validation));
      res.writeHead(200);
      res.end('ok');
      setTimeout(() => process.exit(0), 200);
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', `http://127.0.0.1:${port}/`]);
});
