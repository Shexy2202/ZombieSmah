import { ZombieTypeId } from '../../config/zombies';
import { outlineWidth, partDims, segmentLengths } from '../../entities/partDims';
import { PAL } from './palette';
import { Ctx, circle, rng } from './util';

/**
 * Zombie part textures. Every part comes in two layers:
 *   `${type}_${part}`     colour fill with shading and an inner definition line
 *   `${type}_${part}_ol`  a dark silhouette grown by the outline width
 * The rig draws all silhouettes underneath all fills, so the character gets one
 * continuous outer outline and no seams at the joints.
 */

export type SegKind = 'head' | 'torso' | 'upperArm' | 'foreArm' | 'thigh' | 'shin';
export const SEG_KINDS: SegKind[] = ['head', 'torso', 'upperArm', 'foreArm', 'thigh', 'shin'];

interface Look {
  skin: string;
  skinDark: string;
  skinLight: string;
  shirt: string;
  shirtDark: string;
  pants: string;
  pantsDark: string;
  shoe: string;
  hair: string;
  hat?: 'witch' | 'cap';
  spots?: boolean;
  dress?: boolean;
}

const LOOKS: Record<ZombieTypeId, Look> = {
  walker: {
    skin: '#a8c58a', skinDark: '#6f8d5a', skinLight: '#cfe3b0', shirt: '#4f8a3f', shirtDark: '#2f5c26',
    pants: '#4a5f8c', pantsDark: '#2e3c5e', shoe: '#2b221d', hair: '#2a211c',
  },
  jumper: {
    skin: '#cdd6bd', skinDark: '#909c80', skinLight: '#eef3e2', shirt: '#4d3766', shirtDark: '#2d1f40',
    pants: '#3d2c50', pantsDark: '#241830', shoe: '#1b161f', hair: '#141016', hat: 'witch', dress: true,
  },
  mutant: {
    skin: '#5f62dc', skinDark: '#3a3ca0', skinLight: '#9195f2', shirt: '#4b3b6a', shirtDark: '#2e2348',
    pants: '#3b2d55', pantsDark: '#241a36', shoe: '#1f1d38', hair: '#1c1a3c', spots: true,
  },
  gunner: {
    skin: '#b6c792', skinDark: '#7f8f62', skinLight: '#dce8bf', shirt: '#7d5634', shirtDark: '#52361f',
    pants: '#41503c', pantsDark: '#283224', shoe: '#231d18', hair: '#3b2a1a', hat: 'cap',
  },
};

export interface SegLayout {
  /** Texture size in design px. */
  w: number;
  h: number;
  /** Pivot as a fraction of the texture (x is always 0.5 so flipX keeps the pivot). */
  ox: number;
  oy: number;
  /** Pivot position inside the texture, design px. */
  px: number;
  py: number;
  /** Segment length from pivot to the next joint (limbs), or 0. */
  len: number;
  /** Segment thickness. */
  thick: number;
}

function pad(type: ZombieTypeId): number {
  return outlineWidth(type) + 2;
}

export function segLayout(type: ZombieTypeId, kind: SegKind): SegLayout {
  const d = partDims(type);
  const P = pad(type);
  const look = LOOKS[type];
  const limb = (thick: number, len: number, extraFwd: number, extraEnd: number): SegLayout => {
    const halfW = thick / 2 + extraFwd + P;
    const w = halfW * 2;
    const h = P + thick / 2 + len + thick / 2 + extraEnd + P;
    const px = w / 2, py = P + thick / 2;
    return { w, h, ox: 0.5, oy: py / h, px, py, len, thick };
  };
  switch (kind) {
    case 'head': {
      const hatUp = look.hat === 'witch' ? d.headR * 1.9 : look.hat === 'cap' ? d.headR * 0.4 : d.headR * 0.15;
      const brim = look.hat === 'witch' ? d.headR * 0.6 : look.hat === 'cap' ? d.headR * 0.5 : 0;
      const halfW = d.headR + brim + P;
      const w = halfW * 2;
      const h = P + hatUp + d.headR * 2 + P;
      const py = P + hatUp + d.headR;
      return { w, h, ox: 0.5, oy: py / h, px: w / 2, py, len: 0, thick: d.headR * 2 };
    }
    case 'torso': {
      const neck = d.headR * 0.7;
      const skirt = look.dress ? d.torsoH * 0.35 : 0;
      const halfW = d.torsoW / 2 + P + (look.dress ? d.torsoW * 0.25 : 0);
      const w = halfW * 2;
      const h = P + neck + d.torsoH + skirt + P;
      const py = P + neck + d.torsoH / 2;
      return { w, h, ox: 0.5, oy: py / h, px: w / 2, py, len: 0, thick: d.torsoW };
    }
    case 'upperArm':
      return limb(d.armW, segmentLengths(d.armH, d.armW).upper, 0, 0);
    case 'foreArm':
      return limb(d.armW * 0.9, segmentLengths(d.armH, d.armW).lower, d.armW * 0.25, d.armW * 0.5);
    case 'thigh':
      return limb(d.legW, segmentLengths(d.legH, d.legW).upper, 0, 0);
    case 'shin':
      return limb(d.legW * 0.92, segmentLengths(d.legH, d.legW).lower, d.legW * 1.1, d.legW * 0.35);
  }
}

