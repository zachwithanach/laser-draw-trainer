# Plan

Live app: https://zachwithanach.github.io/laser-draw-trainer/

## Decisions

| Date | Decision |
|---|---|
| 2026-10-13 | Phone web app first. |
| 2026-10-13 | Draw to first shot is the primary drill. A striker-fired pistol needs a slide reset after each press, so multi-shot splits need a resetting trainer. |
| 2026-10-13 | Laser hardware not yet purchased. The detector supports red, green, or either. Recommended: rimless 9mm cartridge. |
| 2026-10-13 | Tap-to-calibrate ships first. ArUco auto-calibration is a later task. |
| 2026-10-13 | History stays in localStorage until a sync target is chosen. |
| 2026-10-14 | Host on GitHub Pages; repo public. claude.ai artifact hosting dropped because its sandbox blocks the camera. |
| 2026-10-15 | Multiple targets use separate calibrated sheets. Callout order is beep, then spoken number; the timer starts at the beep. A hit on the wrong target is its own result. |
| 2026-10-15 | Par cue is visual by default. The audible par beep forces a mic gate that drops shots at par. |
| 2026-10-15 | Cartridge is always-on. Default mode detects the shot from the striker click on the microphone and reads the dot position from the camera at that instant. Pulse mode stays available. |
| 2026-11-06 | Adopt four features from the Reshoot review: stage scoring, video replay, a TV range, and body tracking. Laser-measured hits stay the only scoring source; Reshoot times by sound and pose and never sees hits. |
| 2026-11-06 | Strings use USPSA Comstock scoring with minor or major power factor. Zones stay the A, C, and D rings until the printable USPSA target ships. |
| 2026-11-06 | Trigger reset hardware: simulate strings until a resetting trigger arrives. A Standard DryFireMag works with the always-on cartridge, because the app hears the click and never needs the striker. |
| 2026-11-06 | TV range: the main phone draws the range in a laser-safe palette, mirrors it to the TV with AirPlay, and watches the TV with its rear camera. The screen test gates all further range work. |
| 2026-11-06 | Body tracking runs on a spare phone or tablet, because iPhone Safari ends one camera's feed when a page opens another. Each device times from the beep it hears; pairing is by QR code, with no server. |

## Phase 1: core (shipped)

- [x] Camera capture with `requestVideoFrameCallback`, downscaled 320 px processing.
- [x] Laser detection: colour-dominance and brightness deltas against a rolling background, connected-component blob, flood guard.
- [x] Pulse as an event: 150 ms debounce, 500 ms hold ignores a constant-on dot.
- [x] Four-corner tap calibration with homography to the unit square.
- [x] Draw-to-first-shot drill: random delay, start beep, par beep, timeout, early-shot detection, auto-repeat.
- [x] Zone scoring, hit map, session stats, 500-rep history, copy as JSON.
- [x] Synthetic-frame tests for detection and geometry.
- [x] GitHub Pages deployment.

## Phase 1.5: always-on laser (shipped)

- [x] Selective background update: candidate pixels are excluded, so a constant dot is never absorbed.
- [x] AudioWorklet click detector (high-pass 1.5 kHz, adaptive floor, 50 ms hold), ScriptProcessor fallback.
- [x] Shot = click above threshold with the dot in view; beep gating; early shots only with the dot on paper.
- [x] Learn trigger click: three dry-fires set the threshold to half the quietest click.
- [x] Trigger-press movement (dot travel over the last 120 ms) per rep, session average, and pre-shot trace on the hit map.
- [x] Mic level meter with threshold marker.
- [x] Aim check: trigger learning and free shots require a steady dot on the target for the 250 ms before the click, so racking is ignored.
- [x] Tests for always-on tracking and click detection.

## Phase 1.6: analysis (shipped)

- [x] `analyzeReps`: outlier-trimmed average, best, under par, zones, bias and spread in inches, median movement, first-third vs last-third trend.
- [x] Coaching notes and suggested par with a one-tap **Set par** button.
- [x] Analysis panel with session and all-history scopes; tested against the 2026-10-15 session.

## Phase 1.7: par cue (shipped)

