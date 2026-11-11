/**
 * NARRIVO — FULL-BODY LOCOMOTION & GESTURE ANIMATION ENGINE
 *
 * Implements deterministic hierarchical FK animation, soft-tissue FFD,
 * multi-clip blending, and transition state machine for Commander Vance.
 *
 * Layers: 19 segmented & reconstructed master illustration components.
 * Viewport: 768x1376 native / 1080x1920 Full HD Canvas2D.
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
      elbL:      { rot: 0 },
      elbR:      { rot: 0 },
      wrtL:      { rot: 0 },
      wrtR:      { rot: 0 },
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

    ['pelvis', 'torso', 'head', 'shldL', 'shldR', 'hipL', 'hipR'].forEach(j => {
      ['tx', 'ty', 'rot', 'scaleX', 'scaleY'].forEach(k => {
        if (pA[j] && pB[j]) blendProp(pA[j], pB[j], out[j], k);
      });
    });

    ['neck', 'frontHair', 'backHair', 'collarL', 'collarR', 'elbL', 'elbR', 'wrtL', 'wrtR', 'kneeL', 'kneeR', 'bootL', 'bootR'].forEach(j => {
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
    // Inhale is slightly shorter than exhale for human realism:
    const breath = Math.sin(breathPhase * 2 * Math.PI - Math.PI / 2) * 0.5 + 0.5; // [0..1]

    p.torso.scaleY = 1.0 + 0.0075 * breath;
    p.torso.scaleX = 1.0 + 0.0035 * breath;
    p.torso.ty     = -1.6 * breath;

    // Subtle shoulder elevation on inhale:
    p.shldL.rot = -0.75 * breath;
    p.shldR.rot = +0.75 * breath;

    // 2. Secondary Pelvis Weight Sway (5.4s period)
    const swayPeriod = 5.4;
    const sway = Math.sin(timeSec * (2 * Math.PI / swayPeriod));

    p.pelvis.tx  = sway * 1.6;
    p.pelvis.rot = sway * 0.5;

    // Counter-stabilization in legs:
    p.hipL.rot = -sway * 0.45;
    p.hipR.rot = -sway * 0.45;

    // 3. Subtle Head Micro-Pitch & Roll
    p.head.rot = Math.sin(timeSec * 1.25) * 0.7 + Math.cos(timeSec * 0.65) * 0.35;
    p.neck.rot = Math.sin(timeSec * 1.05) * 0.45;

    // 4. Subtle Hand Relaxation & Passive Drift
    p.wrtL.rot = Math.sin(timeSec * 1.4) * 0.35;
    p.wrtR.rot = -Math.sin(timeSec * 1.35) * 0.35;

    return p;
  }

  /**
   * TASK 2 — WALKING CYCLE
   * Complete deterministic bipedal locomotion.
   * Alternating legs, opposing arms, pelvis bob, ground contact, knee flexion.
   */
  function evaluateWalk(timeSec) {
    const p = createDefaultPose();

    // Locomotion cadence: 1.08 seconds per full stride cycle (approx 111 steps/min)
    const stridePeriod = 1.08;
    const phase = (timeSec % stridePeriod) / stridePeriod; // 0.0 to 1.0
    const phiL = phase * 2 * Math.PI;
    const phiR = phiL + Math.PI;

    // Pelvic Kinematics:
    // Vertical bob: reaches lowest point at heel strike (0.0, 0.5), peak at passing (0.25, 0.75)
    // Keep bob subtle (-2.5px native = -3.5px in 1080p) so character stays solidly grounded:
    const bob = Math.sin(phase * 4 * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    p.pelvis.ty = -2.8 * bob;

    // Lateral weight transfer toward supporting stance leg:
    const lateralSway = Math.sin(phiL);
    p.pelvis.tx  = lateralSway * 1.8;
    p.pelvis.rot = lateralSway * 0.8;

    // Upper Torso Counter-Balance:
    p.torso.rot = -p.pelvis.rot * 0.7;
    p.torso.ty  = p.pelvis.ty * 0.25;

    // Head Stabilization (Gaze remains horizontal and focused):
    p.head.rot = -p.torso.rot * 0.75;
    p.neck.rot = -p.torso.rot * 0.35;

    // FRONTAL LEG KINEMATICS (Strictly prevent lateral splay & preserve knee/ankle seams):
    // In frontal bipedal walking, hip coronal rotation is very subtle (+/- 1.8 deg):
    p.hipL.rot = Math.sin(phiL) * 1.8;
    p.hipR.rot = Math.sin(phiR) * 1.8;

    // Subtle vertical knee/leg lift on the forward-swinging recovery leg:
    const swingL = Math.max(0, -Math.sin(phiL));
    const swingR = Math.max(0, -Math.sin(phiR));

    p.hipL.ty = -swingL * 3.2;
    p.hipR.ty = -swingR * 3.2;

    // Knee flexion during swing: subtle (-4.5 deg max) staying well within the 26px knee overlap dome:
    p.kneeL.rot = -(swingL * 4.5);
    p.kneeR.rot = -(swingR * 4.5);

    // Boot ankle rotation: stay planar (0 deg) to guarantee zero horizontal ankle slits:
    p.bootL.rot = 0;
    p.bootR.rot = 0;

    // Opposing Arm Swing (Arm swings counter to corresponding leg stride):
    // Kept within +/- 5.0 deg so upper sleeves never detach from shoulder armscye:
    p.shldL.rot = -Math.sin(phiL) * 4.8;
    p.shldR.rot = -Math.sin(phiR) * 4.8;

    // Forearm subtle forward flexion on forward swing:
    const armFwdL = Math.max(0, -Math.sin(phiL));
    const armFwdR = Math.max(0, -Math.sin(phiR));
    p.elbL.rot = armFwdL * 6.5;
    p.elbR.rot = -armFwdR * 6.5;

    // Natural wrist lag:
    p.wrtL.rot = -Math.cos(phiL) * 1.5;
    p.wrtR.rot = -Math.cos(phiR) * 1.5;

    return p;
  }

  /**
   * TASK 3 — GESTURES
   * Distinct, expressive character postures preserving artwork anatomy.
   */
  function evaluateGesture(gestureName, timeSec) {
    const p = createDefaultPose();
    const breath = Math.sin(timeSec * 2) * 0.5 + 0.5;
    p.torso.scaleY = 1.0 + 0.005 * breath;

    switch (gestureName) {
      case 'pointing':
        // Assertive forward/target pointing:
        // Right shoulder elevates slightly (-3.5 deg, ty: -2px) staying connected to torso:
        p.shldR.rot = -3.5;
        p.shldR.ty  = -2.0;
        // Right forearm extends forward and points toward target:
        p.elbR.rot  = -8.0;
        p.wrtR.rot  = -4.0;
        // Head and neck turn purposefully toward direction of point:
        p.head.rot  = -2.8;
        p.neck.rot  = -1.6;
        p.torso.rot = -0.8;
        // Left arm remains disciplined at side:
        p.shldL.rot = +1.0;
        break;

      case 'waving':
        // High, friendly greeting wave within safe frame boundaries:
        // Right upper arm raises moderately (-10 deg) staying anchored at shoulder:
        p.shldR.rot = -10.0;
        p.shldR.ty  = -2.5;
        // Right forearm flexes UPWARD beside head (-115 deg counter-clockwise):
        p.elbR.rot  = -112.0;
        // Oscillating 2.0 Hz wrist wave:
        p.wrtR.rot  = Math.sin(timeSec * 4.0 * Math.PI) * 14.0;
        // Pleasant sympathetic head tilt:
        p.head.rot  = +2.5;
        p.neck.rot  = +1.2;
        p.shldL.rot = +1.2;
        p.armsInFront = true;
        break;

      case 'open_palms':
        // Natural welcoming / explanatory posture:
        // Both upper arms articulate slightly outward:
        p.shldL.rot = +4.5;
        p.shldR.rot = -4.5;
        // Forearms articulate outward in open stance:
        p.elbL.rot  = +8.5;
        p.elbR.rot  = -8.5;
        p.wrtL.rot  = +5.0;
        p.wrtR.rot  = -5.0;
        p.torso.scaleX = 1.012;
        p.head.rot  = +0.6;
        break;

      case 'thinking':
        // Classic contemplative pose: hand touches chin/jawline:
        // Right upper arm raises and supports:
        p.shldR.rot = +6.0;
        p.shldR.ty  = -3.0;
        // Right forearm flexes UP and INWARD toward chin (+128 deg clockwise):
        p.elbR.rot  = +126.0;
        p.wrtR.rot  = +12.0;
        // Left arm crosses across waist to support right elbow:
        p.shldL.rot = -6.5;
        p.elbL.rot  = -32.0;
        p.wrtL.rot  = -6.0;
        // Contemplative head tilt:
        p.head.rot  = +3.5;
        p.neck.rot  = +1.8;
        p.armsInFront = true;
        break;

      case 'hands_on_hips':
        // Confident grounded stance with hands resting on waistband:
        // Upper arms abducted slightly with elbows flared:
        p.shldL.rot = +8.0;
        p.shldR.rot = -8.0;
        // Forearms flexed inward toward belt:
        p.elbL.rot  = -42.0;
        p.elbR.rot  = +42.0;
        // Hands cupped at iliac crest / belt:
        p.wrtL.rot  = -18.0;
        p.wrtR.rot  = +18.0;
        p.torso.scaleY = 1.010;
        p.armsInFront = true;
        break;

      case 'arms_crossed':
        // Authoritative folded arms genuinely crossing over tactical chest harness:
        // Both upper arms fold inward across chest:
        p.shldL.rot = -10.0;
        p.shldR.rot = +10.0;
        // Both forearms fold horizontally across chest harness:
        p.elbL.rot  = -68.0;
        p.elbR.rot  = +68.0;
        p.wrtL.rot  = -8.0;
        p.wrtR.rot  = +8.0;
        p.head.rot  = -1.5;
        p.neck.rot  = -0.8;
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
      this.transitionDuration = 0.45; // 0.45 seconds default crossfade
      this.transitionProgress = 1.0;
      this.time = 0;
      this.clipTime = 0;
      this.targetClipTime = 0;
    }

    play(clipName, transitionSec = 0.45) {
      if (clipName === this.currentClip && this.transitionProgress >= 1.0) return;
      if (clipName === this.targetClip) return;

      this.targetClip = clipName;
      this.transitionDuration = Math.max(0.05, transitionSec);
      this.transitionProgress = 0.0;
      this.targetClipTime = 0;
    }

    update(dt) {
      this.time += dt;
      this.clipTime += dt;
      if (this.targetClip) this.targetClipTime += dt;

      if (this.transitionProgress < 1.0) {
        this.transitionProgress += dt / this.transitionDuration;
        if (this.transitionProgress >= 1.0) {
          this.transitionProgress = 1.0;
          this.currentClip = this.targetClip;
          this.clipTime = this.targetClipTime;
          this.targetClip = null;
        }
      }
    }

    sampleClip(clipName, t) {
      if (clipName === 'idle') return evaluateIdle(t);
      if (clipName === 'walk') return evaluateWalk(t);
      return evaluateGesture(clipName, t);
    }

    getCurrentPose() {
      const poseA = this.sampleClip(this.currentClip, this.clipTime);
      if (this.transitionProgress >= 1.0 || !this.targetClip) {
        return poseA;
      }
      const poseB = this.sampleClip(this.targetClip, this.targetClipTime);
      return blendPoses(poseA, poseB, this.transitionProgress);
    }
  }

  // -------------------------------------------------------------
  // CANVAS2D HIERARCHICAL RIG RENDERER
  // -------------------------------------------------------------
  class VanceRenderer {
    constructor(manifest, imageMap) {
      this.manifest = manifest;
      this.imgs = imageMap;
      this.compMap = {};
      manifest.components.forEach(c => this.compMap[c.key] = c);
    }

    /**
     * Render the character into a 2D canvas context at specified pose
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} pose
     * @param {Object} options { width, height, is1080, background }
     */
    render(ctx, pose, options = {}) {
      const width = options.width || 768;
      const height = options.height || 1376;
      const is1080 = !!options.is1080;
      const bg = options.background || 'studio'; // 'studio', 'checker', 'transparent'

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Render Canvas Background
      if (bg === 'studio') {
        const grad = ctx.createRadialGradient(
          width / 2, height * 0.4, 50,
          width / 2, height * 0.4, height * 0.65
        );
        grad.addColorStop(0, '#1c2230');
        grad.addColorStop(1, '#0c0f16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (bg === 'checker') {
        ctx.fillStyle = '#555963';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#434750';
        const tileSize = is1080 ? 32 : 20;
        for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
            if (((x / tileSize) ^ (y / tileSize)) & 1) {
              ctx.fillRect(x, y, tileSize, tileSize);
            }
          }
        }
      }

      // 1080x1920 Viewport Scaling
      if (is1080) {
        // Full character height in native coords is y=26 to y=1349 (1323px).
        // Target character height in 1920p is 1720px, giving 90px top margin and 110px bottom margin.
        const scale = 1720 / 1323; // approx 1.300
        const dx = (1080 - 768 * scale) / 2;
        const dy = 80 - 26 * scale; // align hair top at y=80px
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
        ctx.translate(P.elbL.x, P.elbL.y);
        ctx.rotate(deg(p.elbL.rot));
        ctx.translate(-P.elbL.x, -P.elbL.y);
      };

      const applyWrtL = ctx => {
        applyElbL(ctx);
        ctx.translate(P.wrtL.x, P.wrtL.y);
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
        ctx.translate(P.elbR.x, P.elbR.y);
        ctx.rotate(deg(p.elbR.rot));
        ctx.translate(-P.elbR.x, -P.elbR.y);
      };

      const applyWrtR = ctx => {
        applyElbR(ctx);
        ctx.translate(P.wrtR.x, P.wrtR.y);
        ctx.rotate(deg(p.wrtR.rot));
        ctx.translate(-P.wrtR.x, -P.wrtR.y);
      };

      // HIERARCHICAL RENDERING ORDER:
      // z=0: 01_back_hair
      drawPart('01_back_hair', applyHead);

      // z=1: 04_neck
      drawPart('04_neck', applyNeck);

      // z=2, 3: Boots (under lower legs)
      drawPart('12_boot_left', applyBootL);
      drawPart('12_boot_right', applyBootR);

      // z=4, 5: Lower Legs (under upper legs, knee domes extending under hem)
      drawPart('11_lower_leg_left', applyKneeL);
      drawPart('11_lower_leg_right', applyKneeR);

      // z=6, 7: Upper Legs
      drawPart('10_upper_leg_left', applyHipL);
      drawPart('10_upper_leg_right', applyHipR);

      // z=8: Pelvis & Belt
      drawPart('09_pelvis_belt', applyPelvis);

      // Draw arms behind torso unless armsInFront flag is active (e.g. arms crossed):
      if (!p.armsInFront) {
        // z=9, 10: Hands
        drawPart('09_hand_left', applyWrtL);
        drawPart('09_hand_right', applyWrtR);

        // z=11, 12: Forearms
        drawPart('08_forearm_left', applyElbL);
        drawPart('08_forearm_right', applyElbR);
      }

      // z=13: Jacket Torso & Harness
      drawPart('06_jacket_torso', applyTorso);

      // z=14, 15: Upper Arms (shoulders over torso flank)
      drawPart('07_upper_arm_left', applyShldL);
      drawPart('07_upper_arm_right', applyShldR);

      // If arms crossed, draw forearms and hands in front of torso:
      if (p.armsInFront) {
        drawPart('09_hand_right', applyWrtR);
        drawPart('08_forearm_right', applyElbR);
        drawPart('09_hand_left', applyWrtL);
        drawPart('08_forearm_left', applyElbL);
      }

      // z=16, 17: Shearling Collars
      drawPart('05_collar_left', applyTorso);
      drawPart('05_collar_right', applyTorso);

      // z=18: Head & Face
      drawPart('02_head_face', applyHead);

      // z=19: Front Hair
      drawPart('03_front_hair', applyHead);

      ctx.restore();
    }
  }

  // Export engine components
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
})(typeof window !== 'undefined' ? window : global);
