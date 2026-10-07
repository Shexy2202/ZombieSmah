import { ZombieTypeId } from '../../config/zombies';
import { partDims } from '../../entities/partDims';
import { PAL } from './palette';
import { Ctx, circle, fillStroke, roundRect } from './util';

interface ZombieLook {
  skin: string;
  skinDark: string;
  shirt: string;
  shirtDark: string;
  pants: string;
  shoe: string;
  hair: string;
  hat?: 'witch' | 'cap';
  spots?: boolean;
}

const LOOKS: Record<ZombieTypeId, ZombieLook> = {
  walker: { skin: '#a9c48a', skinDark: '#7e9a64', shirt: '#4e7f3c', shirtDark: '#365a2a', pants: '#4b5f86', shoe: '#2a2320', hair: '#2b2420' },
  jumper: { skin: '#c9d3b8', skinDark: '#98a588', shirt: '#4a3560', shirtDark: '#2f2140', pants: '#3a2a4a', shoe: '#1d1820', hair: '#151217', hat: 'witch' },
  mutant: { skin: '#5d5fd6', skinDark: '#3d3fa3', shirt: '#4a3a66', shirtDark: '#33264a', pants: '#3a2c52', shoe: '#22203a', hair: '#1f1d40', spots: true },
  gunner: { skin: '#b5c690', skinDark: '#8a9a6a', shirt: '#7a5532', shirtDark: '#583c22', pants: '#3f4a3a', shoe: '#231d18', hair: '#3a2a1a', hat: 'cap' },
};

const PAD = 6;
export type PartKind = 'head' | 'torso' | 'arm' | 'leg';

/** Logical texture size for each part (body size plus symmetric padding). */
export function zombiePartSize(type: ZombieTypeId, part: PartKind): [number, number] {
  const d = partDims(type);
  const look = LOOKS[type];
  switch (part) {
    case 'head': {
      const extra = look.hat === 'witch' ? d.headR * 1.6 : look.hat === 'cap' ? d.headR * 0.5 : 0;
      return [d.headR * 2 + PAD * 2 + extra, d.headR * 2 + PAD * 2 + extra * 2];
    }
    case 'torso': return [d.torsoW + PAD * 2, d.torsoH + PAD * 2];
    case 'arm': return [d.armW + PAD * 2, d.armH + PAD * 2];
    case 'leg': return [d.legW + PAD * 2 + d.legW, d.legH + PAD * 2];
  }
}