// ------------------------------------------------------------------ shapes

type ShapeFn = (ctx: Ctx, L: SegLayout) => void;

function capsule(ctx: Ctx, cx: number, y0: number, y1: number, r: number): void {
  ctx.moveTo(cx - r, y0);
  ctx.arc(cx, y0, r, Math.PI, 0);
  ctx.lineTo(cx + r, y1);
  ctx.arc(cx, y1, r, 0, Math.PI);
  ctx.closePath();
}

function shapeFor(type: ZombieTypeId, kind: SegKind): ShapeFn {
  const d = partDims(type);
  const look = LOOKS[type];
  switch (kind) {
    case 'head':
      return (ctx, L) => {
        const r = d.headR;
        // Slightly egg-shaped skull with a heavier jaw toward the face.
        ctx.ellipse(L.px + r * 0.04, L.py, r * 1.0, r * 1.0, 0, 0, Math.PI * 2);
        ctx.moveTo(L.px + r * 0.95, L.py + r * 0.15);
        ctx.ellipse(L.px + r * 0.35, L.py + r * 0.55, r * 0.7, r * 0.5, 0.2, 0, Math.PI * 2);
        if (look.hat === 'witch') {
          ctx.moveTo(L.px - r * 1.55, L.py - r * 0.72);
          ctx.ellipse(L.px, L.py - r * 0.72, r * 1.55, r * 0.3, -0.08, 0, Math.PI * 2);
          ctx.moveTo(L.px - r * 0.8, L.py - r * 0.8);
          ctx.quadraticCurveTo(L.px - r * 0.6, L.py - r * 1.9, L.px - r * 1.1, L.py - r * 2.75);
          ctx.quadraticCurveTo(L.px + r * 0.2, L.py - r * 1.8, L.px + r * 0.8, L.py - r * 0.8);
          ctx.closePath();
        } else if (look.hat === 'cap') {
          ctx.moveTo(L.px - r, L.py - r * 0.2);
          ctx.arc(L.px, L.py - r * 0.2, r * 1.02, Math.PI, 0);
          ctx.lineTo(L.px + r * 1.5, L.py - r * 0.25);
          ctx.lineTo(L.px + r * 1.5, L.py - r * 0.05);
          ctx.lineTo(L.px - r, L.py - r * 0.05);
          ctx.closePath();
        }
      };
    case 'torso':
      return (ctx, L) => {
        const w = d.torsoW, h = d.torsoH;
        const top = L.py - h / 2, bot = L.py + h / 2;
        const cx = L.px;
        // Neck.
        const nw = d.headR * 0.42;
        ctx.moveTo(cx - nw, top + 2);
        ctx.lineTo(cx - nw * 0.9, top - d.headR * 0.7);
        ctx.lineTo(cx + nw * 0.9, top - d.headR * 0.7);
        ctx.lineTo(cx + nw, top + 2);
        ctx.closePath();
        // Hunched trunk: round shoulders, slight belly forward, narrower hips.
        ctx.moveTo(cx - w * 0.38, top);
        ctx.quadraticCurveTo(cx - w * 0.56, top + h * 0.05, cx - w * 0.52, top + h * 0.35);
        ctx.quadraticCurveTo(cx - w * 0.5, bot - h * 0.1, cx - w * 0.42, bot);
        ctx.lineTo(cx + w * 0.42, bot);
        ctx.quadraticCurveTo(cx + w * 0.6, bot - h * 0.3, cx + w * 0.52, top + h * 0.3);
        ctx.quadraticCurveTo(cx + w * 0.5, top + h * 0.02, cx + w * 0.3, top);
        ctx.closePath();
        if (look.dress) {
          ctx.moveTo(cx - w * 0.44, bot - h * 0.15);
          ctx.lineTo(cx - w * 0.72, bot + h * 0.33);
          ctx.lineTo(cx + w * 0.72, bot + h * 0.33);
          ctx.lineTo(cx + w * 0.44, bot - h * 0.15);
          ctx.closePath();
        }
      };
    case 'upperArm':
    case 'thigh':
      return (ctx, L) => capsule(ctx, L.px, L.py, L.py + L.len, L.thick / 2);
    case 'foreArm':
      return (ctx, L) => {
        capsule(ctx, L.px, L.py, L.py + L.len, L.thick / 2);
        const hy = L.py + L.len + d.armW * 0.15;
        ctx.moveTo(L.px + d.armW * 0.7, hy);
        ctx.ellipse(L.px + d.armW * 0.1, hy, d.armW * 0.62, d.armW * 0.55, 0.4, 0, Math.PI * 2);
      };
    case 'shin':
      return (ctx, L) => {
        capsule(ctx, L.px, L.py, L.py + L.len - d.legW * 0.2, L.thick / 2);
        // Shoe, toe forward (+x).
        const sy = L.py + L.len;
        const lw = d.legW;
        ctx.moveTo(L.px - lw * 0.55, sy - lw * 0.45);
        ctx.quadraticCurveTo(L.px - lw * 0.65, sy + lw * 0.35, L.px - lw * 0.3, sy + lw * 0.38);
        ctx.lineTo(L.px + lw * 1.25, sy + lw * 0.38);
        ctx.quadraticCurveTo(L.px + lw * 1.65, sy + lw * 0.1, L.px + lw * 1.1, sy - lw * 0.2);
        ctx.quadraticCurveTo(L.px + lw * 0.5, sy - lw * 0.35, L.px + lw * 0.45, sy - lw * 0.5);
        ctx.closePath();
      };
  }
}

