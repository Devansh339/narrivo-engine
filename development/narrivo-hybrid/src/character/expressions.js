/**
 * Narrivo Character Engine v1 — Expressions & Facial Animation (expressions.js)
 * Modular facial components, 10 core emotional presets, smooth transitions,
 * and a 6-shape speech viseme system.
 */

import { INK } from './drawing.js';

/**
 * Default Neutral Face State
 */
export const DEFAULT_FACE_STATE = {
  // Brows: left and right independent
  browInnerY_L: 0,   // -1 (furrowed/down) to +1 (raised/up)
  browOuterY_L: 0,
  browCurve_L: 0,    // -1 (arched) to +1 (straight/slanted)
  browInnerY_R: 0,
  browOuterY_R: 0,
  browCurve_R: 0,

  // Eyelids & Eye Aperture
  upperLid_L: 0,     // 0 (open) to 1 (closed)
  lowerLid_L: 0,     // 0 (down) to 1 (squinted up)
  eyeWide_L: 0,      // 0 (normal) to 1 (dilated shock)
  upperLid_R: 0,
  lowerLid_R: 0,
  eyeWide_R: 0,
  pupilSize: 1.0,    // scale multiplier (0.5 to 1.3)
  gazeX: 0,          // -1 (look left) to +1 (look right)
  gazeY: 0,          // -1 (look down) to +1 (look up)

  // Mouth & Jaw
  mouthOpen: 0,      // 0 (shut) to 1 (wide open)
  mouthWidth: 1.0,   // horizontal scale (0.5 to 1.5)
  mouthSmile: 0,     // -1 (frown) to +1 (smile)
  mouthSkew: 0,      // asymmetric smirk (-1 to +1)
  teethUpper: 0,     // 0 (hidden) to 1 (visible)
  teethLower: 0,
  tongue: 0,
  mouthStyle: 'normal', // 'normal' | 'o_shape' | 'wavy' | 'grit' | 'tremble' | 'mbp' | 'fv'

  // Cheeks & Effects
  blush: 0,          // 0 to 1
  sweat: 0,          // 0 to 1 (perspiration bead)
  tears: 0,          // 0 to 1 (glisten in eyes)
  tearStream: 0,     // 0 to 1 (streaming tears)

  // Head Attitude
  headTilt: 0,       // local head tilt degrees
};

/**
 * 10 Core Expression Presets
 */
