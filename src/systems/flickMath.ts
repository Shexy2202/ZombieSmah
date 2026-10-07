export interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Release velocity in px per 60Hz physics step, from recent pointer samples.
 * Uses the oldest sample inside `windowMs` of the newest one; `now` is the release time.
 */
export function releaseVelocity(samples: Sample[], now: number, windowMs: number, scale: number, maxSpeed: number): { x: number; y: number } {
  if (samples.length < 2) return { x: 0, y: 0 };
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break;
    first = samples[i];
  }
  const dt = Math.max(1, last.t - first.t);
  // Finger held still before release: no throw.
  if (now - last.t > windowMs) return { x: 0, y: 0 };
  let vx = ((last.x - first.x) / dt) * (1000 / 60) * scale;
  let vy = ((last.y - first.y) / dt) * (1000 / 60) * scale;
  const sp = Math.hypot(vx, vy);
  if (sp > maxSpeed) {
    vx = (vx / sp) * maxSpeed;
    vy = (vy / sp) * maxSpeed;
  }
  return { x: vx, y: vy };
}
