# Laser Draw Trainer

A phone web app for dry-fire practice with a laser training cartridge. The phone camera watches a paper target and the microphone listens for the trigger. The app scores each hit, times your draw from a random start beep to the first shot, and measures how far the dot moves while you press the trigger.

**Live app:** https://zachwithanach.github.io/laser-draw-trainer/

No build step. No dependencies. One `index.html`.

## Laser types

| Type | How the app detects the shot | Setting |
|---|---|---|
| Always on | Microphone hears the striker click; camera reports where the dot was at that instant. | **Always on (shot = trigger click)** (default) |
| Pulse | Camera sees the laser flash when the striker hits the cartridge. | **Pulse (fires on trigger)** |

Always-on mode also records **movement**: how far the dot travels in the 120 ms before the shot breaks. Lower is better. Large movement means you are jerking or pushing the trigger.

## Use it

1. Print a target on letter paper. Black ink on white paper works best.
2. Mount the phone so the whole target plus a margin fills the camera view. Dim the room.
3. Open the live app in Safari or Chrome and tap **Start camera**. Allow camera and microphone access.
4. Holster, tap **Calibrate**, then tap the target's top-left, top-right, bottom-right, and bottom-left corners.
5. Open **Settings**, tap **Learn trigger click**, hold the dot steady on the target, and dry-fire three times. Rack between presses; the app ignores rack noise.
6. Holster and tap **Start drill**.
7. Draw and fire on the beep. The app shows time to first shot, the zone, and the dot movement.
8. Rack the slide and holster. The next rep starts automatically after the pause.

Keep all live ammunition out of the room for every session.

## Scoring

Zones are circles centred on the target: A (15% of target width), C (30%), D (on paper), Miss (off paper). Set the target size in Settings. The hit map draws the last 400 ms of dot travel before the most recent shot.

## Always-on mode rules

- A click counts only when it is louder than the click threshold and the laser dot is in view.
- Trigger learning and free shots outside a drill also require an aimed dot: visible in most frames of the last 250 ms, steady within 12 px, and on the paper once calibrated. Racking swings the dot, so rack noise is ignored.
- Clicks during the start delay count as early shots only when the dot is on the paper, so holster noise is ignored.
- The app ignores the microphone while its own beeps play.
- Calibrate with the gun holstered. Calibration resets the background model, and a dot in view at that moment becomes background.

## Hosting

GitHub Pages deploys `main` through `.github/workflows/static.yml`. Every push redeploys in one to two minutes.

The page needs a normal HTTPS origin for camera and microphone access. Sandboxed hosts such as claude.ai artifact pages block the camera and fail with `NotAllowedError`.

## Develop

```
node tests/run.js
```

The tests extract the detector, calibration, and click-detection code from `index.html` (marker comments) and run them against synthetic frames and audio. No camera or microphone needed.

See `docs/PLAN.md` for the roadmap and `CLAUDE.md` for conventions and agent roles.