export const EXPRESSIONS = {
  happy: {
    browInnerY_L: 0.25, browOuterY_L: 0.15, browCurve_L: -0.3,
    browInnerY_R: 0.25, browOuterY_R: 0.15, browCurve_R: -0.3,
    upperLid_L: 0.1, lowerLid_L: 0.35, eyeWide_L: 0,
    upperLid_R: 0.1, lowerLid_R: 0.35, eyeWide_R: 0,
    pupilSize: 1.05, gazeX: 0, gazeY: 0.05,
    mouthOpen: 0.35, mouthWidth: 1.2, mouthSmile: 0.85, mouthSkew: 0,
    teethUpper: 0.85, teethLower: 0, tongue: 0.2, mouthStyle: 'normal',
    blush: 0.45, sweat: 0, tears: 0, tearStream: 0,
    headTilt: 2.5,
  },

  sad: {
    browInnerY_L: 0.75, browOuterY_L: -0.35, browCurve_L: 0.5,
    browInnerY_R: 0.75, browOuterY_R: -0.35, browCurve_R: 0.5,
    upperLid_L: 0.45, lowerLid_L: 0.05, eyeWide_L: 0,
    upperLid_R: 0.45, lowerLid_R: 0.05, eyeWide_R: 0,
    pupilSize: 0.95, gazeX: 0, gazeY: -0.35,
    mouthOpen: 0.1, mouthWidth: 0.85, mouthSmile: -0.75, mouthSkew: 0,
    teethUpper: 0, teethLower: 0, tongue: 0, mouthStyle: 'tremble',
    blush: 0, sweat: 0, tears: 0.5, tearStream: 0,
    headTilt: -5.0,
  },

  angry: {
    browInnerY_L: -0.75, browOuterY_L: 0.55, browCurve_L: 0.7,
    browInnerY_R: -0.75, browOuterY_R: 0.55, browCurve_R: 0.7,
    upperLid_L: 0.35, lowerLid_L: 0.35, eyeWide_L: 0,
    upperLid_R: 0.35, lowerLid_R: 0.35, eyeWide_R: 0,
    pupilSize: 0.82, gazeX: 0, gazeY: 0.1,
    mouthOpen: 0.25, mouthWidth: 1.25, mouthSmile: -0.45, mouthSkew: 0,
    teethUpper: 1.0, teethLower: 0.85, tongue: 0, mouthStyle: 'grit',
    blush: 0, sweat: 0, tears: 0, tearStream: 0,
    headTilt: -4.0,
  },

  shocked: {
    browInnerY_L: 0.95, browOuterY_L: 0.85, browCurve_L: -0.5,
    browInnerY_R: 0.95, browOuterY_R: 0.85, browCurve_R: -0.5,
    upperLid_L: -0.3, lowerLid_L: -0.2, eyeWide_L: 1.0,
    upperLid_R: -0.3, lowerLid_R: -0.2, eyeWide_R: 1.0,
    pupilSize: 0.52, gazeX: 0, gazeY: 0,
    mouthOpen: 0.85, mouthWidth: 0.72, mouthSmile: -0.1, mouthSkew: 0,
    teethUpper: 0.2, teethLower: 0, tongue: 0.4, mouthStyle: 'o_shape',
    blush: 0, sweat: 0.85, tears: 0, tearStream: 0,
    headTilt: 4.5,
  },

  worried: {
    browInnerY_L: 0.65, browOuterY_L: 0.1, browCurve_L: 0.65,
    browInnerY_R: 0.65, browOuterY_R: 0.1, browCurve_R: 0.65,
    upperLid_L: 0.1, lowerLid_L: 0.15, eyeWide_L: 0.35,
    upperLid_R: 0.1, lowerLid_R: 0.15, eyeWide_R: 0.35,
    pupilSize: 0.88, gazeX: 0.35, gazeY: 0.2,
    mouthOpen: 0.15, mouthWidth: 0.78, mouthSmile: -0.35, mouthSkew: -0.15,
    teethUpper: 0, teethLower: 0, tongue: 0, mouthStyle: 'wavy',
    blush: 0, sweat: 0.65, tears: 0, tearStream: 0,
    headTilt: 3.0,
  },

  confident: {
    browInnerY_L: 0.3, browOuterY_L: 0.4, browCurve_L: -0.2,
    browInnerY_R: -0.1, browOuterY_R: 0.05, browCurve_R: 0.1,
    upperLid_L: 0.15, lowerLid_L: 0.1, eyeWide_L: 0,
    upperLid_R: 0.2, lowerLid_R: 0.1, eyeWide_R: 0,
    pupilSize: 1.05, gazeX: 0, gazeY: 0.05,
    mouthOpen: 0.12, mouthWidth: 1.15, mouthSmile: 0.65, mouthSkew: 0.35,
    teethUpper: 0.5, teethLower: 0, tongue: 0, mouthStyle: 'normal',
    blush: 0, sweat: 0, tears: 0, tearStream: 0,
    headTilt: 4.0,
  },

  confused: {
    browInnerY_L: 0.85, browOuterY_L: 0.65, browCurve_L: -0.3,
    browInnerY_R: -0.5, browOuterY_R: -0.15, browCurve_R: 0.5,
    upperLid_L: -0.15, lowerLid_L: 0.05, eyeWide_L: 0.45,
    upperLid_R: 0.4, lowerLid_R: 0.35, eyeWide_R: 0,
    pupilSize: 0.92, gazeX: -0.35, gazeY: 0.25,
    mouthOpen: 0.12, mouthWidth: 0.75, mouthSmile: -0.15, mouthSkew: -0.45,
    teethUpper: 0, teethLower: 0, tongue: 0, mouthStyle: 'wavy',
    blush: 0, sweat: 0.2, tears: 0, tearStream: 0,
    headTilt: 12.0, // Inquisitive cocked head
  },

  smug: {
    browInnerY_L: 0.1, browOuterY_L: -0.05, browCurve_L: 0.15,
    browInnerY_R: 0.1, browOuterY_R: -0.05, browCurve_R: 0.15,
    upperLid_L: 0.62, lowerLid_L: 0.12, eyeWide_L: 0,
    upperLid_R: 0.62, lowerLid_R: 0.12, eyeWide_R: 0,
    pupilSize: 1.0, gazeX: 0, gazeY: -0.25,
    mouthOpen: 0.06, mouthWidth: 1.12, mouthSmile: 0.55, mouthSkew: 0.5,
    teethUpper: 0.2, teethLower: 0, tongue: 0, mouthStyle: 'normal',
    blush: 0.15, sweat: 0, tears: 0, tearStream: 0,
    headTilt: 6.5,
  },

  crying: {
    browInnerY_L: 0.9, browOuterY_L: -0.3, browCurve_L: 0.6,
    browInnerY_R: 0.9, browOuterY_R: -0.3, browCurve_R: 0.6,
    upperLid_L: 1.0, lowerLid_L: 0.85, eyeWide_L: 0,
    upperLid_R: 1.0, lowerLid_R: 0.85, eyeWide_R: 0,
    pupilSize: 0.9, gazeX: 0, gazeY: -0.2,
    mouthOpen: 0.72, mouthWidth: 1.15, mouthSmile: -0.85, mouthSkew: 0,
    teethUpper: 0.2, teethLower: 0.7, tongue: 0.45, mouthStyle: 'tremble',
    blush: 0.65, sweat: 0, tears: 1.0, tearStream: 1.0,
    headTilt: -8.0,
  },

  laughing: {
    browInnerY_L: 0.45, browOuterY_L: 0.35, browCurve_L: -0.4,
    browInnerY_R: 0.45, browOuterY_R: 0.35, browCurve_R: -0.4,
    upperLid_L: 0.95, lowerLid_L: 0.85, eyeWide_L: 0,
    upperLid_R: 0.95, lowerLid_R: 0.85, eyeWide_R: 0,
    pupilSize: 1.0, gazeX: 0, gazeY: 0,
    mouthOpen: 0.75, mouthWidth: 1.35, mouthSmile: 1.0, mouthSkew: 0,
    teethUpper: 1.0, teethLower: 0.3, tongue: 0.75, mouthStyle: 'normal',
    blush: 0.85, sweat: 0, tears: 0.25, tearStream: 0,
    headTilt: 8.5,
  },
};

