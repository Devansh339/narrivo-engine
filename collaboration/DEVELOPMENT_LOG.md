# Narrivo Engine — Chronological Development Log

This log documents the actual completed milestones and development progression in strict chronological order.

---

### Milestone 1 — Core Workspace & Six Production Templates
- Established the foundational faceless short-form video generation engine.
- Implemented six distinct visual templates with complete reference examples and style documentation:
  1. `styles/deep-dive/`: 3D procedural explainers.
  2. `styles/night-file/`: Atmospheric 3D investigative scenes.
  3. `styles/inside-out/`: 2D x-ray procedural diagrams.
  4. `styles/stick-story/`: Kinetic minimalist vector storytelling.
  5. `styles/paper-atlas/`: Cut-paper historical maps.
  6. `styles/tall-tale/`: Hybrid 2D cartoon characters in 3D environments.
- Built automated production scripts (`scripts/new_video.sh`, `scripts/setup.sh`, `scripts/selftest.sh`).
- Integrated local voice generation via Kokoro-82M and word-level forced alignment via Whisper.

---

### Milestone 2 — Character Design & Gate 1 Master Bust Approval
- Initiated character design exploration for **Commander Vance** (lead narrative protagonist).
- Explored multiple artistic directions; Direction 3 (illustrated graphic realism with painterly textures) selected and approved.
- Key costume elements locked: distressed brown leather flight jacket, cream shearling collar, oatmeal henley shirt, leather tactical harness.
- Completed Gate 1 Master Bust illustration as the primary facial identity and costume reference.

---

### Milestone 3 — Direct Segmentation & Hidden-Overlap Proof-of-Concept
- Proved direct master raster segmentation on the Commander Vance bust without AI re-hallucination.
- Extracted head, front hair, back hair, neck, left/right collar, and jacket torso.
- Reconstructed hidden occluded regions (neck beneath collar/jaw, collar underlap).
- Verified neutral reassembly against master pixels: 0-pixel drift achieved.

---

### Milestone 4 — Targeted Localized 2D Mesh Deformation (FFD) Test
- Investigated localized Free-Form Deformation (FFD) to solve joint silhouette discontinuities during rotation:
  - Jaw-to-shearling-collar junction during head rotation (±4.0°).
  - Shoulder-to-collar junction during shoulder movement (±3.5°).
- Implemented `ffd_engine.js` with localized lattice deformation.
- Visual comparison confirmed smooth silhouette preservation without distorting painted facial features or jacket textures.
- Approach formally approved for joint transitions.

---

### Milestone 5 — Full-Body Master Artwork (Gate 2)
- Created the definitive high-resolution full-body illustration of Commander Vance:
  - Neutral relaxed A-pose.
  - Complete character from head to toe (olive cargo trousers, lace-up combat boots, detailed hands).
  - High-resolution asset matching Gate 1 identity and Direction 3 lighting.
- Formally approved as the production visual master reference (`vance_full_body_01`).

---

### Milestone 6 — Full-Body 19-Component Segmentation & Reconstruction
- Applied direct segmentation to the full-body master artwork, extracting 19 independent components:
  1. Back hair
  2. Head and face
  3. Front hair
  4. Neck
  5. Left shearling collar
  6. Right shearling collar
  7. Torso (jacket & harness)
  8. Left upper arm
  9. Right upper arm
  10. Left forearm
  11. Right forearm
  12. Left hand
  13. Right hand
  14. Pelvis and belt
  15. Left upper leg
  16. Right upper leg
  17. Left lower leg
  18. Right lower leg
  19. Left combat boot & Right combat boot
- Reconstructed occluded regions (elbows under forearms, wrists under cuffs, knees, ankles under trouser cuffs).
- Built component manifest `manifest.json`.
- Neutral reassembly confirmed 100% preservation of visible master pixels.

---

### Milestone 7 — Articulation Cleanup & Micro-Cleanup Passes
- **Issue identified:** Initial articulation tests revealed grey rectangular/trapezoidal panels beside the torso and thigh discontinuities during movement.
- **Root-cause analysis:** Traced to background alpha contamination in component borders and improper canvas clearing.
- **Correction 1:** Cleaned alpha masks, verified over checkerboard transparency, and eliminated grey panels.
- **Correction 2 (Micro-cleanup):** Identified minor detached brown/orange pixel fragments around hands and outer thighs. Reassigned master pixels to correct anatomical masks without deleting legitimate artwork.
- Resulting 19-component clean asset set approved as the foundation for locomotion and gesture animation.

---

### Milestone 8 — Locomotion & Gesture Rig Implementation
- Implemented hierarchical Forward Kinematics (FK) rig and state machine controller in `development/narrivo-hybrid/animation/engine.js`.
- Implemented Idle respiration cycle (chest elevation, subtle shoulder shrug, gentle pelvic sway).
- Implemented bipedal walking cycle (alternating leg strides, opposing arm swing, pelvic cadence bob).
- Implemented six narrative gestures:
  1. Pointing
  2. Waving
  3. Open Palms
  4. Thinking (hand to chin)
  5. Hands on Hips
  6. Arms Crossed
- Implemented cubic Hermite blend crossfading between animation states.

---

### Milestone 9 — Kinematic Calibration & Dual Export Pipeline
- **Visual review correction pass:**
  - Clamped coronal leg separation to ±1.6° to eliminate thigh and knee cutout artifacts.
  - Reduced upper arm coronal rotation to ±4.5° anchored inside the shearling collar to prevent armscye gaps.
  - Re-anchored gestures to ensure poses visually match their semantic names and remain strictly within frame bounds.
  - Maintained grounded boot contact with 120 px floor margin and 80 px top clearance.
