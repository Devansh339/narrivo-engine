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

### Milestone 10 — Commander Vance Animation Correction Pass
- **Feedback Addressed:** ChatGPT review of the 23-second video indicated that while character artwork and rendering were approved, movement and gestures required more communicative clarity:
  1. *Walking:* Previously looked like mere weight shifting; needed alternating leg strides, visible knee and foot lift, and grounded stance.
  2. *Pointing:* Needed an assertive pointing arm toward target with clear pointing hand and head gaze directed at target.
  3. *Waving:* Needed active repeated 2.5 Hz wrist wave oscillation beside the head.
  4. *Open Palms:* Needed welcoming/explanatory posture with open palms and supinated forearms.
  5. *Thinking:* Preserved contemplative hand-to-chin gesture with subtle head tilt.
  6. *Hands on Hips:* Both hands visibly resting against the waistband/hips with outward flared elbows and clean sleeve cuff overlap (`drawArmsMode: 'hands_on_hips'`).
  7. *Arms Crossed:* Unmistakable crossed-arm pose folded across tactical chest harness with clean layered forearms (`drawArmsMode: 'arms_crossed'`).
- **Kinematic Discoveries & Rig Implementation (`engine.js`):**
  - *Frontal Walking Kinematics:* 2D coronal knee rotation tears horizontal notches because 2D knees cannot bend sideways in a frontal view. Developed sagittal perspective kinematics:
    - Vertical pelvic bob (-4.5px) and lateral weight transfer (±2.8px, ±1.5°).
    - Stance foot firmly grounded on canvas floor (`boot.ty = 0`) with zero floating.
    - Swing leg lifts thigh (`hip.ty = -5px`, `scaleY = 0.97`), raises knee (`knee.ty = -9px`), and cleanly lifts boot off ground (`boot.ty = -14px`).
    - Opposing arm swing (±5.5°) with forearm flexion on forward swing.
  - *Layer Sorting & Armscye Preservation:*
    - Updated `VanceRenderer.render` to dynamically re-order arm layers based on pose mode: upper arm sleeve cuffs cap forearm elbows, eliminating raw border exposures.
- **Deliverables & Verification:**
  - `development/narrivo-hybrid/animation/engine.js` updated with full kinematic calibrations and draw orders.
  - 12-panel unannotated (`vance_unannotated_contact_sheet.png`) and annotated (`vance_annotated_contact_sheet.png`) contact sheets rendered directly from `engine.js`.
  - Full 690-frame 23-second clean (`vance_clean_character_demo.mp4`) and diagnostic (`vance_diagnostic_demo.mp4`) videos re-rendered.
  - Milestone status remains **PENDING APPROVAL** awaiting final reviewer evaluation.
