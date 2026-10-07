import Phaser from 'phaser';
import { PHYSICS, VIEW_H, VIEW_W } from './config/game';
import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';

const debug = new URLSearchParams(location.search).has('debug');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  render: { antialias: true, roundPixels: false },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: PHYSICS.gravityY },
      positionIterations: PHYSICS.positionIterations,
      velocityIterations: PHYSICS.velocityIterations,
      enableSleeping: false,
      runner: { fps: 60, maxUpdates: 2 },
      debug: debug ? { showBody: true, showJoint: true, showCollisions: false } : false,
    },
  },
  scene: [Boot, Game],
});

// Exposed for automated smoke tests.
(window as unknown as { __game: Phaser.Game }).__game = game;
