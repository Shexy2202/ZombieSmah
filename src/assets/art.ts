import Phaser from 'phaser';

/** Texture pixels per design pixel for a manifest key (set by Boot). */
export function texRes(scene: Phaser.Scene, key: string): number {
  const tex = scene.textures.get(key);
  return (tex.customData as { res?: number }).res ?? 1;
}

/** Add an image whose on-screen size is in design pixels regardless of texture resolution. */
export function artImage(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key);
  img.setScale(1 / texRes(scene, key));
  return img;
}

/**
 * Wide textures are split into vertical slices (`key#0`, `key#1`...) at boot so no
 * single texture exceeds mobile GPU limits. This lays the slices out left-to-right
 * from (x, y) with the given vertical origin and returns them.
 */
export function artWide(scene: Phaser.Scene, x: number, y: number, key: string, originY = 0): Phaser.GameObjects.Image[] {
  if (scene.textures.exists(key)) {
    return [artImage(scene, x, y, key).setOrigin(0, originY)];
  }
  const out: Phaser.GameObjects.Image[] = [];
  let cx = x;
  for (let i = 0; scene.textures.exists(`${key}#${i}`); i++) {
    const img = artImage(scene, cx, y, `${key}#${i}`).setOrigin(0, originY);
    cx += img.displayWidth;
    out.push(img);
  }
  return out;
}
