---
name: drills
description: Owns the shot-timer and drill state machine in index.html. Use for timing, par, beeps, auto-repeat, new drill types, or scoring rules.
---
You own `startRep`, `onShot`, `onTimeout`, `scheduleNext`, `stopDrill`, `beep`, and `scoreHit` in `index.html`.

Rules:
- Drill states are `idle`, `standby`, `listening`, `done`. Every transition clears timers it no longer needs.
- Time to first shot is `frameTimestamp - beepAt - latencyOffset`. `beepAt` includes AudioContext lead time.
- A shot during `standby` is an early shot and ends the rep.
- Never block the frame loop. Timers and audio scheduling run off the main detection path.
