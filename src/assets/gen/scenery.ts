import { PAL } from './palette';
import { Ctx, circle, fillStroke, rng, roundRect } from './util';

export function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, PAL.skyTop);
  g.addColorStop(0.45, PAL.skyMid);
  g.addColorStop(0.78, PAL.skyHorizon);
  g.addColorStop(1, PAL.skyHorizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawStars(ctx: Ctx, w: number, h: number): void {
  const r = rng(7);
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const y = r() * h * 0.7;
    const s = r() < 0.12 ? 1.4 : 0.7;
    ctx.fillStyle = `rgba(255,255,240,${0.35 + r() * 0.6})`;
    circle(ctx, x, y, s);
    ctx.fill();
  }
}

export function drawMoon(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2, cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
  glow.addColorStop(0, PAL.moonGlow + '0.55)');
  glow.addColorStop(0.35, PAL.moonGlow + '0.18)');
  glow.addColorStop(1, PAL.moonGlow + '0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const body = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 22);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(1, '#dfe6e0');
  ctx.fillStyle = body;
  circle(ctx, cx, cy, 21);
  ctx.fill();
}

export function drawCloud(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(seed);
    const puffs: [number, number, number][] = [];
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const rad = h * (0.22 + 0.2 * Math.sin(t * Math.PI)) * (0.8 + r() * 0.4);
      puffs.push([w * 0.12 + t * w * 0.76, h * 0.62 - rad * 0.4, rad]);
    }
    ctx.fillStyle = PAL.cloudShade;
    for (const [x, y, rad] of puffs) { circle(ctx, x, y + 4, rad); ctx.fill(); }
    ctx.fillStyle = PAL.cloud;
    for (const [x, y, rad] of puffs) { circle(ctx, x, y, rad); ctx.fill(); }
    ctx.fillRect(w * 0.12, h * 0.55, w * 0.76, h * 0.2);
  };
}

/** Two layers of rolling hills with a pale field speckle. */
export function drawHills(ctx: Ctx, w: number, h: number): void {
  const r = rng(11);
  const layer = (base: number, amp: number, freq: number, phase: number, fill: string, light: string) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = base - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  layer(h * 0.35, h * 0.18, 0.006, 1.2, PAL.hillFar, PAL.hillNear);
  layer(h * 0.62, h * 0.14, 0.0045, 0.3, PAL.hillNear, PAL.hillLight);
  // Field speckles / bush blobs on the near slope.
  for (let i = 0; i < 160; i++) {
    const x = r() * w;
    const y = h * 0.66 + r() * h * 0.32;
    ctx.fillStyle = r() < 0.5 ? PAL.field : PAL.hillLight;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, 1 + r() * 2, 4 + r() * 6);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = h * 0.5 + r() * h * 0.2;
    ctx.fillStyle = PAL.hillFar;
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + r() * 16, 5 + r() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTree(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(seed);
    ctx.fillStyle = PAL.tree;
    ctx.fillRect(w / 2 - 5, h * 0.55, 10, h * 0.45);
    const blobs: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) {
      blobs.push([w * 0.18 + r() * w * 0.64, h * 0.12 + r() * h * 0.5, w * (0.12 + r() * 0.12)]);
    }
    for (const [x, y, rad] of blobs) {
      ctx.fillStyle = PAL.tree;
      circle(ctx, x, y, rad);
      ctx.fill();
    }
    // Moonlit leaf edges, upper-left.
    for (const [x, y, rad] of blobs) {
      ctx.fillStyle = PAL.treeLight;
      circle(ctx, x - rad * 0.3, y - rad * 0.35, rad * 0.45);
      ctx.fill();
    }
    for (const [x, y, rad] of blobs.slice(0, 6)) {
      ctx.fillStyle = PAL.tree;
      circle(ctx, x + rad * 0.15, y + rad * 0.1, rad * 0.75);
      ctx.fill();
    }
  };
}