/**
 * 6 Phonetic Visemes for Speech Mouth Animation
 */
export const VISEMES = {
  REST: {
    mouthOpen: 0.0,
    mouthWidth: 1.0,
    teethUpper: 0.0,
    teethLower: 0.0,
    tongue: 0.0,
    mouthStyle: 'normal',
  },
  AA: {
    mouthOpen: 0.85,   // Wide open jaw
    mouthWidth: 1.05,
    teethUpper: 0.65,
    teethLower: 0.0,
    tongue: 0.5,
    mouthStyle: 'normal',
  },
  OH: {
    mouthOpen: 0.65,   // Rounded cylinder
    mouthWidth: 0.58,  // Puckered narrow
    teethUpper: 0.0,
    teethLower: 0.0,
    tongue: 0.25,
    mouthStyle: 'o_shape',
  },
  EE: {
    mouthOpen: 0.28,   // Slit open
    mouthWidth: 1.42,  // Wide grin stretch
    teethUpper: 1.0,
    teethLower: 0.85,  // Clenched teeth visible
    tongue: 0.0,
    mouthStyle: 'normal',
  },
  MBP: {
    mouthOpen: 0.0,    // Fully pressed lips
    mouthWidth: 0.94,
    teethUpper: 0.0,
    teethLower: 0.0,
    tongue: 0.0,
    mouthStyle: 'mbp',
  },
  FV: {
    mouthOpen: 0.22,   // Upper teeth resting on lower lip
    mouthWidth: 1.12,
    teethUpper: 1.0,
    teethLower: 0.0,
    tongue: 0.0,
    mouthStyle: 'fv',
  },
};