// ------------------------------------------------------------------ painting

function shade(ctx: Ctx, L: SegLayout): void {
  // Moonlight from the upper left, shadow lower right.
  const g = ctx.createLinearGradient(0, 0, L.w, L.h);
  g.addColorStop(0, 'rgba(210,235,255,0.28)');
  g.addColorStop(0.45, 'rgba(210,235,255,0)');
  g.addColorStop(0.6, 'rgba(10,10,40,0)');
  g.addColorStop(1, 'rgba(10,10,40,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.w, L.h);
}

function jagged(ctx: Ctx, x0: number, x1: number, y: number, depth: number, seed: number): void {
  const r = rng(seed);
  ctx.lineTo(x1, y);
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const x = x1 - ((x1 - x0) * i) / n;
    ctx.lineTo(x + (x1 - x0) / (2 * n), y + depth * (0.4 + r() * 0.8));
    ctx.lineTo(x, y);
  }
}

function paintFor(type: ZombieTypeId, kind: SegKind): (ctx: Ctx, L: SegLayout) => void {
  const d = partDims(type);
  const C = LOOKS[type];
  switch (kind) {
    case 'head':
      return (ctx, L) => {
        const r = d.headR, cx = L.px, cy = L.py;
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.3);
        g.addColorStop(0, C.skinLight);
        g.addColorStop(0.55, C.skin);
        g.addColorStop(1, C.skinDark);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, L.w, L.h);
        if (C.spots) {
          ctx.fillStyle = C.skinDark;
          circle(ctx, cx - r * 0.45, cy - r * 0.2, r * 0.2); ctx.fill();
          circle(ctx, cx - r * 0.1, cy + r * 0.55, r * 0.13); ctx.fill();
        }
        // Ear.
        ctx.fillStyle = C.skinDark;
        ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy + r * 0.05, r * 0.16, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
        // Hair: messy tufts on the back and crown.
        ctx.fillStyle = C.hair;
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.05, cy + r * 0.3);
        ctx.quadraticCurveTo(cx - r * 1.2, cy - r * 0.9, cx - r * 0.1, cy - r * 1.08);
        ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 1.05, cx + r * 0.85, cy - r * 0.55);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.62);
        ctx.lineTo(cx + r * 0.3, cy - r * 0.38);
        ctx.lineTo(cx + r * 0.05, cy - r * 0.6);
        ctx.lineTo(cx - r * 0.25, cy - r * 0.3);
        ctx.lineTo(cx - r * 0.55, cy - r * 0.45);
        ctx.quadraticCurveTo(cx - r * 0.7, cy - r * 0.0, cx - r * 1.05, cy + r * 0.3);
        ctx.fill();
        // Dark sunken eye socket + small dead eye.
        ctx.fillStyle = 'rgba(40,30,40,0.45)';
        ctx.beginPath(); ctx.ellipse(cx + r * 0.12, cy - r * 0.05, r * 0.26, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9e2c9';
        circle(ctx, cx + r * 0.13, cy - r * 0.04, r * 0.15); ctx.fill();
        // Big bulging front eye, bloodshot, with specular.
        const ex = cx + r * 0.58, ey = cy - r * 0.08;
        ctx.fillStyle = '#fbf7ea';
        circle(ctx, ex, ey, r * 0.34); ctx.fill();
        ctx.strokeStyle = 'rgba(200,40,40,0.55)';
        ctx.lineWidth = r * 0.04;
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * (0.6 + i * 0.35);
          ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * r * 0.32, ey + Math.sin(a) * r * 0.32);
          ctx.lineTo(ex + Math.cos(a) * r * 0.16, ey + Math.sin(a) * r * 0.18); ctx.stroke();
        }
        ctx.fillStyle = '#b3141c';
        circle(ctx, ex + r * 0.1, ey + r * 0.02, r * 0.15); ctx.fill();
        ctx.fillStyle = '#16090a';
        circle(ctx, ex + r * 0.13, ey + r * 0.03, r * 0.07); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        circle(ctx, ex - r * 0.08, ey - r * 0.12, r * 0.07); ctx.fill();
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = r * 0.07;
        circle(ctx, ex, ey, r * 0.34); ctx.stroke();
        // Brow.
        ctx.strokeStyle = C.skinDark;
        ctx.lineWidth = r * 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx + r * 0.25, cy - r * 0.42); ctx.lineTo(cx + r * 0.85, cy - r * 0.48); ctx.stroke();
        // Gaping mouth with uneven teeth.
        const mx = cx + r * 0.38, my = cy + r * 0.5;
        ctx.fillStyle = '#3d0d12';
        ctx.beginPath(); ctx.ellipse(mx, my, r * 0.45, r * 0.24, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a1a22';
        ctx.beginPath(); ctx.ellipse(mx - r * 0.05, my + r * 0.1, r * 0.25, r * 0.1, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#efe7cc';
        const tr = rng(type.length * 13);
        for (let i = 0; i < 4; i++) {
          const tx = mx - r * 0.32 + i * r * 0.2;
          ctx.fillRect(tx, my - r * 0.22 + i * r * 0.03, r * 0.13, r * (0.1 + tr() * 0.08));
        }
        // Stitched gash on the cheek.
        ctx.strokeStyle = 'rgba(120,20,30,0.8)';
        ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.05, cy + r * 0.3); ctx.lineTo(cx + r * 0.05, cy + r * 0.7); ctx.stroke();
        // Hats paint over everything above the brow.
        if (C.hat === 'witch') {
          const hg = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
          hg.addColorStop(0, '#3a2c52'); hg.addColorStop(1, '#16101f');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.ellipse(cx, cy - r * 0.72, r * 1.55, r * 0.3, -0.08, 0, Math.PI * 2);
          ctx.moveTo(cx - r * 0.8, cy - r * 0.8);
          ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 1.9, cx - r * 1.1, cy - r * 2.75);
          ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 1.8, cx + r * 0.8, cy - r * 0.8);
          ctx.fill();
          ctx.fillStyle = '#8b6bb5';
          ctx.fillRect(cx - r * 0.74, cy - r * 1.08, r * 1.5, r * 0.22);
        } else if (C.hat === 'cap') {
          const hg = ctx.createLinearGradient(0, cy - r * 1.2, 0, cy);
          hg.addColorStop(0, '#a53a2c'); hg.addColorStop(1, '#6a2018');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(cx, cy - r * 0.2, r * 1.02, Math.PI, 0);
          ctx.lineTo(cx + r * 1.5, cy - r * 0.25);
          ctx.lineTo(cx + r * 1.5, cy - r * 0.05);
          ctx.lineTo(cx - r, cy - r * 0.05);
          ctx.fill();
        }
      };
    case 'torso':
      return (ctx, L) => {
        const w = d.torsoW, h = d.torsoH, cx = L.px;
        const top = L.py - h / 2, bot = L.py + h / 2;
        // Skin base (neck, belly).
        ctx.fillStyle = C.skin;
        ctx.fillRect(0, 0, L.w, L.h);
        ctx.fillStyle = C.skinDark;
        ctx.fillRect(cx - w, top - d.headR, w * 2, d.headR * 0.5);
        // Shirt with a torn hem.
        const sg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        sg.addColorStop(0, C.shirt);
        sg.addColorStop(1, C.shirtDark);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(cx - w, top - 1);
        ctx.lineTo(cx + w, top - 1);
        ctx.lineTo(cx + w, top + h * 0.55);
        jagged(ctx, cx - w, cx + w, top + h * 0.55, h * 0.16, type.length);
        ctx.closePath();
        ctx.fill();
        // Collar.
        ctx.fillStyle = C.shirtDark;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.3, top - 1); ctx.lineTo(cx, top + h * 0.15); ctx.lineTo(cx + w * 0.3, top - 1);
        ctx.fill();
        // Rips and a blood stain.
        ctx.fillStyle = C.skin;
        ctx.beginPath(); ctx.ellipse(cx + w * 0.12, top + h * 0.32, w * 0.09, h * 0.05, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(130,12,20,0.75)';
        ctx.beginPath(); ctx.ellipse(cx + w * 0.25, top + h * 0.2, w * 0.13, h * 0.08, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(130,12,20,0.5)';
        ctx.fillRect(cx + w * 0.22, top + h * 0.25, w * 0.04, h * 0.18);
        // Belly button / rib hint.
        ctx.strokeStyle = C.skinDark;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx + w * 0.1, top + h * 0.66, w * 0.15, 0.2, Math.PI - 0.2); ctx.stroke();
        // Trousers / skirt from the waist down.
        const pg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        pg.addColorStop(0, C.pants);
        pg.addColorStop(1, C.pantsDark);
        ctx.fillStyle = pg;
        ctx.fillRect(cx - w, bot - h * 0.2, w * 2, L.h);
        ctx.fillStyle = '#2a1e18';
        ctx.fillRect(cx - w, bot - h * 0.22, w * 2, h * 0.06);
        if (C.dress) {
          ctx.fillStyle = C.shirtDark;
          ctx.fillRect(cx - w, bot - h * 0.16, w * 2, L.h);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 0.8;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(cx + i * w * 0.12, bot - h * 0.1); ctx.lineTo(cx + i * w * 0.2, bot + h * 0.33); ctx.stroke();
          }
        }
        if (C.spots) {
          ctx.fillStyle = C.skinDark;
          circle(ctx, cx - w * 0.2, top + h * 0.75, w * 0.07); ctx.fill();
        }
      };
    case 'upperArm':
      return (ctx, L) => {
        ctx.fillStyle = C.skin;
        ctx.fillRect(0, 0, L.w, L.h);
        ctx.fillStyle = C.shirt;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(L.w, 0);
        ctx.lineTo(L.w, L.py + L.len * 0.7);
        jagged(ctx, 0, L.w, L.py + L.len * 0.7, L.len * 0.18, 3);
        ctx.closePath();
        ctx.fill();
      };
    case 'foreArm':
      return (ctx, L) => {
        ctx.fillStyle = C.skin;
        ctx.fillRect(0, 0, L.w, L.h);
        ctx.strokeStyle = C.skinDark;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(L.px - L.thick * 0.1, L.py + L.len * 0.3); ctx.lineTo(L.px + L.thick * 0.15, L.py + L.len * 0.55); ctx.stroke();
        // Knuckle shading on the hand.
        ctx.fillStyle = C.skinDark;
        circle(ctx, L.px + d.armW * 0.2, L.py + L.len + d.armW * 0.3, d.armW * 0.28); ctx.fill();
      };
    case 'thigh':
      return (ctx, L) => {
        ctx.fillStyle = C.dress ? C.shirtDark : C.pants;
        ctx.fillRect(0, 0, L.w, L.h);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(L.px + L.thick * 0.15, 0, L.thick * 0.3, L.h);
      };
    case 'shin':
      return (ctx, L) => {
        // Ragged trouser leg over a bony ankle, then the shoe.
        ctx.fillStyle = C.skin;
        ctx.fillRect(0, 0, L.w, L.h);
        if (!C.dress) {
          ctx.fillStyle = C.pants;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(L.w, 0);
          ctx.lineTo(L.w, L.py + L.len * 0.62);
          jagged(ctx, 0, L.w, L.py + L.len * 0.62, L.len * 0.15, 7);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(L.px + L.thick * 0.15, 0, L.thick * 0.3, L.py + L.len * 0.6);
        }
        const sy = L.py + L.len, lw = d.legW;
        const sg = ctx.createLinearGradient(0, sy - lw * 0.5, 0, sy + lw * 0.4);
        sg.addColorStop(0, '#4a3d34');
        sg.addColorStop(1, C.shoe);
        ctx.fillStyle = sg;
        ctx.fillRect(0, sy - lw * 0.45, L.w, L.h);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(L.px + lw * 0.3, sy - lw * 0.25, lw * 0.6, lw * 0.12);
      };
  }
}