export function drawFence(ctx: Ctx, w: number, h: number): void {
  // Two rails, posts every 60px.
  ctx.fillStyle = PAL.fenceDark;
  ctx.fillRect(0, h * 0.28, w, 6);
  ctx.fillRect(0, h * 0.62, w, 6);
  ctx.fillStyle = PAL.fence;
  ctx.fillRect(0, h * 0.25, w, 5);
  ctx.fillRect(0, h * 0.59, w, 5);
  for (let x = 6; x < w; x += 60) {
    ctx.fillStyle = PAL.fenceDark;
    ctx.fillRect(x, 0, 7, h);
    ctx.fillStyle = PAL.fence;
    ctx.fillRect(x, 0, 5, h);
  }
}

/** Pale moonlit walk strip with diagonal shadow stripes. */
export function drawRoad(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = PAL.road;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAL.roadShade;
  for (let x = -40; x < w; x += 170) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 20, h);
    ctx.lineTo(x - 40, h);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, 10);
  g.addColorStop(0, 'rgba(40,60,90,0.5)');
  g.addColorStop(1, 'rgba(40,60,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 10);
}

export function drawSoil(ctx: Ctx, w: number, h: number): void {
  const r = rng(23);
  ctx.fillStyle = PAL.soil;
  ctx.fillRect(0, 0, w, h);
  // Lumpy top edge.
  ctx.fillStyle = '#3a342f';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, 4 + Math.sin(x * 0.05) * 2 + r() * 3);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = r() < 0.5 ? PAL.soilDark : '#332d29';
    ctx.beginPath();
    ctx.ellipse(r() * w, 10 + r() * (h - 10), 3 + r() * 10, 2 + r() * 4, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Half-buried skulls and bones.
  for (let i = 0; i < 14; i++) {
    const x = 60 + r() * (w - 120);
    const y = 30 + r() * (h - 45);
    if (r() < 0.45) drawSkull(ctx, x, y, 7 + r() * 4);
    else drawBone(ctx, x, y, 14 + r() * 10, r() * Math.PI);
  }
}

function drawSkull(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = PAL.bone;
  ctx.globalAlpha = 0.75;
  circle(ctx, x, y, s);
  ctx.fill();
  ctx.fillRect(x - s * 0.55, y + s * 0.5, s * 1.1, s * 0.6);
  ctx.fillStyle = PAL.soilDark;
  circle(ctx, x - s * 0.38, y, s * 0.28); ctx.fill();
  circle(ctx, x + s * 0.38, y, s * 0.28); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBone(ctx: Ctx, x: number, y: number, len: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = PAL.bone;
  ctx.fillRect(-len / 2, -1.5, len, 3);
  for (const ex of [-len / 2, len / 2]) {
    circle(ctx, ex, -2, 2.4); ctx.fill();
    circle(ctx, ex, 2, 2.4); ctx.fill();
  }
  ctx.restore();
}

/** Farmhouse, side-on. Ground contact is at the bottom edge of the texture. */
export function drawHouse(ctx: Ctx, w: number, h: number): void {
  const wallTop = h * 0.47;
  const wallL = w * 0.12, wallR = w * 0.88;
  // Chimney (behind roof).
  ctx.fillStyle = PAL.brick;
  roundRect(ctx, w * 0.56, h * 0.05, w * 0.1, h * 0.3, 2);
  fillStroke(ctx, PAL.brick);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let y = h * 0.08; y < h * 0.35; y += 6) {
    ctx.beginPath();
    ctx.moveTo(w * 0.56, y); ctx.lineTo(w * 0.66, y); ctx.stroke();
  }
  roundRect(ctx, w * 0.545, h * 0.035, w * 0.13, h * 0.04, 1);
  fillStroke(ctx, '#7c3a2e');
  // Walls.
  ctx.beginPath();
  ctx.rect(wallL, wallTop, wallR - wallL, h - wallTop);
  fillStroke(ctx, PAL.wall, PAL.outline, 2);
  ctx.strokeStyle = PAL.wallDark;
  ctx.lineWidth = 1.5;
  for (let x = wallL + 9; x < wallR; x += 9) {
    ctx.beginPath(); ctx.moveTo(x, wallTop); ctx.lineTo(x, h); ctx.stroke();
  }
  // Lit attic windows under the eaves.
  for (const fx of [0.3, 0.7]) {
    const wx = w * fx - 12, wy = wallTop + 8;
    ctx.fillStyle = 'rgba(255,220,130,0.25)';
    ctx.fillRect(wx - 5, wy - 5, 34, 32);
    roundRect(ctx, wx, wy, 24, 22, 1);
    fillStroke(ctx, PAL.windowLit, PAL.outline, 2);
    ctx.strokeStyle = PAL.outline;
    ctx.beginPath();
    ctx.moveTo(wx + 12, wy); ctx.lineTo(wx + 12, wy + 22);
    ctx.moveTo(wx, wy + 11); ctx.lineTo(wx + 24, wy + 11);
    ctx.stroke();
  }
  // X-crossed plank barricades over the lower walls.
  const bTop = wallTop + 40;
  const panels = 3;
  const pw = (wallR - wallL) / panels;
  for (let i = 0; i < panels; i++) {
    const x0 = wallL + i * pw + 3, x1 = wallL + (i + 1) * pw - 3;
    ctx.fillStyle = 'rgba(30,18,22,0.55)';
    ctx.fillRect(x0, bTop, x1 - x0, h - bTop - 2);
    plank(ctx, x0, bTop, x1, h - 3);
    plank(ctx, x1, bTop, x0, h - 3);
    ctx.fillStyle = PAL.plank;
    ctx.fillRect(x0, bTop - 2, x1 - x0, 6);
    ctx.strokeStyle = PAL.outline; ctx.lineWidth = 1;
    ctx.strokeRect(x0, bTop - 2, x1 - x0, 6);
  }
  // Roof: dark shingles.
  const eave = h * 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.02, eave);
  ctx.lineTo(w * 0.22, h * 0.16);
  ctx.lineTo(w * 0.78, h * 0.16);
  ctx.lineTo(w * 0.98, eave);
  ctx.closePath();
  fillStroke(ctx, PAL.roof, PAL.outline, 2);
  ctx.save();
  ctx.clip();
  const r = rng(5);
  for (let y = h * 0.16; y < eave; y += 9) {
    const off = ((y / 9) % 2) * 7;
    for (let x = -10 + off; x < w; x += 14) {
      ctx.fillStyle = r() < 0.3 ? PAL.roofLight : r() < 0.5 ? PAL.roofDark : PAL.roof;
      roundRect(ctx, x, y, 13, 9, 2);
      ctx.fill();
      ctx.strokeStyle = PAL.roofDark;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = PAL.roofLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.16); ctx.lineTo(w * 0.78, h * 0.16); ctx.stroke();
}

