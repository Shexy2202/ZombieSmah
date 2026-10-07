import { PAL } from './palette';
import { Ctx, circle, rng, roundRect } from './util';

// Soft, painterly placeholder scenery. Light comes from the moon (upper left).

/** Fine noise so large gradients never band. */
function dither(ctx: Ctx, w: number, h: number, seed: number, amount = 0.035): void {
  const r = rng(seed);
  const n = Math.floor((w * h) / 30);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${amount * r()})` : `rgba(0,0,20,${amount * r()})`;
    ctx.fillRect(r() * w, r() * h, 1, 1);
  }
}

export function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#050f22');
  g.addColorStop(0.3, '#0c2449');
  g.addColorStop(0.58, '#174a80');
  g.addColorStop(0.75, '#2c6aa3');
  g.addColorStop(1, '#3b7cb3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Large soft light bloom around where the moon sits.
  const m = ctx.createRadialGradient(w * 0.34, h * 0.2, 10, w * 0.34, h * 0.2, w * 0.55);
  m.addColorStop(0, 'rgba(120,170,230,0.28)');
  m.addColorStop(1, 'rgba(120,170,230,0)');
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, w, h);
  dither(ctx, w, h, 101);
}

export function drawStars(bright: boolean) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(bright ? 7 : 8);
    const n = bright ? 28 : 110;
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h * 0.62;
      if (bright) {
        const s = 1 + r() * 1.2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
        g.addColorStop(0, 'rgba(255,255,240,0.95)');
        g.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
        ctx.fillStyle = 'rgba(255,255,245,0.5)';
        ctx.fillRect(x - s * 2.5, y - 0.25, s * 5, 0.5);
        ctx.fillRect(x - 0.25, y - s * 2.5, 0.5, s * 5);
      } else {
        ctx.fillStyle = `rgba(230,240,255,${0.25 + r() * 0.5})`;
        circle(ctx, x, y, 0.4 + r() * 0.5);
        ctx.fill();
      }
    }
  };
}

export function drawMoon(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2, cy = h / 2, R = 23;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, w / 2);
  glow.addColorStop(0, 'rgba(200,230,255,0.55)');
  glow.addColorStop(0.25, 'rgba(160,205,255,0.2)');
  glow.addColorStop(1, 'rgba(160,205,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 2, cx, cy, R);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.7, '#f1f4ea');
  body.addColorStop(1, '#d6ddd4');
  ctx.fillStyle = body;
  circle(ctx, cx, cy, R);
  ctx.fill();
  ctx.fillStyle = 'rgba(170,180,170,0.22)';
  for (const [dx, dy, r] of [[-7, -4, 5], [6, 6, 4], [8, -8, 2.5], [-3, 9, 2.5]] as const) {
    circle(ctx, cx + dx, cy + dy, r);
    ctx.fill();
  }
}

export function drawCloud(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(seed);
    const puffs: [number, number, number][] = [];
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const rad = h * (0.2 + 0.24 * Math.sin(t * Math.PI)) * (0.8 + r() * 0.35);
      puffs.push([w * 0.12 + t * w * 0.76, h * 0.64 - rad * 0.45, rad]);
    }
    // Shadow side underneath.
    ctx.fillStyle = '#5f8fbd';
    for (const [x, y, rad] of puffs) { circle(ctx, x + 2, y + 5, rad); ctx.fill(); }
    ctx.fillRect(w * 0.12, h * 0.62, w * 0.76, h * 0.17);
    // Lit body with a soft vertical gradient.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d2ecff');
    g.addColorStop(0.6, '#9fcbef');
    g.addColorStop(1, '#7eb0dc');
    ctx.fillStyle = g;
    for (const [x, y, rad] of puffs) { circle(ctx, x, y, rad); ctx.fill(); }
    ctx.fillRect(w * 0.12, h * 0.56, w * 0.76, h * 0.17);
    // Moonlit tops.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [x, y, rad] of puffs) { circle(ctx, x - rad * 0.25, y - rad * 0.3, rad * 0.45); ctx.fill(); }
  };
}

function hillPath(ctx: Ctx, w: number, h: number, base: number, amp: number, freq: number, phase: number): void {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    ctx.lineTo(x, base - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7)));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
}

export function drawHills(ctx: Ctx, w: number, h: number): void {
  const r = rng(11);
  const layer = (base: number, amp: number, freq: number, phase: number, top: string, bottom: string, rim: string, rows: boolean) => {
    hillPath(ctx, w, h, base, amp, freq, phase);
    const g = ctx.createLinearGradient(0, base - amp, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Field rows that follow the contour.
    if (rows) {
      ctx.strokeStyle = 'rgba(160,200,235,0.13)';
      ctx.lineWidth = 2;
      for (let k = 1; k < 14; k++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const y = base + k * 7 - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7)) * (1 - k * 0.05);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // Dark bush clumps.
    for (let i = 0; i < 22; i++) {
      const x = r() * w, y = base + r() * (h - base) * 0.6;
      ctx.fillStyle = 'rgba(10,30,60,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + r() * 18, 4 + r() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Moonlit crest.
    hillPath(ctx, w, h, base, amp, freq, phase);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  layer(h * 0.3, h * 0.17, 0.006, 1.2, '#2a5486', '#1d3d66', 'rgba(150,195,240,0.45)', false);
  layer(h * 0.6, h * 0.13, 0.0045, 0.3, '#3d6c9e', '#264d7a', 'rgba(185,220,250,0.55)', true);
  dither(ctx, w, h, 33, 0.04);
}

/** Vertical haze band: placed at the foot of a parallax layer for aerial perspective. */
export function drawHaze(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(110,160,210,0)');
  g.addColorStop(0.65, 'rgba(110,160,210,0.32)');
  g.addColorStop(1, 'rgba(110,160,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Wispy ground-fog strip. */
export function drawFog(ctx: Ctx, w: number, h: number): void {
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const rx = 40 + r() * 90, ry = Math.min(h * 0.3, 6 + r() * 10);
    const x = rx + r() * (w - rx * 2), y = h / 2 + (r() - 0.5) * (h - ry * 2 - 4);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(200,225,250,0.22)');
    g.addColorStop(1, 'rgba(200,225,250,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    circle(ctx, x, y, rx);
    ctx.fill();
    ctx.restore();
  }
  // Feather the left/right edges so overlapping tiles blend seamlessly.
  ctx.globalCompositeOperation = 'destination-in';
  const e = ctx.createLinearGradient(0, 0, w, 0);
  e.addColorStop(0, 'rgba(0,0,0,0)');
  e.addColorStop(0.2, 'rgba(0,0,0,1)');
  e.addColorStop(0.8, 'rgba(0,0,0,1)');
  e.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

export function drawTree(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(seed);
    // Trunk and a couple of limbs.
    ctx.strokeStyle = '#0b1a30';
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.07;
    ctx.beginPath();
    ctx.moveTo(w / 2, h);
    ctx.quadraticCurveTo(w * 0.47, h * 0.7, w * 0.5, h * 0.45);
    ctx.moveTo(w * 0.49, h * 0.65);
    ctx.quadraticCurveTo(w * 0.35, h * 0.55, w * 0.3, h * 0.42);
    ctx.moveTo(w * 0.5, h * 0.6);
    ctx.quadraticCurveTo(w * 0.62, h * 0.5, w * 0.7, h * 0.4);
    ctx.stroke();
    const blobs: [number, number, number][] = [];
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2, d = r() * 0.3;
      blobs.push([w * (0.5 + Math.cos(a) * d * 0.9), h * (0.33 + Math.sin(a) * d * 0.55), w * (0.11 + r() * 0.1)]);
    }
    blobs.sort((a, b) => a[1] - b[1]);
    for (const [x, y, rad] of blobs) {
      const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, rad * 0.1, x, y, rad);
      g.addColorStop(0, '#24456e');
      g.addColorStop(0.5, '#132b4b');
      g.addColorStop(1, '#0a1a31');
      ctx.fillStyle = g;
      circle(ctx, x, y, rad);
      ctx.fill();
    }
    // Leaf texture flecks on the lit side.
    for (let i = 0; i < 70; i++) {
      const [x, y, rad] = blobs[Math.floor(r() * blobs.length)];
      const a = Math.PI * (1.0 + r() * 0.6);
      ctx.fillStyle = 'rgba(80,130,190,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * rad * 0.75, y + Math.sin(a) * rad * 0.75, 2.2, 1.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

export function drawFence(ctx: Ctx, w: number, h: number): void {
  const rail = (y: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + 5);
    g.addColorStop(0, '#c4d4e4');
    g.addColorStop(1, '#6f8499');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 5);
    ctx.fillStyle = 'rgba(10,20,40,0.45)';
    ctx.fillRect(0, y + 5, w, 2);
  };
  for (let x = 8; x < w; x += 60) {
    const g = ctx.createLinearGradient(x, 0, x + 6, 0);
    g.addColorStop(0, '#c8d7e6');
    g.addColorStop(1, '#5c7187');
    ctx.fillStyle = g;
    roundRect(ctx, x, 0, 6, h, 1.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,20,40,0.5)';
    ctx.fillRect(x + 6, 3, 1.5, h - 3);
  }
  rail(h * 0.22);
  rail(h * 0.58);
}

/** Pale moonlit walk strip with soft diagonal shadows. */
export function drawRoad(ctx: Ctx, w: number, h: number): void {
  const r = rng(5);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9ab8d2');
  g.addColorStop(0.25, '#c9dceb');
  g.addColorStop(0.8, '#d6e5f0');
  g.addColorStop(1, '#b2cade');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Shadows cast by fence posts / trees, soft-edged.
  for (let x = -60; x < w; x += 150 + r() * 60) {
    const sw = 40 + r() * 50;
    const sg = ctx.createLinearGradient(x, 0, x + sw, 0);
    sg.addColorStop(0, 'rgba(70,105,150,0)');
    sg.addColorStop(0.5, 'rgba(70,105,150,0.32)');
    sg.addColorStop(1, 'rgba(70,105,150,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(x + 30, 0);
    ctx.lineTo(x + 30 + sw, 0);
    ctx.lineTo(x + sw, h);
    ctx.lineTo(x, h);
    ctx.closePath();
    ctx.fill();
  }
  // Grit and footprints.
  for (let i = 0; i < w / 6; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(80,110,145,0.18)' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(r() * w, 4 + r() * (h - 6), 1 + r() * 2, 1);
  }
  ctx.fillStyle = 'rgba(30,50,80,0.5)';
  ctx.fillRect(0, h - 2, w, 2);
  dither(ctx, w, h, 9, 0.05);
}

export function drawSoil(ctx: Ctx, w: number, h: number): void {
  const r = rng(23);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3b332d');
  g.addColorStop(0.12, '#2b2521');
  g.addColorStop(1, '#141110');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Lumpy lip.
  ctx.fillStyle = '#4a4038';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= w; x += 14) ctx.lineTo(x, 3 + Math.sin(x * 0.05) * 1.5 + r() * 3);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  // Stones with a top highlight.
  for (let i = 0; i < w / 9; i++) {
    const x = r() * w, y = 10 + r() * (h - 12), rx = 2 + r() * 8, ry = 1.5 + r() * 3.5;
    ctx.fillStyle = r() < 0.5 ? '#1c1816' : '#25201d';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,150,140,0.12)';
    ctx.beginPath(); ctx.ellipse(x - rx * 0.2, y - ry * 0.4, rx * 0.6, ry * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Roots.
  ctx.strokeStyle = 'rgba(70,55,40,0.6)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < w / 120; i++) {
    const x = r() * w;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.bezierCurveTo(x + 10, 20, x - 12, 30, x + 6, 40 + r() * 30);
    ctx.stroke();
  }
  for (let i = 0; i < w / 160; i++) {
    const x = 40 + r() * (w - 80);
    const y = 28 + r() * (h - 44);
    if (r() < 0.45) drawSkull(ctx, x, y, 7 + r() * 4, r() * 0.8 - 0.4);
    else drawBone(ctx, x, y, 16 + r() * 10, r() * Math.PI);
  }
}

function drawSkull(ctx: Ctx, x: number, y: number, s: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.4, 1, 0, 0, s * 1.2);
  g.addColorStop(0, '#e8e1cd');
  g.addColorStop(1, '#8e8673');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, s); ctx.fill();
  roundRect(ctx, -s * 0.55, s * 0.4, s * 1.1, s * 0.65, s * 0.2); ctx.fill();
  ctx.fillStyle = '#16120f';
  ctx.beginPath(); ctx.ellipse(-s * 0.38, s * 0.05, s * 0.26, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.38, s * 0.05, s * 0.26, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.5); ctx.lineTo(s * 0.1, s * 0.5); ctx.fill();
  ctx.fillRect(-s * 0.35, s * 0.75, s * 0.7, 0.8);
  // Half buried: soil over the lower part.
  ctx.restore();
  ctx.fillStyle = 'rgba(30,25,22,0.85)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 1.05, s * 1.5, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}

function drawBone(ctx: Ctx, x: number, y: number, len: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = '#b9b19c';
  roundRect(ctx, -len / 2, -1.6, len, 3.2, 1.5); ctx.fill();
  for (const ex of [-len / 2, len / 2]) {
    circle(ctx, ex, -2, 2.5); ctx.fill();
    circle(ctx, ex, 2, 2.5); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,240,0.4)';
  ctx.fillRect(-len / 2, -1.5, len, 1);
  ctx.restore();
}

/** Farmhouse, side-on. Ground contact is at the bottom edge of the texture. */
export function drawHouse(ctx: Ctx, w: number, h: number): void {
  const wallTop = h * 0.47;
  const wallL = w * 0.12, wallR = w * 0.88;
  const r = rng(5);

  // Chimney (behind roof).
  const cx0 = w * 0.56, cw = w * 0.1;
  const cg = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
  cg.addColorStop(0, '#b35a44');
  cg.addColorStop(1, '#6e2f24');
  ctx.fillStyle = cg;
  ctx.fillRect(cx0, h * 0.06, cw, h * 0.3);
  ctx.strokeStyle = 'rgba(40,15,10,0.45)';
  ctx.lineWidth = 0.8;
  for (let y = h * 0.08, row = 0; y < h * 0.36; y += 5, row++) {
    ctx.beginPath(); ctx.moveTo(cx0, y); ctx.lineTo(cx0 + cw, y); ctx.stroke();
    for (let x = cx0 + (row % 2) * 5; x < cx0 + cw; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5); ctx.stroke();
    }
  }
  ctx.fillStyle = '#5c261d';
  roundRect(ctx, cx0 - 3, h * 0.035, cw + 6, h * 0.035, 1.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,170,0.25)';
  ctx.fillRect(cx0 - 3, h * 0.035, cw + 6, 1.5);

  // Walls: vertical boards with gradient light.
  const wg = ctx.createLinearGradient(wallL, 0, wallR, 0);
  wg.addColorStop(0, '#81566a');
  wg.addColorStop(1, '#4a2f3c');
  ctx.fillStyle = wg;
  ctx.fillRect(wallL, wallTop, wallR - wallL, h - wallTop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wallL, wallTop, wallR - wallL, h - wallTop);
  ctx.clip();
  for (let x = wallL; x < wallR; x += 9) {
    ctx.fillStyle = 'rgba(255,220,235,0.08)';
    ctx.fillRect(x + 1, wallTop, 1.5, h - wallTop);
    ctx.fillStyle = 'rgba(20,5,15,0.4)';
    ctx.fillRect(x + 8, wallTop, 1, h - wallTop);
  }
  // Ambient occlusion under the eaves and at the ground.
  const ao = ctx.createLinearGradient(0, wallTop, 0, wallTop + 26);
  ao.addColorStop(0, 'rgba(10,5,20,0.7)');
  ao.addColorStop(1, 'rgba(10,5,20,0)');
  ctx.fillStyle = ao;
  ctx.fillRect(wallL, wallTop, wallR - wallL, 26);
  const ao2 = ctx.createLinearGradient(0, h - 14, 0, h);
  ao2.addColorStop(0, 'rgba(10,5,20,0)');
  ao2.addColorStop(1, 'rgba(10,5,20,0.55)');
  ctx.fillStyle = ao2;
  ctx.fillRect(wallL, h - 14, wallR - wallL, 14);
  ctx.restore();

  // Warm lit windows.
  for (const fx of [0.3, 0.7]) {
    const wx = w * fx - 12, wy = wallTop + 9;
    const glow = ctx.createRadialGradient(wx + 12, wy + 11, 4, wx + 12, wy + 11, 30);
    glow.addColorStop(0, 'rgba(255,200,110,0.35)');
    glow.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(wx - 20, wy - 20, 64, 62);
    ctx.fillStyle = '#2a1820';
    roundRect(ctx, wx - 2, wy - 2, 28, 26, 2); ctx.fill();
    const lg = ctx.createRadialGradient(wx + 10, wy + 8, 2, wx + 12, wy + 11, 18);
    lg.addColorStop(0, '#fff6c8');
    lg.addColorStop(0.6, '#ffd77a');
    lg.addColorStop(1, '#e09a3c');
    ctx.fillStyle = lg;
    ctx.fillRect(wx, wy, 24, 22);
    ctx.fillStyle = '#3a2228';
    ctx.fillRect(wx + 11, wy, 2, 22);
    ctx.fillRect(wx, wy + 10, 24, 2);
    ctx.fillStyle = 'rgba(80,40,30,0.35)';
    ctx.fillRect(wx, wy, 5, 22); // curtain
    ctx.fillStyle = '#5a3a40';
    ctx.fillRect(wx - 3, wy + 22, 30, 3); // sill
  }

  // X-crossed plank barricades.
  const bTop = wallTop + 40;
  const panels = 3;
  const pw = (wallR - wallL) / panels;
  for (let i = 0; i < panels; i++) {
    const x0 = wallL + i * pw + 3, x1 = wallL + (i + 1) * pw - 3;
    const dg = ctx.createLinearGradient(0, bTop, 0, h);
    dg.addColorStop(0, '#1d1016');
    dg.addColorStop(1, '#2d1b22');
    ctx.fillStyle = dg;
    ctx.fillRect(x0, bTop, x1 - x0, h - bTop - 2);
    plank(ctx, x0, bTop + 2, x1, h - 4, r);
    plank(ctx, x1, bTop + 2, x0, h - 4, r);
    plank(ctx, x0 - 2, bTop, x1 + 2, bTop, r, 7);
  }

  // Roof: shingles with row shading and moonlit edge.
  const eave = h * 0.5;
  const roofPath = () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, eave);
    ctx.lineTo(w * 0.22, h * 0.16);
    ctx.lineTo(w * 0.78, h * 0.16);
    ctx.lineTo(w * 0.98, eave);
    ctx.closePath();
  };
  roofPath();
  ctx.fillStyle = PAL.roofDark;
  ctx.fill();
  ctx.save();
  roofPath();
  ctx.clip();
  for (let y = h * 0.16, row = 0; y < eave; y += 8, row++) {
    const off = (row % 2) * 7;
    for (let x = -10 + off; x < w; x += 14) {
      const v = r();
      const base = v < 0.25 ? '#3e5786' : v < 0.6 ? '#2d4470' : '#253a62';
      const sg = ctx.createLinearGradient(0, y, 0, y + 9);
      sg.addColorStop(0, base);
      sg.addColorStop(1, '#162441');
      ctx.fillStyle = sg;
      roundRect(ctx, x + 0.5, y, 13, 9.5, 2.5);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(5,10,25,0.35)';
    ctx.fillRect(0, y, w, 1.5);
  }
  const rl = ctx.createLinearGradient(0, 0, w, 0);
  rl.addColorStop(0, 'rgba(170,205,255,0.18)');
  rl.addColorStop(0.5, 'rgba(170,205,255,0)');
  rl.addColorStop(1, 'rgba(0,0,20,0.25)');
  ctx.fillStyle = rl;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Ridge and fascia.
  ctx.strokeStyle = '#6f8cc0';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.16); ctx.lineTo(w * 0.78, h * 0.16); ctx.stroke();
  ctx.strokeStyle = '#0d1528';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(w * 0.02, eave); ctx.lineTo(w * 0.98, eave); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,185,235,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(w * 0.02, eave); ctx.lineTo(w * 0.22, h * 0.16); ctx.stroke();
}

function plank(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, r: () => number, thick = 8): void {
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(10,5,10,0.5)';
  roundRect(ctx, 1, -thick / 2 + 2, len, thick, 1.5);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
  g.addColorStop(0, '#c09466');
  g.addColorStop(0.5, '#9a7148');
  g.addColorStop(1, '#6e4e31');
  ctx.fillStyle = g;
  roundRect(ctx, 0, -thick / 2, len, thick, 1.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,45,25,0.5)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const yy = -thick / 2 + 2 + i * (thick - 4) / 2 + r();
    ctx.beginPath();
    ctx.moveTo(2, yy);
    ctx.bezierCurveTo(len * 0.3, yy + r() - 0.5, len * 0.6, yy + r() - 0.5, len - 2, yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#d8dde4';
  circle(ctx, 4, 0, 1.3); ctx.fill();
  circle(ctx, len - 4, 0, 1.3); ctx.fill();
  ctx.restore();
}

export function drawWindmillTower(ctx: Ctx, w: number, h: number): void {
  ctx.strokeStyle = '#13233b';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  const top = 14;
  ctx.beginPath();
  ctx.moveTo(w * 0.43, top); ctx.lineTo(w * 0.15, h);
  ctx.moveTo(w * 0.57, top); ctx.lineTo(w * 0.85, h);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 6; i++) {
    const t = i / 6, t2 = (i + 1) / 6;
    const y = top + (h - top) * t, y2 = top + (h - top) * t2;
    const lx = w * 0.43 - w * 0.28 * t, rx = w * 0.57 + w * 0.28 * t;
    const lx2 = w * 0.43 - w * 0.28 * t2, rx2 = w * 0.57 + w * 0.28 * t2;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx2, y2); ctx.moveTo(rx, y); ctx.lineTo(lx2, y2); ctx.stroke();
  }
  // Moonlit left leg.
  ctx.strokeStyle = 'rgba(140,180,225,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w * 0.43 - 1, top); ctx.lineTo(w * 0.15 - 1, h); ctx.stroke();
  ctx.fillStyle = '#13233b';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, top - 2); ctx.lineTo(w * 0.98, top - 8); ctx.lineTo(w * 0.98, top + 7); ctx.closePath();
  ctx.fill();
}

export function drawWindmillBlades(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 12) * Math.PI * 2);
    ctx.fillStyle = '#13233b';
    ctx.beginPath();
    ctx.moveTo(4, -1.5); ctx.lineTo(w * 0.48, -6); ctx.lineTo(w * 0.48, 5); ctx.lineTo(4, 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(140,180,225,0.3)';
    ctx.fillRect(w * 0.2, -5, w * 0.28, 1.2);
    ctx.restore();
  }
  ctx.strokeStyle = '#13233b';
  ctx.lineWidth = 1.5;
  circle(ctx, cx, cy, w * 0.3); ctx.stroke();
  ctx.fillStyle = '#1d3150';
  circle(ctx, cx, cy, 5); ctx.fill();
}

export function drawSmokePuff(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(95,100,115,0.85)');
  g.addColorStop(0.5, 'rgba(80,85,100,0.45)');
  g.addColorStop(1, 'rgba(70,75,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Soft warm radial light (additive). */
export function drawGlow(rgb: string) {
  return (ctx: Ctx, w: number, h: number): void => {
    ctx.save();
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, `rgba(${rgb},0.9)`);
    g.addColorStop(0.4, `rgba(${rgb},0.35)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
  };
}
