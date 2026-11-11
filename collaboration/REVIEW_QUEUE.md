# Narrivo Engine — Review Queue & Technical Audit

This document tracks active review items, outstanding discrepancies, known technical limitations, and upcoming engineering priorities.

---

## 1. Outstanding Review Items

### Item A: Clean vs. Diagnostic Demonstration Video Verification
- **Background:** The user reported that an uploaded file labeled as `vance_clean_character_demo.mp4` visibly contained the Narrivo title banner and animation labels.
- **Investigation & Findings:**
  1. The rendering pipeline generates two distinct video streams from the same 23.0 s / 690 frame animation pass:
     - `vance_clean_character_demo.mp4`: Clean canvas pass with only character artwork rendered against the dark studio backdrop. Zero text, zero HUD cards, zero timers.
     - `vance_diagnostic_demo.mp4`: Telemetry pass containing the header card ("NARRIVO HYBRID • COMMANDER VANCE VISUAL CORRECTION") and bottom action cards ("3. GESTURE: POINTING", timecodes, frame counters).
  2. Direct frame extraction from the actual generated `vance_clean_character_demo.mp4` across timestamps (1s, 5s, 10s, 13s, 15s, 17s, 19s, 22s) confirmed that the file itself contains **zero overlays**.
  3. The likely source of user confusion was either an accidental download of the diagnostic MP4, the previous `vance_locomotion_gesture_demo.mp4` (which had lower-third banners), or a local browser/file cache overlap.
- **Action Taken:**
  - Fresh re-encode executed directly from `clean_frames/frame_%04d.jpg` via ffmpeg.
  - Multi-timestamp visual audit re-verified via image extraction.
  - Deliverable link clearly isolated in deliverables.

### Item B: Frontal 2D Rigging Kinematic Limits
- **Observation:** In a purely front-facing 2D planar artwork decomposition, high-amplitude out-of-plane rotations (such as deep knee bending or raising the arm perpendicular to the camera) can reveal seam cutouts or foreshortening discontinuities unless supported by 3D mesh projection or multi-angle artwork.
- **Current Calibration:**
  - Coronal hip rotation clamped to ±1.6°.
  - Pelvic vertical displacement clamped to -2.5 px.
  - Knee rotation clamped to -2.5°.
  - Shoulder coronal elevation limited to ±4.5°.
- **Status:** Awaiting user evaluation on whether this calibrated frontal range provides sufficient life and character presence for production explainer videos before advancing to multi-angle / 3D projection.

---

## 2. Planned Development Priorities

1. **Sign-off on Commander Vance Locomotion / Gesture Baseline:**
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
