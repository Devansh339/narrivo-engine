/**
 * Narrivo Character Engine v1 — Anatomical Vector Illustration (drawing.js)
 * Polished multi-tone vector rendering for articulated character rigs.
 *
 * All limb segments are drawn in local bone space [0..L] along +X,
 * guaranteeing zero joint disconnection during dynamic rotation.
 */

import { drawFacialFeatures, DEFAULT_FACE_STATE } from './expressions.js';

export const INK = '#181524';
const INK_WIDTH = 3.5;

// Color shading helpers
export function adjustColor(hex, factor) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export const DEFAULT_PALETTE = {
  skin: '#E5A882',
  skinShadow: '#BF825E',
  skinHighlight: '#F5C6A8',
  hair: '#24202A',
  hairShadow: '#15131A',
  hairHighlight: '#3E3748',
  jacket: '#3D556E',
  jacketShadow: '#28384A',
  jacketHighlight: '#527091',
  pants: '#2B303A',
  pantsShadow: '#1B1E24',
  pantsHighlight: '#3E4554',
  shirt: '#EAE6DF',
  shirtShadow: '#C8C3BA',
  tie: '#A83232',
  belt: '#261D1A',
  beltBuckle: '#D4AF37',
  shoes: '#221D1B',
  shoesShadow: '#141110',
  shoesHighlight: '#38312E',
  eyes: '#3A281E',
};

/**
 * Applies a Bone's 2D world matrix onto the 2D canvas context.
 */
function applyBoneMatrix(ctx, bone) {
  const m = bone.worldMatrix;
  ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
}

/**
 * Draws the Head and Jawline.
 * In Head bone local space: (0, 0) is the neck joint, pointing towards the crown along +X.
 */