export function drawZombieSeg(type: ZombieTypeId, kind: SegKind, outline: boolean) {
  return (ctx: Ctx): void => {
    const L = segLayout(type, kind);
    const shape = shapeFor(type, kind);
    const OL = outlineWidth(type);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (outline) {
      ctx.beginPath();
      shape(ctx, L);
      ctx.fillStyle = PAL.outline;
      ctx.fill();
      ctx.lineWidth = OL * 2;
      ctx.strokeStyle = PAL.outline;
      ctx.stroke();
      return;
    }
    ctx.save();
    ctx.beginPath();
    shape(ctx, L);
    ctx.clip();
    paintFor(type, kind)(ctx, L);
    shade(ctx, L);
    // Inner definition line: half of it survives the clip.
    ctx.beginPath();
    shape(ctx, L);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(20,20,35,0.55)';
    ctx.stroke();
    ctx.restore();
  };
}

/** Raw meat cap shown on torn joints. */
export function drawStump(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#5e0b12';
  ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2 - 0.5, h / 2 - 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b3202a';
  ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2 - 1.8, h / 2 - 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#efe6cf';
  circle(ctx, w / 2 + 0.5, h / 2, Math.min(w, h) * 0.2); ctx.fill();
}

/** Soft contact shadow. */
export function drawShadow(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(5,10,25,0.75)');
  g.addColorStop(0.6, 'rgba(5,10,25,0.35)');
  g.addColorStop(1, 'rgba(5,10,25,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
}

/** Teardrop blood droplet pointing along +x (rotated to velocity at runtime). */
export function drawBloodDrop(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(110,8,14,0.6)');
  g.addColorStop(1, PAL.blood);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.quadraticCurveTo(w * 0.5, h * 0.05, w - h / 2, h * 0.1);
  ctx.arc(w - h / 2, h / 2, h / 2 - 0.3, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(w * 0.5, h * 0.95, 0, h / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,180,180,0.5)';
  circle(ctx, w - h * 0.6, h * 0.38, h * 0.15);
  ctx.fill();
}

/** Ground splat decal (stamped into the decal layer). */
export function drawBloodSplat(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    const r = rng(seed);
    const blob = (x: number, y: number, rx: number, ry: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(w / 2, h / 2, w * 0.3, h * 0.3, PAL.bloodDark);
    for (let i = 0; i < 7; i++) {
      blob(w / 2 + (r() - 0.5) * w * 0.4, h / 2 + (r() - 0.5) * h * 0.3, w * (0.06 + r() * 0.1), h * (0.1 + r() * 0.14), PAL.bloodDark);
    }
    blob(w / 2, h / 2, w * 0.24, h * 0.22, PAL.blood);
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2;
      const dd = 0.28 + r() * 0.2;
      blob(w / 2 + Math.cos(a) * w * dd, h / 2 + Math.sin(a) * h * dd, 0.6 + r() * 1.6, 0.5 + r() * 1.2, PAL.blood);
    }
    ctx.fillStyle = 'rgba(255,140,140,0.25)';
    ctx.beginPath();
    ctx.ellipse(w * 0.44, h * 0.42, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}