/**
 * Linearly interpolates two numbers
 */
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Smooth Hermite / S-Curve easing for seamless emotion transitions
 */
export function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Blends two face state objects with a weight alpha (0 = stateA, 1 = stateB)
 */
export function blendFaceStates(stateA, stateB, alpha) {
  const k = Math.max(0, Math.min(1, alpha));
  const out = { ...stateA };

  for (const key of Object.keys(DEFAULT_FACE_STATE)) {
    if (typeof DEFAULT_FACE_STATE[key] === 'number') {
      const vA = stateA[key] ?? DEFAULT_FACE_STATE[key];
      const vB = stateB[key] ?? DEFAULT_FACE_STATE[key];
      out[key] = lerp(vA, vB, k);
    }
  }

  // Discrete style switches at halfway
  out.mouthStyle = k < 0.5 ? (stateA.mouthStyle || 'normal') : (stateB.mouthStyle || 'normal');
  return out;
}

/**
 * Blends an active viseme shape onto a base facial emotion
 */
export function blendViseme(faceState, visemeName = 'REST', weight = 1.0) {
  const vis = VISEMES[visemeName] || VISEMES.REST;
  const w = Math.max(0, Math.min(1, weight));
  if (w === 0) return { ...faceState };

  const out = { ...faceState };
  out.mouthOpen = lerp(faceState.mouthOpen, vis.mouthOpen, w);
  out.mouthWidth = lerp(faceState.mouthWidth, vis.mouthWidth, w);
  out.teethUpper = lerp(faceState.teethUpper, vis.teethUpper, w);
  out.teethLower = lerp(faceState.teethLower, vis.teethLower, w);
  out.tongue = lerp(faceState.tongue, vis.tongue, w);

  if (w > 0.4 && vis.mouthStyle !== 'normal') {
    out.mouthStyle = vis.mouthStyle;
  }
  return out;
}

/**
 * Expression Transition Controller
 * Manages deterministic, time-based smooth blending between emotional states.
 */
export class ExpressionController {
  constructor(initialExpression = 'confident') {
    this.currentExpression = initialExpression;
    this.targetExpression = initialExpression;
    this.fromState = { ...DEFAULT_FACE_STATE, ...(EXPRESSIONS[initialExpression] || {}) };
    this.toState = { ...this.fromState };

    this.transitionStart = 0;
    this.transitionDuration = 0; // 0 = instantaneous

    // Overrides
    this.gazeX = 0;
    this.gazeY = 0;
    this.headTiltOverride = null;
    this.activeViseme = 'REST';
    this.visemeWeight = 1.0;
  }

  setExpression(name) {
    if (!EXPRESSIONS[name]) return;
    this.currentExpression = name;
    this.targetExpression = name;
    this.fromState = { ...DEFAULT_FACE_STATE, ...EXPRESSIONS[name] };
    this.toState = { ...this.fromState };
    this.transitionDuration = 0;
  }

  transitionTo(name, durationSec = 0.4, startTime = 0) {
    if (!EXPRESSIONS[name]) return;
    this.fromState = this.evaluate(startTime); // Capture current blended state as source
    this.toState = { ...DEFAULT_FACE_STATE, ...EXPRESSIONS[name] };
    this.currentExpression = this.targetExpression;
    this.targetExpression = name;
    this.transitionStart = startTime;
    this.transitionDuration = Math.max(0.01, durationSec);
  }

