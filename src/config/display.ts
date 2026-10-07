import { VIEW_H, VIEW_W } from './game';

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

/** Reduced effects for low-end phones (`?lowfx=1`). */
export const LOW_FX = params.has('lowfx');

/**
 * Internal render scale. The canvas is VIEW_W*R x VIEW_H*R and the main camera
 * zooms by R, so game code works in 960x640 design pixels while the screen
 * gets one texel per physical pixel instead of a stretched, blurry canvas.
 */
function computeRenderScale(): number {
  if (typeof window === 'undefined') return 1;
  const forced = Number(params.get('res'));
  if (forced >= 1 && forced <= 3) return forced;
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  // Physical pixels per design pixel once the canvas is fitted to the screen.
  const physical = Math.max(fit * dpr, 1);
  return Math.min(LOW_FX ? 1.5 : 3, Math.max(1, Math.ceil(physical * 2) / 2));
}

export const RENDER_SCALE = computeRenderScale();

/** Largest texture edge we create, safe on older mobile GPUs. */
export const MAX_TEX = 2048;

export const FX = {
  vignette: !LOW_FX,
  fog: !LOW_FX,
  treeSway: !LOW_FX,
};
