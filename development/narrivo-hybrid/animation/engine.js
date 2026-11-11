/**
 * NARRIVO — FULL-BODY LOCOMOTION & GESTURE ANIMATION ENGINE
 * Visual Correction Pass (Milestone 2B)
 *
 * Implements deterministic hierarchical FK animation, soft-tissue breathing,
 * multi-clip blending, and transition state machine for Commander Vance.
 *
 * Calibrated front-facing planar kinematics:
 * - Walking cycle with zero thigh/knee cutout artifacts, grounded stance, zero splay
 * - Seamless shoulder connections without rectangular gaps
 * - 6 anatomically verified expressive gestures matching names
 * - Complete 1080x1920 in-canvas containment (hair and boots fully visible)
 *
 * Layers: 19 segmented & reconstructed master illustration components.
 * Viewport: 1080x1920 Full HD Canvas2D.
 */

(function(global) {
  'use strict';

  const deg = d => d * Math.PI / 180;
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  // Joint & Pivot Manifest (Master Coordinates on 768x1376 canvas)
  const PIVOTS = {
    pelvis:     { x: 384, y: 655 },
    torso:      { x: 384, y: 450 },
    neck:       { x: 384, y: 255 },
    head:       { x: 384, y: 185 },
    frontHair:  { x: 384, y: 185 },
    backHair:   { x: 384, y: 155 },
    collarL:    { x: 312, y: 260 },
    collarR:    { x: 456, y: 260 },
    shldL:      { x: 264, y: 260 },
    shldR:      { x: 504, y: 260 },
    elbL:       { x: 214, y: 506 },
    elbR:       { x: 554, y: 506 },
    wrtL:       { x: 215, y: 654 },
    wrtR:       { x: 553, y: 654 },
    hipL:       { x: 348, y: 685 },
    hipR:       { x: 420, y: 685 },
    kneeL:      { x: 344, y: 944 },
    kneeR:      { x: 424, y: 944 },
    bootL:      { x: 345, y: 1125 },
    bootR:      { x: 423, y: 1125 }
  };

  /**
   * Default Neutral Pose state
   */
  function createDefaultPose() {
    return {
      pelvis:    { tx: 0, ty: 0, rot: 0, scaleX: 1, scaleY: 1 },
      torso:     { tx: 0, ty: 0, rot: 0, scaleX: 1, scaleY: 1 },
      neck:      { rot: 0 },
      head:      { tx: 0, ty: 0, rot: 0 },
      frontHair: { rot: 0 },
      backHair:  { rot: 0 },
      collarL:   { rot: 0 },
      collarR:   { rot: 0 },
      shldL:     { rot: 0, tx: 0, ty: 0 },
      shldR:     { rot: 0, tx: 0, ty: 0 },
      elbL:      { rot: 0, tx: 0, ty: 0 },
      elbR:      { rot: 0, tx: 0, ty: 0 },
      wrtL:      { rot: 0, tx: 0, ty: 0 },
      wrtR:      { rot: 0, tx: 0, ty: 0 },
      hipL:      { rot: 0, tx: 0, ty: 0 },
      hipR:      { rot: 0, tx: 0, ty: 0 },
      kneeL:     { rot: 0 },
      kneeR:     { rot: 0 },
      bootL:     { rot: 0 },
      bootR:     { rot: 0 },
      armsInFront: false
    };
  }

  function clonePose(p) {
    return JSON.parse(JSON.stringify(p));
  }

  function blendPoses(pA, pB, weight) {
    const w = clamp(weight, 0, 1);
    const s = smoothstep(w);
    const out = createDefaultPose();

    function blendProp(objA, objB, target, key) {
      if (typeof objA[key] === 'number') {
        target[key] = lerp(objA[key], objB[key], s);
      }
    }

    ['pelvis', 'torso', 'head', 'shldL', 'shldR', 'elbL', 'elbR', 'wrtL', 'wrtR', 'hipL', 'hipR'].forEach(j => {
      ['tx', 'ty', 'rot', 'scaleX', 'scaleY'].forEach(k => {
        if (pA[j] && pB[j]) blendProp(pA[j], pB[j], out[j], k);
      });
    });

    ['neck', 'frontHair', 'backHair', 'collarL', 'collarR', 'kneeL', 'kneeR', 'bootL', 'bootR'].forEach(j => {
      if (pA[j] && pB[j]) blendProp(pA[j], pB[j], out[j], 'rot');
    });

    out.armsInFront = s > 0.5 ? pB.armsInFront : pA.armsInFront;
    return out;
  }

  // -------------------------------------------------------------
  // ANIMATION CLIPS (Deterministic Generator Functions)
  // -------------------------------------------------------------

  /**
   * TASK 1 — IDLE ANIMATION
   * Natural respiration, subtle chest rise & fall, gentle weight shift sway, head drift.
   */
  function evaluateIdle(timeSec) {
    const p = createDefaultPose();

    // 1. Primary Respiration Cycle (3.2s period)
    const breathPeriod = 3.2;
    const breathPhase = (timeSec % breathPeriod) / breathPeriod;
    const breath = Math.sin(breathPhase * 2 * Math.PI - Math.PI / 2) * 0.5 + 0.5;

    p.torso.scaleY = 1.0 + 0.0075 * breath;
    p.torso.scaleX = 1.0 + 0.0035 * breath;
    p.torso.ty     = -1.6 * breath;

    p.shldL.rot    = -0.75 * breath;
    p.shldR.rot    = +0.75 * breath;

    // 2. Secondary Pelvis Weight Sway (5.4s period)
    const swayPeriod = 5.4;
    const sway = Math.sin(timeSec * (2 * Math.PI / swayPeriod));

    p.pelvis.tx    = sway * 1.5;
    p.pelvis.rot   = sway * 0.45;

    p.hipL.rot     = -sway * 0.40;
    p.hipR.rot     = -sway * 0.40;

    // 3. Subtle Head Micro-Pitch & Roll
    p.head.rot     = Math.sin(timeSec * 1.25) * 0.65;
    p.neck.rot     = Math.sin(timeSec * 1.05) * 0.40;

    // 4. Subtle Hand Relaxation & Passive Drift
    p.wrtL.rot     = Math.sin(timeSec * 1.4) * 0.35;
    p.wrtR.rot     = -Math.sin(timeSec * 1.35) * 0.35;

    return p;
  }

  /**
   * TASK 2 — WALKING CYCLE (Calibrated Frontal Locomotion)
   * Frontal bipedal locomotion preserving 100% seam integrity:
   * - Eliminates lateral leg splay (hip rotation strictly +/- 1.6 deg)
   * - Eliminates knee/ankle cutout slits (hip vertical ty=0, knee flexion -2.5 deg max)
   * - Grounded foot contact with boots fully in-canvas
   * - Natural opposing arm swing (+/- 3.8 deg) with seamless shoulder armscye
   */
  function evaluateWalk(timeSec) {
    const p = createDefaultPose();

    const stridePeriod = 1.08;
    const phase = (timeSec % stridePeriod) / stridePeriod;
    const phiL = phase * 2 * Math.PI;
    const phiR = phiL + Math.PI;

    // Pelvic Cadence: subtle vertical bob & lateral weight transfer
    const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    p.pelvis.ty  = -2.5 * bob;
    const lateral = Math.sin(phiL);
    p.pelvis.tx  = lateral * 1.6;
    p.pelvis.rot = lateral * 0.65;

    // Torso Counter-Rotation & Balance
    p.torso.rot  = -p.pelvis.rot * 0.65;
    p.torso.ty   = p.pelvis.ty * 0.25;

    // Head Stabilization
    p.head.rot   = -p.torso.rot * 0.75;
    p.neck.rot   = -p.torso.rot * 0.35;

    // Frontal Hip Strides (subtle coronal angle, no wide splay)
    p.hipL.rot   = Math.sin(phiL) * 1.6;
    p.hipR.rot   = Math.sin(phiR) * 1.6;

    // Knee Flexion during recovery swing (subtle, strictly within 26px knee overlap buffer)
    const swingL = Math.max(0, -Math.sin(phiL));
    const swingR = Math.max(0, -Math.sin(phiR));
    p.kneeL.rot  = -(swingL * 2.5);
    p.kneeR.rot  = -(swingR * 2.5);

    // Boots stay grounded and planar (zero horizontal slit tearing)
    p.bootL.rot  = 0;
    p.bootR.rot  = 0;

    // Opposing Arm Swing (Left arm swings counter to left leg stride)
    p.shldL.rot  = -Math.sin(phiL) * 3.8;
    p.shldR.rot  = -Math.sin(phiR) * 3.8;

    const armFwdL = Math.max(0, -Math.sin(phiL));
    const armFwdR = Math.max(0, -Math.sin(phiR));
    p.elbL.rot   = armFwdL * 4.5;
    p.elbR.rot   = -armFwdR * 4.5;

    p.wrtL.rot   = -Math.cos(phiL) * 1.2;
    p.wrtR.rot   = -Math.cos(phiR) * 1.2;

    return p;
  }

  /**
   * TASK 3 — GESTURES (Anatomically Calibrated & Verified)
   */
  function evaluateGesture(gestureName, timeSec) {
    const p = createDefaultPose();
    const breath = Math.sin(timeSec * 2) * 0.5 + 0.5;
    p.torso.scaleY = 1.0 + 0.005 * breath;

    switch (gestureName) {
      case 'pointing':
        // Assertive forward directional pointing:
        // Right shoulder raises slightly (-4.0 deg, ty: -2px) staying connected to torso:
        p.shldR.rot = -4.0;
        p.shldR.ty  = -2.0;
        p.elbR.rot  = -12.0;
        p.elbR.tx   = -2.0;
        p.wrtR.rot  = -6.0;
        p.head.rot  = -2.5;
        p.neck.rot  = -1.5;
        p.shldL.rot = +0.8;
        break;

      case 'waving':
        // High greeting wave beside head within safe frame boundaries:
        // Right upper arm raises moderately (-5.0 deg, ty: -2.5px), anchored at collar:
        p.shldR.rot = -5.0;
        p.shldR.ty  = -2.5;
        // Forearm flexes upward beside head (-140 deg):
        p.elbR.rot  = -140.0;
        p.elbR.tx   = -10.0;
        p.elbR.ty   = -8.0;
        // Oscillating 2.0 Hz wrist wave:
        p.wrtR.rot  = Math.sin(timeSec * 4.0 * Math.PI) * 12.0;
        p.head.rot  = +2.2;
        p.neck.rot  = +1.2;
        p.shldL.rot = +0.8;
        p.armsInFront = true;
        break;

      case 'open_palms':
        // Natural welcoming / explanatory posture:
        p.shldL.rot = +3.5;
        p.shldR.rot = -3.5;
        p.elbL.rot  = +7.0;
        p.elbR.rot  = -7.0;
        p.wrtL.rot  = +4.5;
        p.wrtR.rot  = -4.5;
        p.torso.scaleX = 1.012;
        p.head.rot  = +0.8;
        break;

      case 'thinking':
        // Contemplative pose: right hand touches chin/jawline:
        p.shldR.rot = +0.8;
        p.shldR.ty  = -2.0;
        p.elbR.rot  = +134.0;
        p.elbR.tx   = -8.0;
        p.elbR.ty   = -6.0;
        p.wrtR.rot  = +14.0;
        p.shldL.rot = -1.5;
        p.elbL.rot  = -12.0;
        p.head.rot  = +3.2;
        p.neck.rot  = +1.6;
        p.armsInFront = true;
        break;

      case 'hands_on_hips':
        // Confident grounded stance with hands resting on jacket waistband/hips:
        p.shldL.rot = +2.5;
        p.shldR.rot = -2.5;
        p.elbL.rot  = -10.0;
        p.elbR.rot  = +10.0;
        p.wrtL.tx   = +16.0;
        p.wrtR.tx   = -16.0;
        p.wrtL.ty   = -20.0;
        p.wrtR.ty   = -20.0;
        p.wrtL.rot  = -10.0;
        p.wrtR.rot  = +10.0;
        p.torso.scaleY = 1.008;
        p.armsInFront = true;
        break;

      case 'arms_crossed':
        // Folded arms crossing horizontally across chest harness:
        p.shldL.rot = -4.0;
        p.shldR.rot = +4.0;
        p.shldL.ty  = -2.0;
        p.shldR.ty  = -2.0;
        p.elbL.rot  = -35.0;
        p.elbR.rot  = +35.0;
        p.wrtL.tx   = +10.0;
        p.wrtR.tx   = -10.0;
        p.wrtL.ty   = -10.0;
        p.wrtR.ty   = -10.0;
        p.head.rot  = -1.2;
        p.neck.rot  = -0.6;
        p.armsInFront = true;
        break;
    }

    return p;
  }

  // -------------------------------------------------------------
  // TASK 4 — TRANSITION CONTROLLER & BLEND STATE MACHINE
  // -------------------------------------------------------------
  class AnimationController {
    constructor() {
      this.currentClip = 'idle';
      this.targetClip = null;
      this.transitionDuration = 0.50;
      this.transitionProgress = 1.0;
      this.time = 0;
      this.clipTime = 0;
      this.targetClipTime = 0;
    }

    play(clipName, transitionSec = 0.50) {
      if (clipName === this.currentClip && this.transitionProgress >= 1.0) return;
      if (clipName === this.targetClip) return;

      if (this.transitionProgress < 1.0) {
        this.currentClip = this.targetClip;
        this.clipTime = this.targetClipTime;
      }
      this.targetClip = clipName;
      this.transitionDuration = Math.max(0.1, transitionSec);
      this.transitionProgress = 0.0;
      this.targetClipTime = 0.0;
    }

    update(dt) {
      this.time += dt;
      this.clipTime += dt;
      if (this.targetClip) {
        this.targetClipTime += dt;
        this.transitionProgress += dt / this.transitionDuration;
        if (this.transitionProgress >= 1.0) {
          this.currentClip = this.targetClip;
          this.clipTime = this.targetClipTime;
          this.targetClip = null;
          this.transitionProgress = 1.0;
        }
      }
    }

    getCurrentPose() {
      const getPose = (clip, t) => {
        if (clip === 'idle') return evaluateIdle(t);
        if (clip === 'walk') return evaluateWalk(t);
        return evaluateGesture(clip, t);
      };

      const poseCurrent = getPose(this.currentClip, this.clipTime);
      if (!this.targetClip || this.transitionProgress >= 1.0) {
        return poseCurrent;
      }
      const poseTarget = getPose(this.targetClip, this.targetClipTime);
      return blendPoses(poseCurrent, poseTarget, this.transitionProgress);
    }
  }

  // -------------------------------------------------------------
  // HIERARCHICAL CANVAS2D RENDERER
  // -------------------------------------------------------------
  class VanceRenderer {
    constructor(manifest, imageMap) {
      this.manifest = manifest;
      this.imgs = imageMap;
      this.compMap = {};
      manifest.components.forEach(c => {
        this.compMap[c.key] = c;
      });
    }

    render(ctx, pose, options = {}) {
      const width = options.width || 1080;
      const height = options.height || 1920;
      const is1080 = !!options.is1080;
      const bg = options.background || 'studio';

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Studio Vignette Background
      if (bg === 'studio') {
        const grad = ctx.createRadialGradient(
          width / 2, height * 0.4, 50,
          width / 2, height * 0.4, height * 0.65
        );
        grad.addColorStop(0, '#1c2230');
        grad.addColorStop(1, '#0c0f16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 1080x1920 Viewport Scaling with comfortable head & floor clearance:
      // Native character height = 1323px (y=26 to y=1349).
      // Scale: 1720 / 1323 = 1.300. Hair top at y=80px, boot soles at y=1800px (120px floor clearance).
      if (is1080) {
        const scale = 1720 / 1323;
        const dx = (1080 - 768 * scale) / 2;
        const dy = 80 - 26 * scale;
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);
      }

      const drawPart = (key, transformFn) => {
        const c = this.compMap[key];
        if (!c || !this.imgs[key]) return;
        ctx.save();
        if (transformFn) transformFn(ctx, c);
        ctx.drawImage(this.imgs[key], c.cropBox.x, c.cropBox.y);
        ctx.restore();
      };

      const P = PIVOTS;
      const p = pose;

      // Pelvis Root Transform
      const applyPelvis = ctx => {
        ctx.translate(P.pelvis.x + p.pelvis.tx, P.pelvis.y + p.pelvis.ty);
        ctx.rotate(deg(p.pelvis.rot));
        ctx.scale(p.pelvis.scaleX, p.pelvis.scaleY);
        ctx.translate(-P.pelvis.x, -P.pelvis.y);
      };

      // Torso Transform (Parent: Pelvis)
      const applyTorso = ctx => {
        applyPelvis(ctx);
        ctx.translate(P.torso.x + p.torso.tx, P.torso.y + p.torso.ty);
        ctx.rotate(deg(p.torso.rot));
        ctx.scale(p.torso.scaleX, p.torso.scaleY);
        ctx.translate(-P.torso.x, -P.torso.y);
      };

      // Neck & Head Transforms (Parent: Torso)
      const applyNeck = ctx => {
        applyTorso(ctx);
        ctx.translate(P.neck.x, P.neck.y);
        ctx.rotate(deg(p.neck.rot));
        ctx.translate(-P.neck.x, -P.neck.y);
      };

      const applyHead = ctx => {
        applyNeck(ctx);
        ctx.translate(P.head.x + p.head.tx, P.head.y + p.head.ty);
        ctx.rotate(deg(p.head.rot));
        ctx.translate(-P.head.x, -P.head.y);
      };

      // Left Leg Transforms (Parent: Pelvis)
      const applyHipL = ctx => {
        applyPelvis(ctx);
        ctx.translate(P.hipL.x + p.hipL.tx, P.hipL.y + p.hipL.ty);
        ctx.rotate(deg(p.hipL.rot));
        ctx.translate(-P.hipL.x, -P.hipL.y);
      };

      const applyKneeL = ctx => {
        applyHipL(ctx);
        ctx.translate(P.kneeL.x, P.kneeL.y);
        ctx.rotate(deg(p.kneeL.rot));
        ctx.translate(-P.kneeL.x, -P.kneeL.y);
      };

      const applyBootL = ctx => {
        applyKneeL(ctx);
        ctx.translate(P.bootL.x, P.bootL.y);
        ctx.rotate(deg(p.bootL.rot));
        ctx.translate(-P.bootL.x, -P.bootL.y);
      };

      // Right Leg Transforms (Parent: Pelvis)
      const applyHipR = ctx => {
        applyPelvis(ctx);
        ctx.translate(P.hipR.x + p.hipR.tx, P.hipR.y + p.hipR.ty);
        ctx.rotate(deg(p.hipR.rot));
        ctx.translate(-P.hipR.x, -P.hipR.y);
      };

      const applyKneeR = ctx => {
        applyHipR(ctx);
        ctx.translate(P.kneeR.x, P.kneeR.y);
        ctx.rotate(deg(p.kneeR.rot));
        ctx.translate(-P.kneeR.x, -P.kneeR.y);
      };

      const applyBootR = ctx => {
        applyKneeR(ctx);
        ctx.translate(P.bootR.x, P.bootR.y);
        ctx.rotate(deg(p.bootR.rot));
        ctx.translate(-P.bootR.x, -P.bootR.y);
      };

      // Left Arm Transforms (Parent: Torso)
      const applyShldL = ctx => {
        applyTorso(ctx);
        ctx.translate(P.shldL.x + p.shldL.tx, P.shldL.y + p.shldL.ty);
        ctx.rotate(deg(p.shldL.rot));
        ctx.translate(-P.shldL.x, -P.shldL.y);
      };

      const applyElbL = ctx => {
        applyShldL(ctx);
        ctx.translate(P.elbL.x + (p.elbL.tx || 0), P.elbL.y + (p.elbL.ty || 0));
        ctx.rotate(deg(p.elbL.rot));
        ctx.translate(-P.elbL.x, -P.elbL.y);
      };

      const applyWrtL = ctx => {
        applyElbL(ctx);
        ctx.translate(P.wrtL.x + (p.wrtL.tx || 0), P.wrtL.y + (p.wrtL.ty || 0));
        ctx.rotate(deg(p.wrtL.rot));
        ctx.translate(-P.wrtL.x, -P.wrtL.y);
      };

      // Right Arm Transforms (Parent: Torso)
      const applyShldR = ctx => {
        applyTorso(ctx);
        ctx.translate(P.shldR.x + p.shldR.tx, P.shldR.y + p.shldR.ty);
        ctx.rotate(deg(p.shldR.rot));
        ctx.translate(-P.shldR.x, -P.shldR.y);
      };

      const applyElbR = ctx => {
        applyShldR(ctx);
        ctx.translate(P.elbR.x + (p.elbR.tx || 0), P.elbR.y + (p.elbR.ty || 0));
        ctx.rotate(deg(p.elbR.rot));
        ctx.translate(-P.elbR.x, -P.elbR.y);
      };

      const applyWrtR = ctx => {
        applyElbR(ctx);
        ctx.translate(P.wrtR.x + (p.wrtR.tx || 0), P.wrtR.y + (p.wrtR.ty || 0));
        ctx.rotate(deg(p.wrtR.rot));
        ctx.translate(-P.wrtR.x, -P.wrtR.y);
      };

      // DRAW ORDER:
      drawPart('01_back_hair', applyHead);
      drawPart('04_neck', applyNeck);
      drawPart('12_boot_left', applyBootL);
      drawPart('12_boot_right', applyBootR);
      drawPart('11_lower_leg_left', applyKneeL);
      drawPart('11_lower_leg_right', applyKneeR);
      drawPart('10_upper_leg_left', applyHipL);
      drawPart('10_upper_leg_right', applyHipR);
      drawPart('09_pelvis_belt', applyPelvis);

      if (!p.armsInFront) {
        drawPart('09_hand_left', applyWrtL);
        drawPart('09_hand_right', applyWrtR);
        drawPart('08_forearm_left', applyElbL);
        drawPart('08_forearm_right', applyElbR);
      }

      drawPart('06_jacket_torso', applyTorso);
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);

      if (p.armsInFront) {
        drawPart('09_hand_right', applyWrtR);
        drawPart('08_forearm_right', applyElbR);
        drawPart('09_hand_left', applyWrtL);
        drawPart('08_forearm_left', applyElbL);
      }

      drawPart('05_collar_left', applyTorso);
      drawPart('05_collar_right', applyTorso);
      drawPart('02_head_face', applyHead);
      drawPart('03_front_hair', applyHead);

      ctx.restore();
    }
  }

  // Export engine
  const VanceEngine = {
    PIVOTS,
    createDefaultPose,
    clonePose,
    blendPoses,
    evaluateIdle,
    evaluateWalk,
    evaluateGesture,
    AnimationController,
    VanceRenderer
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VanceEngine;
  } else {
    global.VanceEngine = VanceEngine;
  }

})(typeof window !== 'undefined' ? window : this);