  setGaze(x, y) {
    this.gazeX = Math.max(-1, Math.min(1, x));
    this.gazeY = Math.max(-1, Math.min(1, y));
  }

  setHeadTilt(deg) {
    this.headTiltOverride = deg;
  }

  setViseme(name, weight = 1.0) {
    this.activeViseme = name;
    this.visemeWeight = weight;
  }

  /**
   * Evaluates the active interpolated face state at film time t
   */
  evaluate(t = 0) {
    let alpha = 1.0;
    if (this.transitionDuration > 0) {
      const elapsed = t - this.transitionStart;
      alpha = smoothstep(elapsed / this.transitionDuration);
      if (alpha >= 1.0) {
        this.currentExpression = this.targetExpression;
        this.fromState = { ...this.toState };
        this.transitionDuration = 0;
      }
    }

    let state = blendFaceStates(this.fromState, this.toState, alpha);

    // Apply Gaze Overrides if specified
    if (this.gazeX !== 0 || this.gazeY !== 0) {
      state.gazeX = lerp(state.gazeX, this.gazeX, 0.85);
      state.gazeY = lerp(state.gazeY, this.gazeY, 0.85);
    }

    // Apply Head Tilt Override if specified
    if (this.headTiltOverride !== null) {
      state.headTilt = this.headTiltOverride;
    }

    // Apply Speech Viseme Blend
    if (this.activeViseme !== 'REST') {
      state = blendViseme(state, this.activeViseme, this.visemeWeight);
    }

    return state;
  }
}

/**
 * Dedicated Canvas2D Vector Renderer for Dynamic Facial Features
 * Renders into local Head bone space (0,0 = neck joint, +X = up to crown, +Y = left ear, -Y = right ear).
 */