- **Export Pipeline Refinement:**
  - Created dual rendering pipeline (`render_both_demos.js`):
    - `vance_clean_character_demo.mp4`: 100% clean character on studio background with zero overlays.
    - `vance_diagnostic_demo.mp4`: character + telemetry HUD, state counters, and section headers.
    - `vance_corrected_contact_sheet.png`: 12-panel annotated review contact sheet.
  - Verified clean MP4 frame-by-frame via ffmpeg extraction across the 23-second timeline.

---

### Milestone 10 — Commander Vance Animation Correction Pass (`77ecc64`)
- **Review Context:** ChatGPT review of the prior 23-second clean video indicated that while artwork and rendering were acceptable, several animations needed stronger movement and gesture readability (walking, pointing, waving, open palms, thinking preserved, hands on hips, arms crossed).
- **Kinematic & Rig Changes Committed in `development/narrivo-hybrid/animation/engine.js` (`77ecc64`):**
  1. *Walking (`evaluateWalk`, `stridePeriod = 1.08 s`):* Implemented sagittal translation/foreshortening kinematics (`pelvis.ty = -4.5 * bob`, `pelvis.tx = ±2.8 px`, `pelvis.rot = ±1.5°`, `torso.rot = ±0.975°`, `torso.ty = pelvis.ty * 0.35`, `hip.rot = ±1.2°`, `knee.rot = 0°`, swing `hip.ty = -5.0 px`, `hip.scaleY = 0.97`, `knee.ty = -9.0 px`, `boot.ty = -14.0 px`, stance `boot.ty = 0 px`, `shld.rot = ±5.5°`, `shld.ty = -1.0 px` max, `elb.rot = +10.0° / -10.0°`, `wrt.rot = ±2.0°`).
  2. *Pointing (`evaluateGesture('pointing')`):* `shldR.rot = -4.5°` (`ty -1.5`), `elbR.rot = -24.0°` (`tx -1.0`), `wrtR.rot = -34.0°`, `head.rot = -3.2°`, `neck.rot = -1.6°`, `shldL.rot = +1.0°`, `armsInFront = true`.
  3. *Waving (`evaluateGesture('waving')`):* `shldR.rot = -4.5°` (`ty -2.0`), `elbR.rot = -132.0°` (`tx -10.0, ty -8.0`), `wrtR.rot = -24.0° + sin(5πt) * 14.0°` (2.5 Hz oscillation), `head.rot = +2.5°`, `neck.rot = +1.2°`, `shldL.rot = +0.8°`, `armsInFront = true`.
  4. *Open Palms (`evaluateGesture('open_palms')`):* `shldL/R.rot = ±5.5°` (`ty -1.5`), `elbL/R.rot = ±14.0°` (`tx ±2.0`), `wrtL/R.rot = ±16.0°` (`tx ±6.0`), `torso.scaleX = 1.018`, `scaleY = 1.010`, `head.rot = +0.8°`, `armsInFront = false`.
  5. *Thinking (`evaluateGesture('thinking')`):* `shldR.rot = +0.8°` (`ty -2.0`), `elbR.rot = +134.0°` (`tx -8.0, ty -6.0`), `wrtR.rot = +14.0°`, `shldL.rot = -1.5°`, `elbL.rot = -10.0°`, `head.rot = +3.2°`, `neck.rot = +1.6°`, `armsInFront = true`.
  6. *Hands on Hips (`evaluateGesture('hands_on_hips')`):* `shldL/R.rot = +3.5° / -3.5°` (`ty -1.5`), `elbL/R.rot = -15.0° / +15.0°`, `wrtL/R.rot = -18.0° / +18.0°` (`tx ±14.0, ty -20.0`), `torso.scaleY = 1.008`, `drawArmsMode = 'hands_on_hips'`.
  7. *Arms Crossed (`evaluateGesture('arms_crossed')`):* `shldL/R.rot = +2.0° / -2.0°` (`ty -1.5`), `elbL.rot = -36.0°` (`tx +4.0, ty -4.0`), `elbR.rot = +38.0°` (`tx -4.0, ty -6.0`), `wrtL.rot = -22.0°` (`tx +16.0, ty -12.0`), `wrtR.rot = +24.0°` (`tx -16.0, ty -14.0`), `head.rot = -1.2°`, `drawArmsMode = 'arms_crossed'`.
  8. *Layer Ordering (`VanceRenderer.render`):* Added `applyHip`/`applyKnee`/`applyBoot` translation & scale support and `drawArmsMode` draw branches (`'hands_on_hips'`, `'arms_crossed'`, `armsInFront`, default).
- **Deliverables & Sync:**
  - `vance_clean_character_demo.mp4` (`5,627,297` bytes, `19:42:36 +05:30`) and `vance_diagnostic_demo.mp4` (`5,836,145` bytes, `19:43:06 +05:30`) verified current against `engine.js` (`19:35:01 +05:30`, `77ecc64`) and uploaded to GitHub Release `vance-visual-review` (replacing earlier assets).
  - Unannotated (`2400×1400`, `1,548,203` bytes) and annotated (`2400×1650`, `1,521,478` bytes) contact sheets staged in `collaboration/review/`.
  - Milestone status remains **PENDING APPROVAL** awaiting user and ChatGPT visual evaluation.
