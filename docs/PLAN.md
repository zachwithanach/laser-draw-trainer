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
| 2026-10-15 | Cartridge is always-on. Default mode detects the shot from the striker click on the microphone and reads the dot position from the camera at that instant. Pulse mode stays available. |

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

## Phase 2: accuracy

- [ ] qa: measure audio-to-video timing skew on iPhone Safari and correct the dot lookup window.
- [ ] qa: measure beep-to-click latency with a known reference and set a per-device default offset.
- [ ] detection: handle `exposureMode` and `frameRate` constraints on Android Chrome.
- [ ] calibration: ArUco markers on a printable target for automatic calibration.
- [ ] calibration: printable target PDF with corner markers and zone rings.
- [ ] drills: par-time ladder (auto-tighten par after three consecutive hits under par).
- [ ] qa: record real clips from a phone and add them as regression fixtures.

## Phase 3: product

- [ ] ui: session history charts (first-shot time and hit rate over time).
- [ ] ui: drill presets and named sessions.
- [ ] drills: multi-shot strings for resetting trainers.
- [ ] infra: persistent history sync.
- [ ] infra: web app manifest and service worker for offline use and a full-screen home-screen launch.

## Known limits

- Browser camera APIs cap most phones at 30 fps with automatic exposure. A pulse shorter than one frame can be missed.
- A red laser on red ink has low contrast. Use black-and-white targets.
- Two simultaneous bright spots resolve to the larger one.
- Loud clicks from other sources (racking, holster snaps) count as shots when the dot is in view during a rep.