export function drawZombiePart(type: ZombieTypeId, part: PartKind) {
  return (ctx: Ctx, w: number, h: number): void => {
    const d = partDims(type);
    const L = LOOKS[type];
    const cx = w / 2, cy = h / 2;
    const lw = Math.max(1.2, d.headR / 9);
    switch (part) {
      case 'head': {
        const r = d.headR;
        // Face (facing right).
        circle(ctx, cx, cy, r);
        fillStroke(ctx, L.skin, PAL.outline, lw);
        if (L.spots) {
          ctx.fillStyle = L.skinDark;
          circle(ctx, cx - r * 0.4, cy - r * 0.3, r * 0.22); ctx.fill();
          circle(ctx, cx - r * 0.1, cy + r * 0.45, r * 0.15); ctx.fill();
        }
        // Sunken shading on the back of the head.
        ctx.fillStyle = L.skinDark;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.92, Math.PI * 0.55, Math.PI * 1.25);
        ctx.fill();
        // Hair.
        ctx.fillStyle = L.hair;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI * 1.02, Math.PI * 1.85);
        ctx.lineTo(cx + r * 0.1, cy - r * 0.45);
        ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
        ctx.lineTo(cx - r * 0.75, cy + r * 0.1);
        ctx.closePath();
        ctx.fill();
        // Eyes: one big bulging, one small.
        circle(ctx, cx + r * 0.45, cy - r * 0.05, r * 0.36);
        fillStroke(ctx, '#f6f2e4', PAL.outline, lw * 0.8);
        ctx.fillStyle = '#c0121c';
        circle(ctx, cx + r * 0.55, cy - r * 0.02, r * 0.14); ctx.fill();
        ctx.fillStyle = '#111';
        circle(ctx, cx + r * 0.58, cy, r * 0.07); ctx.fill();
        circle(ctx, cx + r * 0.05, cy - r * 0.08, r * 0.18);
        fillStroke(ctx, '#e8e0c8', PAL.outline, lw * 0.6);
        // Mouth with teeth.
        ctx.fillStyle = '#3a0c10';
        roundRect(ctx, cx + r * 0.05, cy + r * 0.38, r * 0.8, r * 0.36, r * 0.12);
        ctx.fill();
        ctx.fillStyle = '#eee8d0';
        for (let i = 0; i < 3; i++) ctx.fillRect(cx + r * (0.15 + i * 0.22), cy + r * 0.38, r * 0.14, r * 0.14);
        if (L.hat === 'witch') {
          ctx.fillStyle = '#1b1426';
          ctx.beginPath();
          ctx.ellipse(cx, cy - r * 0.75, r * 1.45, r * 0.28, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.75, cy - r * 0.8);
          ctx.lineTo(cx - r * 0.9, cy - r * 2.5);
          ctx.lineTo(cx + r * 0.7, cy - r * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#7a5aa0';
          ctx.fillRect(cx - r * 0.75, cy - r * 1.05, r * 1.45, r * 0.2);
        } else if (L.hat === 'cap') {
          ctx.fillStyle = '#7a2a22';
          ctx.beginPath();
          ctx.arc(cx, cy - r * 0.15, r * 0.98, Math.PI * 1.05, Math.PI * 1.95);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(cx, cy - r * 0.35, r * 1.35, r * 0.22);
        }
        break;
      }
      case 'torso': {
        const tw = d.torsoW, th = d.torsoH;
        const x = cx - tw / 2, y = cy - th / 2;
        roundRect(ctx, x, y, tw, th, tw * 0.3);
        fillStroke(ctx, L.shirt, PAL.outline, lw);
        // Torn hem showing skin.
        ctx.fillStyle = L.skin;
        ctx.beginPath();
        ctx.moveTo(x + tw * 0.15, y + th);
        ctx.lineTo(x + tw * 0.35, y + th * 0.72);
        ctx.lineTo(x + tw * 0.55, y + th * 0.9);
        ctx.lineTo(x + tw * 0.75, y + th * 0.68);
        ctx.lineTo(x + tw * 0.9, y + th);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.shirtDark;
        ctx.fillRect(x + tw * 0.1, y + th * 0.25, tw * 0.25, th * 0.08);
        ctx.fillRect(x + tw * 0.55, y + th * 0.45, tw * 0.3, th * 0.06);
        // Blood stain.
        ctx.fillStyle = 'rgba(140,15,20,0.7)';
        circle(ctx, x + tw * 0.65, y + th * 0.25, tw * 0.13); ctx.fill();
        if (L.spots) {
          ctx.fillStyle = L.skin;
          roundRect(ctx, x + tw * 0.05, y + th * 0.05, tw * 0.9, th * 0.4, tw * 0.25);
          ctx.fill();
          ctx.fillStyle = L.skinDark;
          circle(ctx, x + tw * 0.3, y + th * 0.2, tw * 0.1); ctx.fill();
          circle(ctx, x + tw * 0.7, y + th * 0.3, tw * 0.07); ctx.fill();
        }
        break;
      }
      case 'arm': {
        const aw = d.armW, ah = d.armH;
        const x = cx - aw / 2, y = cy - ah / 2;
        roundRect(ctx, x, y, aw, ah, aw / 2);
        fillStroke(ctx, L.skin, PAL.outline, lw);
        roundRect(ctx, x, y, aw, ah * 0.5, aw / 2);
        fillStroke(ctx, L.shirt, PAL.outline, lw * 0.8);
        ctx.fillStyle = L.skinDark;
        circle(ctx, cx, y + ah - aw * 0.5, aw * 0.55); ctx.fill();
        break;
      }
      case 'leg': {
        const lw2 = d.legW, lh = d.legH;
        const x = cx - lw2 / 2, y = cy - lh / 2;
        // Shoe pokes forward (+x).
        roundRect(ctx, x - 1, y + lh - lw2 * 0.7, lw2 * 1.9, lw2 * 0.75, lw2 * 0.3);
        fillStroke(ctx, L.shoe, PAL.outline, lw * 0.8);
        roundRect(ctx, x, y, lw2, lh - lw2 * 0.5, lw2 * 0.35);
        fillStroke(ctx, L.pants, PAL.outline, lw);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + lw2 * 0.6, y + 2, lw2 * 0.25, lh * 0.7);
        break;
      }
    }
  };
}

export function drawBloodDrop(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = PAL.blood;
  circle(ctx, w / 2, h / 2, w / 2 - 0.5);
  ctx.fill();
}

/** Ground splat decal (stamped into the decal layer). */
export function drawBloodSplat(seed: number) {
  return (ctx: Ctx, w: number, h: number): void => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    ctx.fillStyle = PAL.bloodDark;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.26, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.3 + r() * 0.18;
      circle(ctx, w / 2 + Math.cos(a) * w * d, h / 2 + Math.sin(a) * h * d, 1 + r() * 2.5);
      ctx.fill();
    }
  };
}
