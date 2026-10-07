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
