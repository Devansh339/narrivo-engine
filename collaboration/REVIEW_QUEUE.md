# Narrivo Engine — Review Queue & Technical Audit

This document tracks active review items, outstanding discrepancies, known technical limitations, and upcoming engineering priorities.

---

## 1. Active Visual Review Item

### Item: Commander Vance Locomotion & Gesture Prototype (Correction Pass)
- **Status:** **PENDING VISUAL APPROVAL** (Awaiting review by user and ChatGPT).
- **Deliverables Package:** Documented in [`collaboration/review/README.md`](review/README.md).
- **Core Review Assets:**
  - **Clean Video:** `vance_clean_character_demo.mp4` (100% overlay-free character animation, 23.00 s @ 30 FPS).
  - **Diagnostic Video:** `vance_diagnostic_demo.mp4` (telemetry pass with section headers, counters, and technical data).
  - **Unannotated Contact Sheet:** `collaboration/review/vance_unannotated_contact_sheet.png` (clean 12-state visual montage).
  - **Annotated Contact Sheet:** `collaboration/review/vance_annotated_contact_sheet.png` (12 states with kinematics metadata).
  - **GitHub Release Access:** Available on GitHub Releases tag `vance-visual-review` without committing large binaries into git history.

### Key Evaluation Criteria for Reviewers (Milestone 10):
1. **Walk Cycle Naturalness & Grounding:** Does the frontal bipedal cadence read naturally with visible knee/boot lift on the swing leg and stable grounding on the stance foot without foot-sliding or canvas clipping?
2. **Joint & Seam Integrity:** Are the knees and ankles free of horizontal notch tearing, and are the shoulder armscye junctions clean without rectangular cutout gaps?
3. **Gesture Readability & Anatomical Intent:**
   - *Pointing:* Right arm clearly extends toward target with an unambiguous pointing hand.
   - *Waving:* Hand raised beside head with active, visible 2.5 Hz wrist wave oscillation.
   - *Open Palms:* Welcoming, explanatory posture with open palms and supinated forearms.
   - *Thinking:* Clean hand-to-chin gesture with contemplative tilt.
   - *Hands on Hips:* Both hands rest against the waistband/hips with outward flared elbows and continuous sleeve joints.
   - *Arms Crossed:* Clear crossed-arm pose folded horizontally across the tactical chest harness.
4. **Clean Viewport:** Is the clean demonstration video completely free of any text overlays, timecodes, or HUD cards?

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