export function drawHead(ctx, headBone, palette = DEFAULT_PALETTE, options = {}) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const L = headBone.length || 140;

  ctx.save();
  applyBoneMatrix(ctx, headBone);

  // In head local space: +X is UP (towards crown), +Y is character's LEFT (screen right).
  // Head width: ~110px.
  const hw = 56;
  const chinY = 0;
  const crownX = L;

  // 1. Ears (drawn behind head contour)
  ctx.save();
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;

  // Left ear (+Y)
  ctx.beginPath();
  ctx.ellipse(L * 0.38, hw - 4, 15, 10, 0.2, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.skinShadow;
  ctx.beginPath();
  ctx.arc(L * 0.38, hw - 5, 5, 0, Math.PI * 2);
  ctx.fill();

  // Right ear (-Y)
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(L * 0.38, -hw + 4, 15, 10, -0.2, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.skinShadow;
  ctx.beginPath();
  ctx.arc(L * 0.38, -hw + 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Head & Jaw Base Contour
  ctx.save();
  ctx.beginPath();
  // Start at chin point (0, 0)
  ctx.moveTo(12, 0);
  // Left jaw & cheek (+Y)
  ctx.bezierCurveTo(18, hw * 0.45, 34, hw * 0.88, crownX * 0.42, hw);
  // Left temple up to crown
  ctx.bezierCurveTo(crownX * 0.75, hw, crownX + 10, hw * 0.65, crownX + 12, 0);
  // Right crown down to temple
  ctx.bezierCurveTo(crownX + 10, -hw * 0.65, crownX * 0.75, -hw, crownX * 0.42, -hw);
  // Right cheek down to jaw
  ctx.bezierCurveTo(34, -hw * 0.88, 18, -hw * 0.45, 12, 0);
  ctx.closePath();

  ctx.fillStyle = pal.skin;
  ctx.fill();

  // Cel Shading: Shadow on right side (-Y)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pal.skinShadow;
  ctx.beginPath();
  ctx.moveTo(crownX + 20, 0);
  ctx.bezierCurveTo(crownX * 0.8, -hw * 0.9, 40, -hw * 0.9, 10, 0);
  ctx.lineTo(-20, -hw * 1.5);
  ctx.lineTo(crownX + 30, -hw * 1.5);
  ctx.closePath();
  ctx.fill();

  // Highlight on left forehead (+Y)
  ctx.fillStyle = pal.skinHighlight;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(crownX * 0.72, hw * 0.45, 18, 30, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 3. Hair (Polished modern sweep with volume)
  ctx.save();
  ctx.fillStyle = pal.hair;
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;

  ctx.beginPath();
  // Hair contour along the crown and sides
  ctx.moveTo(crownX * 0.35, -hw - 4);
  ctx.bezierCurveTo(crownX * 0.7, -hw - 10, crownX + 18, -hw * 0.6, crownX + 22, -hw * 0.1);
  ctx.bezierCurveTo(crownX + 26, hw * 0.3, crownX + 14, hw + 8, crownX * 0.5, hw + 6);
  // Hairline and fringe/parting
  ctx.bezierCurveTo(crownX * 0.65, hw * 0.5, crownX * 0.78, 12, crownX * 0.68, -8);
  ctx.bezierCurveTo(crownX * 0.6, -26, crownX * 0.52, -hw * 0.6, crownX * 0.35, -hw - 4);
  ctx.closePath();
  ctx.fill();

  // Hair highlight arc
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pal.hairHighlight;
  ctx.beginPath();
  ctx.ellipse(crownX + 8, 10, 14, 45, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.stroke();
  ctx.restore();

  // 4. Facial Features (Brows, Eyes, Nose, Mouth, Cheeks, Effects)
  drawFacialFeatures(ctx, headBone, options.face || DEFAULT_FACE_STATE, pal);

  ctx.restore();
  ctx.restore();
}

/**
 * Draws the Neck.
 * Neck bone points from torso top to chin along +X.
 */
export function drawNeck(ctx, neckBone, palette = DEFAULT_PALETTE) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const L = neckBone.length || 46;
  const nw = 22; // half width

  ctx.save();
  applyBoneMatrix(ctx, neckBone);

  ctx.beginPath();
  ctx.moveTo(0, -nw * 1.15);
  ctx.lineTo(L, -nw * 0.95);
  ctx.lineTo(L, nw * 0.95);
  ctx.lineTo(0, nw * 1.15);
  ctx.closePath();

  ctx.fillStyle = pal.skin;
  ctx.fill();

  // Cel shadow (under chin and on right side)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pal.skinShadow;
  ctx.fillRect(0, -nw * 1.5, L, nw * 1.5); // shadow side
  ctx.beginPath();
  ctx.ellipse(L, 0, 14, nw * 1.2, 0, 0, Math.PI * 2); // under chin shadow
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the Torso and Hips/Pelvis.
 * In Torso bone space: (0, 0) is the hips, pointing upwards along +X to the neck/clavicles.
 */
export function drawTorso(ctx, torsoBone, hipsBone, palette = DEFAULT_PALETTE, options = {}) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const L = torsoBone.length || 180;

  ctx.save();
  applyBoneMatrix(ctx, torsoBone);

  // Torso proportions in local coordinates:
  // +X is UP (towards neck).
  // +Y is character's LEFT (screen right).
  // -Y is character's RIGHT (screen left).
  const chestW = 68; // half width at shoulders
  const waistW = 46; // half width at waist
  const hipW = 52;   // half width at hips

  // 1. Shirt & Jacket Body
  ctx.save();
  ctx.beginPath();
  // Bottom hem at hips (X=0)
  ctx.moveTo(0, -hipW);
  // Waist curve up to chest
  ctx.bezierCurveTo(L * 0.35, -waistW, L * 0.65, -chestW, L - 6, -chestW);
  // Shoulder top to neck
  ctx.lineTo(L, -22);
  // Collar notch
  ctx.lineTo(L - 28, 0);
  ctx.lineTo(L, 22);
  // Left shoulder to chest
  ctx.lineTo(L - 6, chestW);
  // Left chest down to waist and hip
  ctx.bezierCurveTo(L * 0.65, chestW, L * 0.35, waistW, 0, hipW);
  ctx.closePath();

  ctx.fillStyle = pal.jacket;
  ctx.fill();

  // Cel shading: right side shadow (-Y)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pal.jacketShadow;
  ctx.fillRect(-10, -chestW * 1.5, L + 20, chestW * 1.5);

  // Left chest highlight (+Y)
  ctx.fillStyle = pal.jacketHighlight;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(L * 0.6, chestW * 0.45, 45, 18, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.stroke();

  // 2. Inner Shirt & Tie (visible at collar notch)
  ctx.fillStyle = pal.shirt;
  ctx.beginPath();
  ctx.moveTo(L, -22);
  ctx.lineTo(L - 32, 0);
  ctx.lineTo(L, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Tie
  ctx.fillStyle = pal.tie;
  ctx.beginPath();
  ctx.moveTo(L - 10, -6);
  ctx.lineTo(L - 10, 6);
  ctx.lineTo(L - 75, 9);
  ctx.lineTo(L - 90, 0);
  ctx.lineTo(L - 75, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Jacket Lapels
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.beginPath();
  ctx.moveTo(L - 8, -chestW + 12);
  ctx.lineTo(L - 48, -14);
  ctx.lineTo(L - 110, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(L - 8, chestW - 12);
  ctx.lineTo(L - 48, 14);
  ctx.lineTo(L - 110, 0);
  ctx.stroke();

  // 4. Belt & Buckle at hips
  ctx.fillStyle = pal.belt;
  ctx.fillRect(0, -hipW + 2, 16, hipW * 2 - 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, -hipW + 2, 16, hipW * 2 - 4);

  // Buckle
  ctx.fillStyle = pal.beltBuckle;
  ctx.fillRect(0, -14, 16, 28);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -14, 16, 28);

  ctx.restore();
  ctx.restore();
}

/**
 * Draws an anatomical limb segment (Upper Arm, Forearm, Thigh, or Shin).
 * In local bone space: (0, 0) is proximal joint, (length, 0) is distal joint.
 */
export function drawLimbSegment(ctx, bone, config = {}) {
  const {
    startRadius = 24,
    midRadius = 26,
    endRadius = 18,
    fill = DEFAULT_PALETTE.jacket,
    shadowFill = DEFAULT_PALETTE.jacketShadow,
    highlightFill = DEFAULT_PALETTE.jacketHighlight,
    isSleeve = false,
  } = config;

  const L = bone.length;
  if (!L) return;

  ctx.save();
  applyBoneMatrix(ctx, bone);

  // Path: smooth tapered capsule with muscle contour
  ctx.beginPath();
  // Proximal joint cap
  ctx.arc(0, 0, startRadius, Math.PI * 0.5, Math.PI * 1.5);
  // Top curve along +X (outer muscle bulge)
  ctx.bezierCurveTo(L * 0.35, -midRadius * 1.08, L * 0.7, -midRadius * 0.95, L, -endRadius);
  // Distal joint cap
  ctx.arc(L, 0, endRadius, -Math.PI * 0.5, Math.PI * 0.5);
  // Bottom curve along -X (inner muscle contour)
  ctx.bezierCurveTo(L * 0.7, midRadius * 0.92, L * 0.35, midRadius * 1.04, 0, startRadius);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  // Cel shadow along bottom/right edge
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shadowFill;
  ctx.fillRect(-startRadius, 0, L + startRadius + endRadius, midRadius * 2);

  // Highlight along upper curve
  if (highlightFill) {
    ctx.fillStyle = highlightFill;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(L * 0.45, -midRadius * 0.5, L * 0.35, midRadius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Sleeve cuff fold if cloth segment
  if (isSleeve) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L - 8, -endRadius - 3);
    ctx.lineTo(L - 8, endRadius + 3);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws an illustrated Hand.
 * In hand bone space: (0, 0) is wrist, pointing along +X to finger tips.
 */
export function drawHand(ctx, handBone, side = 'l', pose = 'relax', palette = DEFAULT_PALETTE) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const L = handBone.length || 50;

  ctx.save();
  applyBoneMatrix(ctx, handBone);

  const mirror = side === 'r' ? -1 : 1;

  ctx.save();
  ctx.scale(1, mirror);

  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.lineJoin = 'round';

  if (pose === 'point') {
    // Extended index finger pointing forward (+X)
    ctx.beginPath();
    // Palm and thumb base
    ctx.moveTo(0, -10);
    ctx.lineTo(14, -18);
    // Thumb bent
    ctx.bezierCurveTo(24, -20, 26, -10, 18, -4);
    // Index finger reaching long
    ctx.lineTo(L + 12, -4);
    ctx.arc(L + 12, 1, 5, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.lineTo(24, 6);
    // Curled lower fingers (middle, ring, pinky)
    ctx.bezierCurveTo(26, 16, 12, 20, 0, 12);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Finger crease marks
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(18, 4); ctx.lineTo(18, 16);
    ctx.moveTo(12, 8); ctx.lineTo(12, 17);
    ctx.stroke();

  } else if (pose === 'fist') {
    // Clenched fist
    ctx.beginPath();
    ctx.roundRect(0, -14, L * 0.85, 28, 8);
    ctx.fill(); ctx.stroke();
    // Thumb locked over fingers
    ctx.fillStyle = pal.skinShadow;
    ctx.beginPath();
    ctx.roundRect(4, -16, 24, 12, 5);
    ctx.fill(); ctx.stroke();
    // Knuckle division lines
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, -10); ctx.lineTo(16, 10);
    ctx.moveTo(28, -10); ctx.lineTo(28, 10);
    ctx.stroke();

  } else {
    // Default relaxed hand
    ctx.beginPath();
    ctx.moveTo(0, -9);
    // Thumb curve
    ctx.quadraticCurveTo(12, -18, 22, -14);
    ctx.quadraticCurveTo(25, -6, 16, -2);
    // Fingers extending naturally
    ctx.lineTo(L, -2);
    ctx.bezierCurveTo(L + 6, 2, L + 4, 12, L - 8, 12);
    ctx.bezierCurveTo(20, 16, 10, 14, 0, 9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Finger separation line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 2); ctx.lineTo(L - 6, 2);
    ctx.moveTo(18, 6); ctx.lineTo(L - 10, 6);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws an illustrated Shoe / Foot.
 * In foot bone space: (0, 0) is ankle, pointing along +X to the toe.
 */
export function drawFoot(ctx, footBone, side = 'l', palette = DEFAULT_PALETTE) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const L = footBone.length || 65;

  ctx.save();
  applyBoneMatrix(ctx, footBone);

  const mirror = side === 'r' ? -1 : 1;
  ctx.scale(1, mirror);

  // Shoe heel, sole, and leather upper
  ctx.save();
  ctx.beginPath();
  // Ankle collar
  ctx.moveTo(0, -12);
  // Instep slope down to toe
  ctx.bezierCurveTo(L * 0.35, -14, L * 0.7, -10, L, 2);
  // Rounded toe box
  ctx.bezierCurveTo(L + 6, 8, L + 2, 16, L - 6, 18);
  // Sole line back to heel
  ctx.lineTo(0, 18);
  // Heel back curve up to ankle
  ctx.bezierCurveTo(-14, 14, -12, -4, 0, -12);
  ctx.closePath();

  ctx.fillStyle = pal.shoes;
  ctx.fill();

  // Rubber sole strip
  ctx.fillStyle = pal.shoesShadow;
  ctx.fillRect(-10, 12, L + 14, 7);

  // Cel highlight on top of leather
  ctx.fillStyle = pal.shoesHighlight;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(L * 0.45, -6, 18, 5, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Shoe outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_WIDTH;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Sole seam
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.lineTo(L - 4, 12);
  ctx.stroke();

  ctx.restore();
}

/**
 * Master rendering coordinator: draws the entire articulated character rig
 * using depth-sorted layers for clean visual overlap.
 */
export function drawArticulatedCharacter(ctx, rig, options = {}) {
  const pal = { ...DEFAULT_PALETTE, ...(options.palette || {}) };
  const pose = options.pose || {};
  const handPoseL = options.handPoseL || 'relax';
  const handPoseR = options.handPoseR || 'relax';

  const b = (name) => rig.getBone(name);

  ctx.save();

  // 1. Far/Right Arm (Drawn behind body when arm hangs naturally or reaches back)
  if (b('upper_arm_r')) {
    drawLimbSegment(ctx, b('upper_arm_r'), {
      startRadius: 22, midRadius: 24, endRadius: 18,
      fill: pal.jacketShadow, shadowFill: pal.jacketShadow, highlightFill: null,
      isSleeve: true,
    });
  }
  if (b('forearm_r')) {
    drawLimbSegment(ctx, b('forearm_r'), {
      startRadius: 18, midRadius: 19, endRadius: 14,
      fill: pal.skinShadow, shadowFill: pal.skinShadow, highlightFill: null,
      isSleeve: false,
    });
  }
  if (b('hand_r')) {
    drawHand(ctx, b('hand_r'), 'r', handPoseR, pal);
  }

  // 2. Far/Right Leg
  if (b('thigh_r')) {
    drawLimbSegment(ctx, b('thigh_r'), {
      startRadius: 32, midRadius: 34, endRadius: 24,
      fill: pal.pantsShadow, shadowFill: pal.pantsShadow, highlightFill: null,
    });
  }
  if (b('shin_r')) {
    drawLimbSegment(ctx, b('shin_r'), {
      startRadius: 24, midRadius: 22, endRadius: 16,
      fill: pal.pantsShadow, shadowFill: pal.pantsShadow, highlightFill: null,
    });
  }
  if (b('foot_r')) {
    drawFoot(ctx, b('foot_r'), 'r', pal);
  }

  // 3. Near/Left Leg
  if (b('thigh_l')) {
    drawLimbSegment(ctx, b('thigh_l'), {
      startRadius: 34, midRadius: 36, endRadius: 25,
      fill: pal.pants, shadowFill: pal.pantsShadow, highlightFill: pal.pantsHighlight,
    });
  }
  if (b('shin_l')) {
    drawLimbSegment(ctx, b('shin_l'), {
      startRadius: 25, midRadius: 23, endRadius: 17,
      fill: pal.pants, shadowFill: pal.pantsShadow, highlightFill: pal.pantsHighlight,
    });
  }
  if (b('foot_l')) {
    drawFoot(ctx, b('foot_l'), 'l', pal);
  }

  // 4. Torso & Hips
  if (b('torso') && b('hips')) {
    drawTorso(ctx, b('torso'), b('hips'), pal, options);
  }

  // 5. Neck
  if (b('neck')) {
    drawNeck(ctx, b('neck'), pal);
  }

  // 6. Head
  if (b('head')) {
    drawHead(ctx, b('head'), pal, options);
  }

  // 7. Near/Left Arm (Drawn in front of torso)
  if (b('upper_arm_l')) {
    drawLimbSegment(ctx, b('upper_arm_l'), {
      startRadius: 24, midRadius: 26, endRadius: 19,
      fill: pal.jacket, shadowFill: pal.jacketShadow, highlightFill: pal.jacketHighlight,
      isSleeve: true,
    });
  }
  if (b('forearm_l')) {
    drawLimbSegment(ctx, b('forearm_l'), {
      startRadius: 19, midRadius: 20, endRadius: 15,
      fill: pal.skin, shadowFill: pal.skinShadow, highlightFill: pal.skinHighlight,
      isSleeve: false,
    });
  }
  if (b('hand_l')) {
    drawHand(ctx, b('hand_l'), 'l', handPoseL, pal);
  }

  ctx.restore();
}
