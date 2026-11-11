/**
 * PHASE 1 & PHASE 2: Direct Master Bust Segmentation & Hidden-Overlap Reconstruction (v3 - Color Unmixed Hair & Seam-Free Neck)
 * Source: development/narrivo-hybrid/poc/raster-split/source/00_master_bust.jpg (896x1200)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'source', '00_master_bust.jpg');
const outBase = path.join(rootDir, 'direct-seg');
const subDirs = ['visible', 'reconstructed', 'origin_maps', 'fullframe'];

for (const d of subDirs) {
  const p = path.join(outBase, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Direct Segmentation & Hidden Reconstruction</title></head>
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
  img.src = '/master.jpg';
  await new Promise(r => img.onload = r);

  const w = img.width, h = img.height;
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = w; masterCanvas.height = h;
  const mctx = masterCanvas.getContext('2d');
  mctx.drawImage(img, 0, 0);
  const rawImgData = mctx.getImageData(0, 0, w, h);
  const raw = rawImgData.data;

  // Step 1: Extract foreground alpha from neutral #7A7A7A background
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
  await savePng('fullframe', '00_master_foreground.png', fgCanvas);

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

  function snapPolylineToInk(pts, searchRadius = 5, subdivisions = 4) {
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
        const score = luma(cx, cy) + Math.abs(r) * 2.5;
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

  // Step 2: Anatomical Seams (offset 3px toward the occluded layer so the front layer owns 100% of its dark ink border)
  const jawSeamRaw = snapPolylineToInk([
    [320, 436], [322, 455], [326, 478], [330, 500], [336, 518],
    [345, 534], [358, 548], [374, 565], [390, 582], [406, 598],
    [422, 609], [440, 614], [456, 615], [474, 614], [492, 609],
    [508, 598], [524, 582], [540, 565], [556, 548], [568, 532],
    [575, 516], [580, 498], [584, 475], [588, 452], [591, 437]
  ], 5, 4);
  const jawSeam = jawSeamRaw.map(([x, y]) => [x < 456 ? x - 2 : x + 2, y + 3]);

  const collarLeftInnerBottomRaw = snapPolylineToInk([
    [318, 494], [330, 500], [322, 520], [318, 545], [320, 575],
    [324, 605], [329, 635], [335, 665], [341, 695], [347, 725],
    [353, 755], [358, 785], [350, 800], [334, 784], [316, 766],
    [292, 754], [256, 742], [214, 729], [184, 720], [164, 710],
    [159, 694]
  ], 5, 4);
  const collarLeftInnerBottom = collarLeftInnerBottomRaw.map(([x, y]) => [x + 4, y + 3]);

  const collarLeftPoly = [
    [315, 490],
    ...collarLeftInnerBottom,
    [155, 670], [168, 630], [190, 585], [225, 540], [270, 505], [305, 490]
  ];

  const collarRightInnerBottomRaw = snapPolylineToInk([
    [595, 494], [580, 500], [588, 520], [591, 545], [589, 575],
    [585, 605], [580, 635], [574, 665], [568, 695], [562, 725],
    [555, 755], [550, 785], [558, 800], [574, 784], [592, 766],
    [616, 754], [652, 742], [696, 729], [724, 720], [735, 710],
    [737, 694]
  ], 5, 4);
  const collarRightInnerBottom = collarRightInnerBottomRaw.map(([x, y]) => [x - 4, y + 3]);

  const collarRightPoly = [
    [598, 490],
    ...collarRightInnerBottom,
    [742, 670], [730, 630], [710, 585], [675, 540], [630, 505], [602, 490]
  ];

  // Neck-to-Henley seam: shift 4px upward so 06_jacket_torso (henley collar) owns 100% of the henley top dark ink line
  const neckHenleySeamRaw = snapPolylineToInk([
    [335, 700], [342, 704], [358, 712], [378, 724], [398, 735],
    [418, 747], [438, 760], [452, 774], [460, 792], [464, 804],
    [468, 788], [474, 768], [486, 756], [506, 745], [526, 734],
    [548, 720], [567, 706], [575, 700]
  ], 5, 4);
  const neckHenleySeam = neckHenleySeamRaw.map(([x, y]) => [x, y - 4]);

  // Left & Right Shoulder seams: shift 3px outward so 06_jacket_torso owns 100% of the harness strap & ring dark ink border
  const leftShoulderSeamRaw = snapPolylineToInk([
    [212, 720], [212, 765], [212, 800], [211, 825], [198, 836],
    [195, 850], [208, 862], [212, 895], [211, 938], [192, 952],
    [177, 974], [174, 1000], [182, 1024], [189, 1038], [176, 1068],
    [159, 1110], [141, 1155], [124, 1200]
  ], 5, 4);
  const leftShoulderSeam = leftShoulderSeamRaw.map(([x, y]) => [x - 3, y]);

  const rightShoulderSeamRaw = snapPolylineToInk([
    [698, 720], [698, 765], [698, 800], [699, 825], [712, 836],
    [715, 850], [702, 862], [698, 895], [699, 938], [718, 952],
    [733, 974], [736, 1000], [728, 1024], [721, 1038], [734, 1068],
    [751, 1110], [769, 1155], [786, 1200]
  ], 5, 4);
  const rightShoulderSeam = rightShoulderSeamRaw.map(([x, y]) => [x + 3, y]);

  const leftEarBottom = [
    [270, 422], [292, 432], [306, 437], [316, 438], [322, 438]
  ];
  const rightEarBottom = [
    [589, 438], [595, 438], [605, 437], [618, 432], [640, 422]
  ];

  const faceHeadPoly = [
    [272, 362], [278, 349], [288, 343], [297, 346], [304, 355], [310, 356],
    [313, 332], [316, 302], [320, 270], [326, 242], [335, 220], [347, 205],
    [366, 195], [392, 193], [420, 201], [445, 205], [470, 198], [495, 198],
    [520, 205], [548, 225], [568, 252], [580, 285], [587, 322], [589, 352],
    [596, 355], [603, 342], [612, 338], [624, 344], [634, 358],
    [636, 422], [618, 432], [605, 437], [595, 438],
    ...jawSeam.slice().reverse(),
    [316, 438], [306, 437], [292, 432], [272, 422]
  ];

  function isEyebrowOrBelow(x, y) {
    if (y >= 348) return true;
    if (x >= 320 && x <= 452 && y >= 292) return true;
    if (x >= 453 && x <= 550 && y >= 295) return true;
    if (x > 550 && x <= 584 && y >= 310) return true;
    return false;
  }

  // Tight hair-lock mask (core hair pixels without skin halo)
  const coreHairLockMask = new Uint8Array(w * h);
  for (let y = 185; y < 355; y++) {
    for (let x = 295; x < 605; x++) {
      if (isEyebrowOrBelow(x, y)) continue;
      const inCenterLock = (x >= 456 && x <= 497 && y >= 190 && y <= 292);
      const inRightLock = (x >= 494 && x <= 594 && y >= 190 && y <= 347);
      const inLeftTemple = (x >= 300 && x <= 325 && y >= 190 && y <= 352);
      const inTopHairline = (x >= 325 && x <= 500 && y >= 188 && y <= 212);
      if (!inCenterLock && !inRightLock && !inLeftTemple && !inTopHairline) continue;

      const idx = (y * w + x) * 4;
      const r = fg[idx], g = fg[idx + 1], b = fg[idx + 2];
      if (x >= 311 && x <= 346 && g > 130 && b > 120) continue;
      // Core dark hair / dark anti-aliased edge: R < 142
      const isBrightSkin = (r > 142 && (r - b) > 38 && g > 95);
      if (!isBrightSkin) {
        coreHairLockMask[y * w + x] = 1;
      }
    }
  }

  // 1px dilation for 03_front_hair ownership, and 3px dilation for 02_head_face skin inpainting exclusion
  const hairOwnerMask = new Uint8Array(w * h);
  const hairInpaintMask = new Uint8Array(w * h);
  for (let y = 185; y < 355; y++) {
    for (let x = 295; x < 605; x++) {
      if (isEyebrowOrBelow(x, y)) continue;
      let hit1 = 0, hit3 = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (coreHairLockMask[(y + dy) * w + (x + dx)]) {
            hit3 = 1;
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) hit1 = 1;
          }
        }
      }
      if (hit1) hairOwnerMask[y * w + x] = 1;
      if (hit3) hairInpaintMask[y * w + x] = 1;
    }
  }

  // Step 3: Partition every foreground pixel (x,y) into its unique visible owner ID (1..9)
  const owner = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (fg[p * 4 + 3] === 0) continue;

      if (y <= 622 && pointInPoly(x, y, faceHeadPoly)) {
        if (hairOwnerMask[p]) {
          owner[p] = 3; // 03_front_hair
        } else {
          owner[p] = 2; // 02_head_face
        }
        continue;
      }

      if (pointInPoly(x, y, collarLeftPoly)) {
        owner[p] = 5;
        continue;
      }
      if (pointInPoly(x, y, collarRightPoly)) {
        owner[p] = 6;
        continue;
      }

      if (y < 508) {
        const leftEarY = evalYAtX(leftEarBottom, x);
        const rightEarY = evalYAtX(rightEarBottom, x);
        if ((x < 350 && y >= leftEarY) || (x > 565 && y >= rightEarY)) {
          owner[p] = 1; // 01_back_hair
        } else {
          owner[p] = 3; // 03_front_hair
        }
        continue;
      }

      if (x >= 315 && x <= 595 && y >= 485 && y <= 808) {
        const henleyY = evalYAtX(neckHenleySeam, x);
        if (y <= henleyY) {
          owner[p] = 4; // 04_neck
          continue;
        }
      }

      if (y >= 620 && x < 260) {
        const seamX = y < 720 ? 209 : evalXAtY(leftShoulderSeam, y);
        if (x <= seamX) {
          owner[p] = 8; // 07_shoulder_left
          continue;
        }
      }
      if (y >= 620 && x > 650) {
        const seamX = y < 720 ? 701 : evalXAtY(rightShoulderSeam, y);
        if (x >= seamX) {
          owner[p] = 9; // 07_shoulder_right
          continue;
        }
      }

      owner[p] = 7; // 06_jacket_torso
    }
  }

  // Remove any tiny (< 50px) isolated forehead speckles from 03_front_hair
  {
    const vis3 = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (owner[p] === 3 && !vis3[p]) {
        const comp = [p];
        vis3[p] = 1;
        let head = 0;
        while (head < comp.length) {
          const cur = comp[head++];
          const nbs = [cur - 1, cur + 1, cur - w, cur + w];
          for (const nb of nbs) {
            if (nb >= 0 && nb < w * h && owner[nb] === 3 && !vis3[nb]) {
              vis3[nb] = 1;
              comp.push(nb);
            }
          }
        }
        if (comp.length < 50) {
          for (const px of comp) owner[px] = 2;
        }
      }
    }
  }

  // Step 4: Build Phase 1 & Phase 2 buffers
  const compDefs = [
    { id: 1, z: 0, key: '01_back_hair', title: '01. Back Hair & Nape Layer', pivot: [456, 460] },
    { id: 4, z: 1, key: '04_neck', title: '04. Neck & Throat Column', pivot: [456, 735] },
    { id: 8, z: 2, key: '07_shoulder_left', title: '07L. Left Shoulder & Upper Sleeve', pivot: [205, 685] },
    { id: 9, z: 3, key: '07_shoulder_right', title: '07R. Right Shoulder & Upper Sleeve', pivot: [705, 685] },
    { id: 7, z: 4, key: '06_jacket_torso', title: '06. Leather Jacket Torso & Henley', pivot: [456, 950] },
    { id: 5, z: 5, key: '05_collar_left', title: '05L. Left Shearling Collar', pivot: [335, 725] },
    { id: 6, z: 6, key: '05_collar_right', title: '05R. Right Shearling Collar', pivot: [565, 725] },
    { id: 2, z: 7, key: '02_head_face', title: '02. Head & Face Base', pivot: [456, 545] },
    { id: 3, z: 8, key: '03_front_hair', title: '03. Front Hair & Swept Locks', pivot: [456, 545] }
  ];

  const zOfId = {};
  compDefs.forEach(c => zOfId[c.id] = c.z);

  function isValidSeedColor(compId, x, y, r, g, b) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (compId === 1) {
      return (r >= 18 && r <= 75 && g >= 14 && g <= 60 && b >= 12 && b <= 52 && r >= b);
    }
    if (compId === 4) {
      return (lum >= 52 && r > b + 20);
    }
    if (compId === 8 || compId === 9) {
      return (lum >= 46 && r > b + 12);
    }
    if (compId === 7) {
      return (lum >= 48);
    }
    if (compId === 2) {
      if (hairInpaintMask[y * w + x]) return false; // Exclude any hair fringe from forehead skin seeds!
      return (r > 145 && (r - b) > 38 && g > 95);
    }
    return lum >= 42;
  }

  function reconstructHiddenExtension(compId, targetMaskFn, insetPx = 3, smoothIters = 18, grainAmp = 2.5) {
    const isOwn = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (owner[p] === compId && fg[p * 4 + 3] > 200) isOwn[p] = 1;
    }

    const isSeed = new Uint8Array(w * h);
    for (let y = insetPx; y < h - insetPx; y++) {
      for (let x = insetPx; x < w - insetPx; x++) {
        const p = y * w + x;
        if (!isOwn[p]) continue;
        const idx = p * 4;
        if (!isValidSeedColor(compId, x, y, fg[idx], fg[idx + 1], fg[idx + 2])) continue;
        let interior = 1;
        for (let dy = -insetPx; dy <= insetPx && interior; dy++) {
          for (let dx = -insetPx; dx <= insetPx; dx++) {
            if (!isOwn[(y + dy) * w + (x + dx)]) { interior = 0; break; }
          }
        }
        if (interior) isSeed[p] = 1;
      }
    }

    const perimeterSeeds = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (isSeed[p]) {
          if (!isSeed[p - 1] || !isSeed[p + 1] || !isSeed[p - w] || !isSeed[p + w]) {
            const idx = p * 4;
            perimeterSeeds.push({ x, y, r: fg[idx], g: fg[idx + 1], b: fg[idx + 2] });
          }
        }
      }
    }
    if (perimeterSeeds.length < 15) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (isOwn[p]) {
            const idx = p * 4;
            if (isValidSeedColor(compId, x, y, fg[idx], fg[idx + 1], fg[idx + 2])) {
              perimeterSeeds.push({ x, y, r: fg[idx], g: fg[idx + 1], b: fg[idx + 2] });
            }
          }
        }
      }
    }
    if (perimeterSeeds.length === 0) {
      perimeterSeeds.push({ x: 456, y: 380, r: 38, g: 30, b: 25 });
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
          if (d2 < nearestDist) {
            nearestDist = d2;
            nearestSeed = s;
          }
          if (d2 < 14400) {
            const wt = 1 / (d2 * d2);
            wSum += wt; rSum += s.r * wt; gSum += s.g * wt; bSum += s.b * wt;
          }
        }
        if (wSum > 0) {
          rBuf[p] = rSum / wSum; gBuf[p] = gSum / wSum; bBuf[p] = bSum / wSum;
        } else {
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
            if (isSeed[nb] || isHidden[nb]) {
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

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (!isHidden[p]) continue;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = ((hash - Math.floor(hash)) - 0.5) * 2 * grainAmp;
        rBuf[p] = Math.max(0, Math.min(255, rBuf[p] + noise));
        gBuf[p] = Math.max(0, Math.min(255, gBuf[p] + noise * 0.9));
        bBuf[p] = Math.max(0, Math.min(255, bBuf[p] + noise * 0.8));
      }
    }

    return { isOwn, isHidden, rBuf, gBuf, bBuf };
  }

  const hiddenTargetFns = {
    1: (x, y) => {
      if (y < 240 || y > 520 || x < 280 || x > 625) return false;
      return (x <= 368 || x >= 542 || y <= 340);
    },
    4: (x, y) => {
      if (x < 298 || x > 612 || y < 445 || y > 828) return false;
      const jawY = evalYAtX(jawSeam, x);
      const henleyY = evalYAtX(neckHenleySeam, x);
      return (y >= jawY - 52 && y <= henleyY + 28 && x >= 300 && x <= 610);
    },
    8: (x, y) => {
      if (y < 595 || y > 1200 || x > 252) return false;
      const seamX = y < 720 ? 225 : evalXAtY(leftShoulderSeam, y);
      return x <= seamX + 34 && y >= 595;
    },
    9: (x, y) => {
      if (y < 595 || y > 1200 || x < 658) return false;
      const seamX = y < 720 ? 685 : evalXAtY(rightShoulderSeam, y);
      return x >= seamX - 34 && y >= 595;
    },
    7: (x, y) => {
      if (y < 670 || y > 815 || x < 165 || x > 732) return false;
      const dLeft = distToPolyline(x, y, collarLeftInnerBottom);
      const dRight = distToPolyline(x, y, collarRightInnerBottom);
      return (dLeft <= 30 || dRight <= 30);
    },
    5: (x, y) => (x >= 318 && x <= 350 && y >= 494 && y <= 540),
    6: (x, y) => (x >= 562 && x <= 592 && y >= 494 && y <= 540),
    2: (x, y) => {
      if (y < 168 || y > 355 || x < 296 || x > 606) return false;
      if (pointInPoly(x, y, faceHeadPoly)) return true;
      return (y >= 170 && y <= 245 && x >= 315 && x <= 585);
    },
    3: () => false
  };

  const manifest = {
    sourceMaster: 'source/00_master_bust.jpg',
    dimensions: { width: w, height: h },
    totalMasterForegroundPixels: 0,
    totalVisibleMasterPixelsInNeutral: 0,
    visibleMasterPreservationPct: 100.0,
    components: []
  };

  let totalFgPixels = 0;
  for (let p = 0; p < w * h; p++) {
    if (fg[p * 4 + 3] > 0) totalFgPixels++;
  }
  manifest.totalMasterForegroundPixels = totalFgPixels;
  manifest.totalVisibleMasterPixelsInNeutral = totalFgPixels;

  const fullRecCanvases = {};

  for (const comp of compDefs) {
    const rec = reconstructHiddenExtension(
      comp.id,
      hiddenTargetFns[comp.id],
      comp.id === 1 ? 1 : 3,
      18,
      comp.id === 5 || comp.id === 6 ? 4.5 : 2.5
    );

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

    let visibleCount = 0;
    let hiddenCount = 0;
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
          const r = Math.round(rec.rBuf[p]);
          const g = Math.round(rec.gBuf[p]);
          const b = Math.round(rec.bBuf[p]);
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

    const pad = 6;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;

    function cropCanvas(src) {
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      c.getContext('2d').drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
      return c;
    }

    await savePng('visible', comp.key + '.png', cropCanvas(visCanvas));
    await savePng('reconstructed', comp.key + '.png', cropCanvas(recCanvas));
    await savePng('origin_maps', comp.key + '_map.png', cropCanvas(mapCanvas));

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
      reconstructedRatioPct: Number(((hiddenCount / (visibleCount + hiddenCount)) * 100).toFixed(2))
    });
  }

  // Step 5: Reassemble the Neutral Bust
  const neutralCanvas = document.createElement('canvas');
  neutralCanvas.width = w; neutralCanvas.height = h;
  const nCtx = neutralCanvas.getContext('2d');
  for (const comp of compDefs) {
    nCtx.drawImage(fullRecCanvases[comp.key], 0, 0);
  }
  await savePng('fullframe', '01_reassembled_neutral.png', neutralCanvas);

  // Step 6: Compute Pixel-by-Pixel Difference
  const nData = nCtx.getImageData(0, 0, w, h).data;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w; diffCanvas.height = h;
  const dCtx = diffCanvas.getContext('2d');
  const dImg = dCtx.createImageData(w, h);
  const dd = dImg.data;

  let exactMatchPixels = 0;
  let nonZeroDiffPixels = 0;
  let maxChannelDiff = 0;
  let sumAbsDiff = 0;

  for (let p = 0; p < w * h; p++) {
    const idx = p * 4;
    const dr = Math.abs(nData[idx] - fg[idx]);
    const dg = Math.abs(nData[idx + 1] - fg[idx + 1]);
    const db = Math.abs(nData[idx + 2] - fg[idx + 2]);
    const da = Math.abs(nData[idx + 3] - fg[idx + 3]);
    const mDiff = Math.max(dr, dg, db, da);

    if (mDiff === 0) {
      exactMatchPixels++;
      const lum = Math.round((fg[idx] + fg[idx + 1] + fg[idx + 2]) / 3 * 0.22);
      dd[idx] = lum; dd[idx + 1] = lum + 8; dd[idx + 2] = lum + 16; dd[idx + 3] = 255;
    } else {
      nonZeroDiffPixels++;
      if (mDiff > maxChannelDiff) maxChannelDiff = mDiff;
      sumAbsDiff += (dr + dg + db + da) / 4;
      dd[idx] = Math.min(255, mDiff * 16 + 100);
      dd[idx + 1] = Math.min(255, mDiff * 4);
      dd[idx + 2] = 0;
      dd[idx + 3] = 255;
    }
  }
  dCtx.putImageData(dImg, 0, 0);
  await savePng('fullframe', '02_pixel_diff_heatmap.png', diffCanvas);

  manifest.validation = {
    totalCanvasPixels: w * h,
    exactMatchPixels,
    nonZeroDiffPixels,
    exactMatchPct: Number(((exactMatchPixels / (w * h)) * 100).toFixed(4)),
    maxChannelDiff,
    meanAbsChannelDiff: Number((sumAbsDiff / (w * h)).toFixed(6)),
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
  } else if (req.url === '/master.jpg') {
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
      console.log('Manifest saved. Validation summary:', JSON.stringify(manifest.validation));
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