- [x] Visual par cue: par bar, live red timer over par, green or red stage frame that holds the result.
- [x] Par beep off by default, with a one-time migration of saved settings. The beep's 0.2 s mic gate dropped shots at par in the 2026-10-15 second session.
- [x] Status message when the par-beep gate swallows a sound during a rep.
- [x] During a rep, sounds with the dot more than one target size off the paper are ignored.

## Phase 1.8: multiple targets and corner dragging (shipped)

- [x] Drag any corner handle to adjust calibration; the homography updates live.
- [x] Calibration saved per camera resolution and restored on camera start.
- [x] 2-4 targets on separate sheets, each calibrated with four taps and numbered in order.
- [x] Start beep, then a spoken target number (speech synthesis; short-beep fallback), with the number shown on screen and the called outline highlighted. Timer starts at the beep; the mic ignores the callout.
- [x] Random target selection, never the same target three times in a row.
- [x] Wrong-target result tracked separately from misses; misses between sheets still count.
- [x] Per-target average time and hits in the Analysis panel, with slow-transition and wrong-target notes.

## Phase 2: accuracy

- [ ] qa: measure audio-to-video timing skew on iPhone Safari and correct the dot lookup window.
- [ ] qa: measure beep-to-click latency with a known reference and set a per-device default offset.
- [ ] detection: handle `exposureMode` and `frameRate` constraints on Android Chrome.
- [ ] calibration: ArUco markers on a printable target for automatic calibration.
- [ ] drills: optional callout before the beep, for practicing target recognition separately from transitions.
- [ ] calibration: printable target PDF with corner markers and zone rings.
- [ ] drills: par-time ladder (auto-tighten par after three consecutive hits under par). The analysis panel already suggests par per set.
- [ ] qa: record real clips from a phone and add them as regression fixtures.

## Phase 3: product

- [ ] ui: session history charts (first-shot time and hit rate over time).
- [ ] ui: drill presets and named sessions.
- [x] drills: multi-shot strings for resetting trainers (see Phase 4).
- [ ] infra: persistent history sync.
- [ ] infra: web app manifest and service worker for offline use and a full-screen home-screen launch.

## Phase 4: stage, TV range, video, and body tracking

Project plan: the Word plan delivered on 2026-11-06. Each part ships as its own branch and merges to `main` only after approval.

### Stage scoring (built on branch `stage-scoring`)

- [x] drills: string drill with shots per target on every target, no callout; ends at the round count or 3 s after the last shot.
- [x] drills: Comstock scoring, minor and major power factor, 10-point misses, hit factor (`@ldt-score`).
- [x] ui: string readout, string stats and analysis (first shot, split, transition, hit factor), string par with Set par.
- [x] drills: Simulate a string, for use without a resetting trigger.
- [x] drills: fix Start drill needing two taps after a finished rep with auto-repeat off.
- [x] qa: tests for scoring, the string tracker, string analysis, and a synthetic string of trigger clicks through the click detector.
- [ ] qa: tune the click threshold and minimum split on a real resetting trigger.
- [ ] calibration: USPSA zone shapes, tied to the printable target in Phase 2.

### TV range

- [x] calibration: TV screen test: flash-based screen location, in-step check, display delay, dot detection and false dots on a moving laser-safe range picture (`@ldt-screen`).
- [ ] qa: run the screen test on the AirPlay TV and record the results. Gates every task below.
- [ ] drills: static range with paper targets scored in screen coordinates.
- [ ] drills: poppers and no-shoots.
- [ ] drills: swingers, with hit tests corrected by the measured display delay.
- [ ] ui: stage designer.

### Video replay

- [ ] ui: record each string from the camera view with times and hits burned in.
- [ ] ui: slow-motion playback and export through the share sheet.

### Body tracking

- [ ] detection: Shooter cam mode on a second device with MediaPipe Pose loaded from a CDN script tag.
- [ ] drills: draw, reload, and movement times from the beep each device hears.
- [ ] infra: QR pairing for a live link, with a one-way QR transfer as fallback.
- [ ] ui: third-person video with the pose overlay, reusing video replay.

## Known limits

- Browser camera APIs cap most phones at 30 fps with automatic exposure. A pulse shorter than one frame can be missed.
- A red laser on red ink has low contrast. Use black-and-white targets.
- Two simultaneous bright spots resolve to the larger one.
- Loud clicks from other sources (racking, holster snaps) count as shots when the dot is in view during a rep.
