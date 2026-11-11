# Narrivo Engine — Review Queue & Technical Audit

This document tracks active review items, outstanding discrepancies, known technical limitations, and upcoming engineering priorities.

---

## 1. Active Visual Review Item

### Item: Commander Vance Locomotion & Gesture Prototype
- **Status:** **PENDING VISUAL APPROVAL** (Awaiting review by user and ChatGPT).
- **Deliverables Package:** Documented in [`collaboration/review/README.md`](review/README.md).
- **Core Review Assets:**
  - **Clean Video:** `vance_clean_character_demo.mp4` (100% overlay-free character animation, 23.00 s @ 30 FPS).
  - **Diagnostic Video:** `vance_diagnostic_demo.mp4` (telemetry pass with section headers, counters, and technical data).
  - **Unannotated Contact Sheet:** `collaboration/review/vance_unannotated_contact_sheet.png` (clean 12-state visual montage).
  - **Annotated Contact Sheet:** `collaboration/review/vance_annotated_contact_sheet.png` (12 states with kinematics metadata).
  - **GitHub Release Access:** Available on GitHub Releases tag `vance-visual-review` without committing large binaries into git history.

### Key Evaluation Criteria for Reviewers:
1. **Walk Cycle Naturalness:** Does the frontal bipedal cadence read naturally given the front-facing 2D plane constraint?
2. **Boot Grounding:** Are combat boots stably grounded without foot-sliding or canvas clipping?
3. **Seam Integrity:** Are the shoulder armscye junctions clean and free of rectangular cutout gaps?
4. **Gesture Readability:** Do all 6 gestures (Pointing, Waving, Open Palms, Thinking, Hands on Hips, Arms Crossed) clearly and anatomically match their semantic names?
5. **Clean Viewport:** Is the clean demonstration video completely free of any text overlays, timecodes, or HUD cards?

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