export function drawFacialFeatures(ctx, headBone, faceState = DEFAULT_FACE_STATE, palette = {}) {
  const L = headBone.length || 140;
  const crownX = L;
  const hw = 56;
  const eyeX = crownX * 0.42;
  const eyeSpacing = 24;

  const S = { ...DEFAULT_FACE_STATE, ...faceState };
  const skinShadow = palette.skinShadow || '#BF825E';
  const hairShadow = palette.hairShadow || '#15131A';
  const eyesColor = palette.eyes || '#3A281E';

  ctx.save();

  // 1. Cheeks & Blush
  if (S.blush > 0.05) {
    ctx.save();
    ctx.fillStyle = `rgba(235, 105, 115, ${S.blush * 0.55})`;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(eyeX - 10, side * (eyeSpacing + 14), 11, 18, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 2. Eyebrows (Left and Right independently articulated)
  const drawEyebrow = (side, innerY, outerY, curve) => {
    ctx.save();
    ctx.strokeStyle = hairShadow;
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';

    const yStart = side * (eyeSpacing - 12);
    const yMid = side * eyeSpacing;
    const yEnd = side * (eyeSpacing + 22);

    const xBase = eyeX + 18;
    const xInner = xBase + innerY * 14;
    const xOuter = xBase + outerY * 12;
    const xMid = (xInner + xOuter) / 2 + (curve < 0 ? -curve * 8 : -curve * 4);

    ctx.beginPath();
    ctx.moveTo(xInner, yStart);
    ctx.quadraticCurveTo(xMid, yMid, xOuter, yEnd);
    ctx.stroke();

    // Furrow crease lines if angry or intensely worried
    if (innerY < -0.4) {
      ctx.strokeStyle = skinShadow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(xBase - 2, side * 6);
      ctx.lineTo(xBase + 10, side * 10);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawEyebrow(1, S.browInnerY_L, S.browOuterY_L, S.browCurve_L);   // Left brow (+Y)
  drawEyebrow(-1, S.browInnerY_R, S.browOuterY_R, S.browCurve_R); // Right brow (-Y)

  // 3. Eyes (Sclera, Pupils, Eyelids, Catchlights)
  const drawEye = (side, upperLid, lowerLid, eyeWide) => {
    const yCenter = side * (eyeSpacing + 4);
    const radX = 7.5 * (1 + eyeWide * 0.4);
    const radY = 11.5 * (1 + eyeWide * 0.4);

    ctx.save();

    // If crying or laughing with eyes squeezed shut
    if (upperLid >= 0.9 && lowerLid >= 0.8) {
      // Curved inverted squint lines (crow's feet)
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX + 6, yCenter, radY * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Laugh/cry crease wrinkles
      ctx.strokeStyle = skinShadow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eyeX + 4, yCenter + side * 12);
      ctx.lineTo(eyeX + 12, yCenter + side * 18);
      ctx.stroke();

      // Streaming Tears (if crying)
      if (S.tearStream > 0.1) {
        ctx.fillStyle = 'rgba(120, 210, 255, 0.75)';
        ctx.strokeStyle = '#4FA8D8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(eyeX + 2, yCenter + side * 6);
        ctx.bezierCurveTo(eyeX - 16, yCenter + side * 10, eyeX - 26, yCenter + side * 4, eyeX - 45, yCenter + side * 8);
        ctx.lineTo(eyeX - 44, yCenter + side * 12);
        ctx.bezierCurveTo(eyeX - 25, yCenter + side * 8, eyeX - 15, yCenter + side * 14, eyeX + 2, yCenter + side * 8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Normal or Wide Eyes
    ctx.beginPath();
    ctx.ellipse(eyeX + 6, yCenter, radX, radY, side * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Eye clipping region for lids & iris
    ctx.save();
    ctx.clip();

    // Iris & Pupil with gaze offset
    const pupilR = 5.5 * S.pupilSize;
    const px = eyeX + 6 + S.gazeY * 4.5;
    const py = yCenter + S.gazeX * 5.5;

    ctx.fillStyle = eyesColor;
    ctx.beginPath();
    ctx.arc(px, py, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil core (deep black)
    ctx.fillStyle = '#110F17';
    ctx.beginPath();
    ctx.arc(px, py, pupilR * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Primary Specular Catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 2.2, py + side * 1.8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Secondary tiny catchlight
    ctx.beginPath();
    ctx.arc(px - 1.8, py - side * 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid shade (slides down from +X)
    if (upperLid > 0) {
      ctx.fillStyle = skinShadow;
      ctx.fillRect(eyeX + 6 + (1 - upperLid * 2) * radX, yCenter - radY * 1.5, radX * 3, radY * 3);
    }

    // Lower eyelid squint (slides up from -X)
    if (lowerLid > 0) {
      ctx.fillStyle = skinShadow;
      ctx.fillRect(eyeX + 6 - radX * 1.5, yCenter - radY * 1.5, lowerLid * radX * 1.8, radY * 3);
    }

    ctx.restore(); // end eye clip

    // Eye outline
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Heavy upper lid line crease
    ctx.beginPath();
    const lidX = eyeX + 6 + (0.5 - upperLid) * radX * 0.8;
    ctx.arc(lidX, yCenter, radY, Math.PI * 0.8, Math.PI * 1.6);
    ctx.lineWidth = 3.6;
    ctx.stroke();

    // Tear glisten dot in inner corner
    if (S.tears > 0.2) {
      ctx.fillStyle = 'rgba(160, 225, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(eyeX - 1, yCenter - side * 6, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  drawEye(1, S.upperLid_L, S.lowerLid_L, S.eyeWide_L);   // Left eye (+Y)
  drawEye(-1, S.upperLid_R, S.lowerLid_R, S.eyeWide_R); // Right eye (-Y)

  // 4. Nose
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(eyeX + 8, 0);
  ctx.lineTo(eyeX - 12, 4);
  ctx.lineTo(eyeX - 14, -3);
  ctx.stroke();

  // 5. Mouth & Jaw
  const mouthX = eyeX - 34;
  const mw = 20 * S.mouthWidth;
  const mh = Math.max(3, 24 * S.mouthOpen);
  const skew = S.mouthSkew * 12;

  ctx.save();
  ctx.translate(mouthX, skew);

  if (S.mouthStyle === 'o_shape' || S.mouthOpen > 0.45) {
    // Open Mouth Cavity (Speech AA, Shocked, Laughing, Screaming)
    ctx.beginPath();
    if (S.mouthStyle === 'o_shape') {
      // Rounded oval
      ctx.ellipse(0, 0, mh * 0.65, mw * 0.85, 0, 0, Math.PI * 2);
    } else {
      // Contoured open mouth (teeth & tongue)
      const arch = S.mouthSmile * 8;
      ctx.moveTo(arch, -mw);
      ctx.quadraticCurveTo(arch + 4, 0, arch, mw);
      ctx.quadraticCurveTo(-mh * 1.2, 0, arch, -mw);
    }
    ctx.closePath();

    ctx.fillStyle = '#26121D'; // Deep mouth cavity
    ctx.fill();

    // Inside mouth clipping region
    ctx.save();
    ctx.clip();

    // Upper Teeth
    if (S.teethUpper > 0.1) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(0, -mw * 0.85, mh * 0.45 * S.teethUpper, mw * 1.7, 4);
      ctx.fill();
      ctx.strokeStyle = '#D9D5D0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Lower Teeth
    if (S.teethLower > 0.1) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(-mh * 0.9, -mw * 0.7, mh * 0.4 * S.teethLower, mw * 1.4, 4);
      ctx.fill();
    }

    // Tongue
    if (S.tongue > 0.1) {
      ctx.fillStyle = '#DE5D70';
      ctx.beginPath();
      ctx.ellipse(-mh * 0.65, 0, mh * 0.5 * S.tongue, mw * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

  } else if (S.mouthStyle === 'grit') {
    // Clenched Teeth (Angry)
    ctx.beginPath();
    ctx.roundRect(-mh * 0.4, -mw, mh * 0.8, mw * 2, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Teeth seam line
    ctx.strokeStyle = '#4A3B43';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -mw + 3); ctx.lineTo(0, mw - 3);
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(-mh * 0.35, i * 8); ctx.lineTo(mh * 0.35, i * 8);
    }
    ctx.stroke();

  } else if (S.mouthStyle === 'fv') {
    // Viseme FV: Upper teeth resting on lower lip
    ctx.beginPath();
    ctx.moveTo(4, -mw);
    ctx.quadraticCurveTo(0, 0, 4, mw);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Upper teeth visible
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(0, -mw * 0.55, 6, mw * 1.1, 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();

  } else if (S.mouthStyle === 'wavy' || S.mouthStyle === 'tremble') {
    // Anxious or quivering line
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -mw);
    ctx.bezierCurveTo(4, -mw * 0.3, -8, mw * 0.3, 0, mw);
    ctx.stroke();

  } else {
    // Standard closed smile/frown arc
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    const curve = S.mouthSmile * 14;

    ctx.beginPath();
    ctx.moveTo(-curve * 0.3, -mw);
    ctx.quadraticCurveTo(curve, 0, -curve * 0.3, mw);
    ctx.stroke();

    // Lip corner smile tick marks
    if (Math.abs(S.mouthSmile) > 0.4) {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-curve * 0.3, mw);
      ctx.lineTo(-curve * 0.1, mw + 4);
      ctx.stroke();
    }
  }

  // Lower lip hint
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-10 - mh * 0.2, 0, 7, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  ctx.restore(); // end mouth

  // 6. Sweat Bead (for shocked/worried)
  if (S.sweat > 0.1) {
    ctx.save();
    ctx.globalAlpha = S.sweat;
    const sx = eyeX + 22, sy = hw * 0.82;
    ctx.fillStyle = '#9FE2FF';
    ctx.strokeStyle = '#4AA0C8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 14, sy + 6, sx - 16, sy);
    ctx.quadraticCurveTo(sx - 14, sy - 6, sx, sy);
    ctx.fill(); ctx.stroke();

    // Highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sx - 10, sy - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
