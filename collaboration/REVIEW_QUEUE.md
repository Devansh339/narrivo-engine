# Narrivo Engine — Review Queue & Technical Audit

This document tracks active review items, outstanding discrepancies, known technical limitations, and upcoming engineering priorities.

---

## 1. Active Visual Review Item

### Item: Commander Vance Locomotion & Gesture Prototype (Correction Pass — Commit `77ecc64`)
- **Status:** **PENDING VISUAL APPROVAL** (Awaiting review by user and ChatGPT).
- **Deliverables Package:** Documented in [`collaboration/review/README.md`](review/README.md).
- **Core Review Assets:**
  - **Clean Video:** `vance_clean_character_demo.mp4` (`5,627,297` bytes, `23.00 s` @ 30 FPS, `1080×1920`, zero overlays).
  - **Diagnostic Video:** `vance_diagnostic_demo.mp4` (`5,836,145` bytes, `23.00 s` @ 30 FPS, `1080×1920`, telemetry HUD pass).
  - **Unannotated Contact Sheet:** `collaboration/review/vance_unannotated_contact_sheet.png` (`2400×1400`, `1,548,203` bytes).
  - **Annotated Contact Sheet:** `collaboration/review/vance_annotated_contact_sheet.png` (`2400×1650`, `1,521,478` bytes).
  - **GitHub Release Access:** Replaced under GitHub Releases tag `vance-visual-review` (`2026-11-11T14:31Z`) without committing large MP4 binaries into git history.

### Key Evaluation Criteria & Known Observations for Reviewers (Commit `77ecc64`):
1. **Walk Cycle Naturalness & Grounding:** Does the sagittal stepping cadence (`pelvis.ty = -4.5 px`, `hip.ty = -5.0 px`, `knee.ty = -9.0 px`, `boot.ty = -14.0 px` on swing vs `boot.ty = 0 px` in stance) read convincingly as frontal walking without foot-sliding or knee/ankle notching?
2. **Joint & Seam Integrity:** Check elbow seams during high-angle flexion (`waving` at `-132°`, `thinking` at `+134°`, `arms_crossed` at `-36° / +38°`) and shoulder armscye junctions (`open_palms` / `walk` at `±5.5°`). Note: direct visual inspection of `77ecc64` frames shows visible elbow cuff discontinuities in `waving`, `thinking`, and `arms_crossed`.
3. **Gesture Readability & Sign Conventions:**
   - *Pointing:* Evaluates `shldR = -4.5°`, `elbR = -24°`, `wrtR = -34°`, `head = -3.2°`. Inspect whether wrist rotation reads cleanly without appearing over-bent.
   - *Waving:* Evaluates `shldR = -4.5°`, `elbR = -132°`, `wrtR = -24° + sin(5πt) * 14°` (`2.5 Hz`).
   - *Open Palms:* Evaluates `shld ±5.5°`, `elb ±14°`, `wrt ±16°`.
   - *Thinking:* Evaluates `elbR = +134°`, `wrtR = +14°`, `head = +3.2°`.
   - *Hands on Hips:* Evaluates `shld ±3.5°`, `elbL = -15° / elbR = +15°`, `wrt.tx = ±14 px`. Note: visual inspection shows these angles bring the hands inward toward the center waistband/belt rather than resting outward on the lateral hip crests.
   - *Arms Crossed:* Evaluates `elbL = -36°`, `elbR = +38°`, `wrt.ty = -12 / -14 px`. Note: visual inspection shows hands meeting near the lower torso/abdomen rather than horizontally across the chest harness, with elbow notches visible.
4. **Clean Viewport:** Confirm `vance_clean_character_demo.mp4` contains zero text overlays, banners, or HUDs across all 690 frames.

---

## 2. Planned Development Priorities (Post-Approval)

1. **Sign-off on Commander Vance Baseline:**
   - Formal approval of the clean baseline demonstration.
2. **Environment & Scene Staging:**
   - Hybrid compositing: mounting Commander Vance inside a 3D environment generated using Three.js (e.g., control room, hangar, cockpit, terrain).
   - Real-time shadow casting and depth-buffered background occlusion.
3. **Audio-Visual Pacing & Lipsync:**
   - Word-level mouth shape articulation (phoneme-to-viseme mapping for Kokoro TTS audio).
   - Eye blink and natural micro-saccades during speech pauses.
4. **Prop & Interaction Rigging:**
   - Equipping hand anchor points for props (holster drawing, tablet/device interaction, pointer sticks).
5. **Autonomous Pipeline Orchestration:**
   - Automated ingestion of topic prompt → script generation → audio generation → shot timing → headless Chrome render → ffmpeg stitch → QA audit contact sheet.
