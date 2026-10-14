# Plan

## Decisions

| Date | Decision |
|---|---|
| 2026-10-13 | Phone web app first. Published as a claude.ai artifact; source lives in GitHub. |
| 2026-10-13 | Draw to first shot is the primary drill. A striker-fired pistol needs a slide reset after each press, so multi-shot splits need a resetting trainer. |
| 2026-10-13 | Laser hardware not yet purchased. The detector supports red, green, or either. Recommended: rimless 9mm cartridge. |
| 2026-10-13 | Tap-to-calibrate ships first. ArUco auto-calibration is a later task. |
| 2026-10-13 | History stays in localStorage until a sync target is chosen. |

## Phase 1: core (shipped)

- [x] Camera capture with `requestVideoFrameCallback`, downscaled 320 px processing.
- [x] Laser detection: colour-dominance and brightness deltas against a rolling background, connected-component blob, flood guard.
- [x] Pulse as an event: 150 ms debounce, 500 ms hold ignores a constant-on dot.
- [x] Four-corner tap calibration with homography to the unit square.
- [x] Draw-to-first-shot drill: random delay, start beep, par beep, timeout, early-shot detection, auto-repeat.
- [x] Zone scoring, hit map, session stats, 500-rep history, copy as JSON.
- [x] Synthetic-frame tests for detection and geometry.

## Phase 2: accuracy

- [ ] qa: measure camera-to-detection latency with a known pulse and set a per-device default offset.
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
- [ ] infra: GitHub Pages deployment workflow.

## Known limits

- Browser camera APIs cap most phones at 30 fps with automatic exposure. A pulse shorter than one frame can be missed.
- A red laser on red ink has low contrast. Use black-and-white targets.
- Two simultaneous bright spots resolve to the larger one.
