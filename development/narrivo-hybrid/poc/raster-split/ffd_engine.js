/**
 * Localized 2D Mesh Free-Form Deformation (FFD) Engine for Commander Vance Bust
 * Preserves 100% of original master pixels and keeps reconstructed hidden pixels separately identifiable.
 * Applies localized C2 smoothstep FFD strictly to:
 *  1. Jaw-to-Shearling-Collar & Upper Neck junction (04_neck, upper tips of 05_collar_left/right)
 *  2. Shoulder-to-Collar & Harness junction (07_shoulder_left/right, outer lapels of 05_collar_left/right)
 * Keeps 02_head_face, 03_front_hair, 01_back_hair, and 06_jacket_torso 100% free of facial/hardware warp.
 */

window.VanceFFD = (function() {
  const deg = d => d * Math.PI / 180;
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  // Forward rigid point transform around a pivot (px, py) with translation (dx, dy) and rotation rotDeg
  function rigidPoint(x, y, px, py, rotDeg, dx, dy) {
    const r = deg(rotDeg);
    const cos = Math.cos(r), sin = Math.sin(r);
    const rx = x - px, ry = y - py;
    return [
      px + dx + rx * cos - ry * sin,
      py + dy + rx * sin + ry * cos
    ];
  }

  // Hierarchical Head transform (Neck around 456,735 -> Head around 456,545)
  function headPoint(x, y, pose) {
    const [nx, ny] = rigidPoint(x, y, 456, 735, pose.neckRot || 0, pose.neckDx || 0, pose.neckDy || 0);
    return rigidPoint(nx, ny, 456, 545, pose.headRot || 0, pose.headDx || 0, pose.headDy || 0);
  }

  function neckPoint(x, y, pose) {
    return rigidPoint(x, y, 456, 735, pose.neckRot || 0, pose.neckDx || 0, pose.neckDy || 0);
  }

  function shldLeftPoint(x, y, pose) {
    return rigidPoint(x, y, 205, 685, pose.shldLRot || 0, pose.shldLDx || 0, pose.shldLDy || 0);
  }

  function shldRightPoint(x, y, pose) {
    return rigidPoint(x, y, 705, 685, pose.shldRRot || 0, pose.shldRDx || 0, pose.shldRDy || 0);
  }

  /**
   * Localized FFD forward displacement vector [du, dv] at master coordinate (x, y) for a given component key.
   */
  function evalFFDDisplacement(compKey, x, y, pose) {
    const [hx, hy] = headPoint(x, y, pose);
    const dHeadX = hx - x, dHeadY = hy - y;

    const [nx, ny] = neckPoint(x, y, pose);
    const dNeckX = nx - x, dNeckY = ny - y;

    const [slx, sly] = shldLeftPoint(x, y, pose);
    const dShldLX = slx - x, dShldLY = sly - y;

    const [srx, sry] = shldRightPoint(x, y, pose);
    const dShldRX = srx - x, dShldRY = sry - y;

    if (compKey === '04_neck') {
      // Cervical soft-tissue FFD with 1.0 plateau across the entire jaw/collar contact zone (y <= 550):
      // y <= 550: 100% locked to Head/Jaw transform (zero relative slip at jaw or upper collar tip)
      // 550 < y < 650: smooth C2 transition into Neck cervical rotation
      // 650 < y < 725: smooth C2 transition to static Torso/Henley collar anchor (y >= 725)
      const wJaw = smoothstep((650 - y) / (650 - 550));
      const wBase = smoothstep((725 - y) / (725 - 650));
      return [
        wJaw * dHeadX + (1 - wJaw) * wBase * dNeckX,
        wJaw * dHeadY + (1 - wJaw) * wBase * dNeckY
      ];
    }

    if (compKey === '05_collar_left') {
      // Zone 1: Upper-inner jaw contact tip — 1.0 plateau across the entire jaw-contact zone (x >= 295, y <= 542)
      // tapering smoothly across the soft fleece (x: 245..295, y: 542..615) so the T-junction at (330,500) never steps or kinks
      const wxJaw = smoothstep((x - 245) / (295 - 245));
      const wyJaw = smoothstep((615 - y) / (615 - 542));
      const wJawTip = wxJaw * wyJaw;

      // Zone 2: Outer-lower shoulder contact lapel — 1.0 plateau across the entire outer shoulder-contact seam (x <= 222, y >= 595)
      // tapering smoothly inward toward the zipper (x: 222..312) and upward (y: 535..595)
      const tx = smoothstep((312 - x) / (312 - 222));
      const ty = smoothstep((y - 535) / (595 - 535));
      const wShldLapel = tx * ty * (1 - wJawTip);

      return [
        wJawTip * dHeadX + wShldLapel * dShldLX,
        wJawTip * dHeadY + wShldLapel * dShldLY
      ];
    }

    if (compKey === '05_collar_right') {
      // Zone 1: Upper-inner jaw contact tip — 1.0 plateau across (x <= 615, y <= 542)
      const wxJaw = smoothstep((665 - x) / (665 - 615));
      const wyJaw = smoothstep((615 - y) / (615 - 542));
      const wJawTip = wxJaw * wyJaw;

      // Zone 2: Outer-lower shoulder contact lapel — 1.0 plateau across (x >= 688, y >= 595)
      const tx = smoothstep((x - 598) / (688 - 598));
      const ty = smoothstep((y - 535) / (595 - 535));
      const wShldLapel = tx * ty * (1 - wJawTip);

      return [
        wJawTip * dHeadX + wShldLapel * dShldRX,
        wJawTip * dHeadY + wShldLapel * dShldRY
      ];
    }

    if (compKey === '07_shoulder_left') {
      // Full shoulder rotation/shrug on outer deltoid & collar junction (y <= 760 or x <= 165);
      // smooth inner-seam damping near lower harness rings (y > 820, x > 175) so inner seam never pulls past harness
      const wInnerAnchor = (y > 800 && x > 165)
        ? 1 - 0.55 * smoothstep((y - 800) / 380) * smoothstep((x - 165) / 55)
        : 1.0;
      return [dShldLX * wInnerAnchor, dShldLY * wInnerAnchor];
    }

    if (compKey === '07_shoulder_right') {
      const wInnerAnchor = (y > 800 && x < 745)
        ? 1 - 0.55 * smoothstep((y - 800) / 380) * smoothstep((745 - x) / 55)
        : 1.0;
      return [dShldRX * wInnerAnchor, dShldRY * wInnerAnchor];
    }

    return [0, 0];
  }

  /**
   * Renders a component using GPU-accelerated Canvas2D Textured 2D Triangle Mesh FFD
   * with 0.65px centroid clip expansion (zero triangle seams, works natively on file:// URLs).
   */
  function warpComponentToCanvas(dstCtx, srcImg, cropBox, compKey, pose, drawWireframe = false) {
    const cw = cropBox.width, ch = cropBox.height;
    const ox = cropBox.x, oy = cropBox.y;

    const cols = 12, rows = 14;
    const cellW = cw / cols, cellH = ch / rows;

    const gridU = new Float32Array((cols + 1) * (rows + 1));
    const gridV = new Float32Array((cols + 1) * (rows + 1));
    const gridX = new Float32Array((cols + 1) * (rows + 1));
    const gridY = new Float32Array((cols + 1) * (rows + 1));

    for (let r = 0; r <= rows; r++) {
      const uY = r * cellH;
      const mY = oy + uY;
      for (let c = 0; c <= cols; c++) {
        const uX = c * cellW;
        const mX = ox + uX;
        const [du, dv] = evalFFDDisplacement(compKey, mX, mY, pose);
        const idx = r * (cols + 1) + c;
        gridU[idx] = uX;
        gridV[idx] = uY;
        gridX[idx] = mX + du;
        gridY[idx] = mY + dv;
      }
    }

    function drawTexturedTri(u0, v0, u1, v1, u2, v2, x0, y0, x1, y1, x2, y2) {
      const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
      if (Math.abs(det) < 1e-5) return;
      const invDet = 1 / det;

      const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) * invDet;
      const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) * invDet;
      const c = ((u1 - u0) * (x2 - x0) - (u2 - u0) * (x1 - x0)) * invDet;
      const d = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) * invDet;
      const e = x0 - a * u0 - c * v0;
      const f = y0 - b * u0 - d * v0;

      // Expand clip triangle by 0.65px from centroid to eliminate sub-pixel anti-aliasing seams
      const cx = (x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;
      const expand = (px, py) => {
        const dx = px - cx, dy = py - cy;
        const len = Math.hypot(dx, dy) || 1;
        return [px + (dx / len) * 0.65, py + (dy / len) * 0.65];
      };
      const [ex0, ey0] = expand(x0, y0);
      const [ex1, ey1] = expand(x1, y1);
      const [ex2, ey2] = expand(x2, y2);

      dstCtx.save();
      dstCtx.beginPath();
      dstCtx.moveTo(ex0, ey0);
      dstCtx.lineTo(ex1, ey1);
      dstCtx.lineTo(ex2, ey2);
      dstCtx.closePath();
      dstCtx.clip();
      dstCtx.transform(a, b, c, d, e, f);
      dstCtx.drawImage(srcImg, 0, 0);
      dstCtx.restore();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i00 = r * (cols + 1) + c;
        const i10 = i00 + 1;
        const i01 = i00 + (cols + 1);
        const i11 = i01 + 1;

        drawTexturedTri(
          gridU[i00], gridV[i00], gridU[i10], gridV[i10], gridU[i11], gridV[i11],
          gridX[i00], gridY[i00], gridX[i10], gridY[i10], gridX[i11], gridY[i11]
        );
        drawTexturedTri(
          gridU[i00], gridV[i00], gridU[i11], gridV[i11], gridU[i01], gridV[i01],
          gridX[i00], gridY[i00], gridX[i11], gridY[i11], gridX[i01], gridY[i01]
        );
      }
    }

    if (drawWireframe) {
      dstCtx.save();
      dstCtx.strokeStyle = 'rgba(0, 255, 200, 0.55)';
      dstCtx.lineWidth = 0.85;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i00 = r * (cols + 1) + c;
          const i10 = i00 + 1;
          const i01 = i00 + (cols + 1);
          const i11 = i01 + 1;
          dstCtx.beginPath();
          dstCtx.moveTo(gridX[i00], gridY[i00]);
          dstCtx.lineTo(gridX[i10], gridY[i10]);
          dstCtx.lineTo(gridX[i11], gridY[i11]);
          dstCtx.lineTo(gridX[i01], gridY[i01]);
          dstCtx.closePath();
          dstCtx.stroke();
          dstCtx.beginPath();
          dstCtx.moveTo(gridX[i00], gridY[i00]);
          dstCtx.lineTo(gridX[i11], gridY[i11]);
          dstCtx.stroke();
        }
      }
      dstCtx.restore();
    }
  }

  /**
   * Renders the full bust in either 'rigid' (Case A) or 'ffd' (Case B) mode.
   */
  function renderBust(ctx, assets, manifest, pose, mode = 'ffd', options = {}) {
    const compMap = {};
    manifest.components.forEach(c => compMap[c.key] = c);
    const imgs = options.useOriginMaps ? assets.originImgs : assets.recImgs;

    ctx.clearRect(0, 0, 896, 1200);
    ctx.fillStyle = options.bgColor || '#7a7a7a';
    ctx.fillRect(0, 0, 896, 1200);

    function applyNeckRigid(ctx) {
      ctx.translate(456 + (pose.neckDx || 0), 735 + (pose.neckDy || 0));
      ctx.rotate(deg(pose.neckRot || 0));
      ctx.translate(-456, -735);
    }

    function applyHeadRigid(ctx) {
      applyNeckRigid(ctx);
      ctx.translate(456 + (pose.headDx || 0), 545 + (pose.headDy || 0));
      ctx.rotate(deg(pose.headRot || 0));
      ctx.translate(-456, -545);
    }

    function applyFrontHairRigid(ctx) {
      applyHeadRigid(ctx);
      ctx.translate(456 + (pose.hairDx || 0), 210 + (pose.hairDy || 0));
      ctx.rotate(deg(pose.hairRot || 0));
      ctx.translate(-456, -210);
    }

    function drawRigid(key, fn) {
      const c = compMap[key];
      ctx.save();
      fn(ctx, c);
      ctx.drawImage(imgs[key], c.cropBox.x, c.cropBox.y);
      ctx.restore();
    }

    // z=0: 01_back_hair (rigid child of Head)
    drawRigid('01_back_hair', applyHeadRigid);

    // z=1: 04_neck
    if (mode === 'rigid') {
      drawRigid('04_neck', applyNeckRigid);
    } else {
      warpComponentToCanvas(ctx, imgs['04_neck'], compMap['04_neck'].cropBox, '04_neck', pose, !!options.drawWireframe);
    }

    // z=2: 07_shoulder_left
    if (mode === 'rigid') {
      drawRigid('07_shoulder_left', (ctx) => {
        ctx.translate(205 + (pose.shldLDx || 0), 685 + (pose.shldLDy || 0));
        ctx.rotate(deg(pose.shldLRot || 0));
        ctx.translate(-205, -685);
      });
    } else {
      warpComponentToCanvas(ctx, imgs['07_shoulder_left'], compMap['07_shoulder_left'].cropBox, '07_shoulder_left', pose, !!options.drawWireframe);
    }

    // z=3: 07_shoulder_right
    if (mode === 'rigid') {
      drawRigid('07_shoulder_right', (ctx) => {
        ctx.translate(705 + (pose.shldRDx || 0), 685 + (pose.shldRDy || 0));
        ctx.rotate(deg(pose.shldRRot || 0));
        ctx.translate(-705, -685);
      });
    } else {
      warpComponentToCanvas(ctx, imgs['07_shoulder_right'], compMap['07_shoulder_right'].cropBox, '07_shoulder_right', pose, !!options.drawWireframe);
    }

    // z=4: 06_jacket_torso (100% static anchor)
    drawRigid('06_jacket_torso', () => {});

    // z=5: 05_collar_left
    if (mode === 'rigid') {
      drawRigid('05_collar_left', () => {});
    } else {
      warpComponentToCanvas(ctx, imgs['05_collar_left'], compMap['05_collar_left'].cropBox, '05_collar_left', pose, !!options.drawWireframe);
    }

    // z=6: 05_collar_right
    if (mode === 'rigid') {
      drawRigid('05_collar_right', () => {});
    } else {
      warpComponentToCanvas(ctx, imgs['05_collar_right'], compMap['05_collar_right'].cropBox, '05_collar_right', pose, !!options.drawWireframe);
    }

    // z=7: 02_head_face (100% rigid facial plane — zero facial feature distortion)
    drawRigid('02_head_face', applyHeadRigid);

    // z=8: 03_front_hair (100% rigid hair plane with optional subtle crown follow-through)
    drawRigid('03_front_hair', applyFrontHairRigid);
  }

  async function loadAllAssets(manifest) {
    const recImgs = {}, originImgs = {};
    for (const c of manifest.components) {
      const rImg = new Image();
      rImg.src = 'direct-seg/reconstructed/' + c.key + '.png';
      await new Promise(r => rImg.onload = r);
      recImgs[c.key] = rImg;

      const oImg = new Image();
      oImg.src = 'direct-seg/origin_maps/' + c.key + '_map.png';
      await new Promise(r => oImg.onload = r);
      originImgs[c.key] = oImg;
    }
    return { recImgs, originImgs };
  }

  return { renderBust, loadAllAssets, evalFFDDisplacement };
})();
