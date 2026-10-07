# ZombieSmash! recreation (personal project)

A fan recreation of ZombieSmash! (Gamedoctors, 2010) built with Phaser 3 and Matter.js.
All art is original procedural placeholder art, generated at boot from `src/assets/manifest.ts`.

```
npm install
npm run dev       # dev server (open on your phone via the LAN URL it prints)
npm run build     # typecheck + production build
npm test          # unit tests
```

Add `?debug=1` to the URL to see physics bodies, FPS and body count.

Tunables live in `src/config/` (`game.ts` for physics/flick/damage, `zombies.ts` for zombie stats).