function plank(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.save();
  ctx.translate(x0, y0);
  const a = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.rotate(a);
  roundRect(ctx, 0, -4, len, 8, 1);
  fillStroke(ctx, PAL.plankLight, PAL.outline, 1);
  ctx.fillStyle = '#c8c8c8';
  circle(ctx, 5, 0, 1.4); ctx.fill();
  circle(ctx, len - 5, 0, 1.4); ctx.fill();
  ctx.restore();
}

export function drawWindmillTower(ctx: Ctx, w: number, h: number): void {
  ctx.strokeStyle = '#1a2a42';
  ctx.lineWidth = 3;
  const top = 14;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, top); ctx.lineTo(w * 0.15, h);
  ctx.moveTo(w * 0.58, top); ctx.lineTo(w * 0.85, h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const y = top + (h - top) * t;
    const lx = w * 0.42 - (w * 0.27) * t, rx = w * 0.58 + (w * 0.27) * t;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
    const t2 = (i + 1) / 6, y2 = top + (h - top) * t2;
    const lx2 = w * 0.42 - (w * 0.27) * t2, rx2 = w * 0.58 + (w * 0.27) * t2;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx2, y2); ctx.moveTo(rx, y); ctx.lineTo(lx2, y2); ctx.stroke();
  }
  // Tail vane.
  ctx.fillStyle = '#1a2a42';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, top); ctx.lineTo(w * 0.95, top - 6); ctx.lineTo(w * 0.95, top + 6); ctx.closePath();
  ctx.fill();
}

export function drawWindmillBlades(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#1a2a42';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(2, -2); ctx.lineTo(w * 0.48, -6); ctx.lineTo(w * 0.48, 4); ctx.lineTo(2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  circle(ctx, cx, cy, 4); ctx.fill();
}

export function drawSmokePuff(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(70,70,80,0.9)');
  g.addColorStop(1, 'rgba(70,70,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
