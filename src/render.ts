import { WORLD } from './config';
import { corpses } from './deaths';
import { ctx } from './canvas';
import { game } from './state';
import { drawDecorLive, drawTopsLive, floorLayer } from './floorlayer';
import { quakes } from './boss';
import { drawHUD } from './hud';
import { drawCoins, drawGearDrops, drawNpcs, drawPet } from './economydraw';
import { settings } from './settings';
import { drawBackground, drawPortal, tileset } from './drawworld';
import { drawCorpse, drawGhosts, drawMob, drawPlayer, drawPlayerDeath } from './drawentities';
import { drawDmg, drawFx, drawQuake, drawShot } from './drawfx';

// Base (internal) resolution. The canvas backing store IS this size; everything
// is drawn at integer pixel coordinates, then CSS upscales it to fit the screen
// with image-rendering:pixelated (nearest-neighbour) — crisp, no AA.
const BASE_W = 240;
const BASE_H = 180;
const SCALE = 1;

export function resize(): void {
  ctx.canvas.width = BASE_W * SCALE;
  ctx.canvas.height = BASE_H * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  game.view.w = BASE_W;
  game.view.h = BASE_H;
  WORLD.h = Math.max(BASE_H, WORLD.h);
}

/** Draw one frame: the backdrop, then the world in camera space, back to front, then the HUD. */
export function render(): void {
  const { w, h } = game.view;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  const ts = tileset();
  drawBackground(ts);
  ctx.save();
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));
  ctx.drawImage(floorLayer(ts), 0, 0); // everything static, baked once per floor
  drawDecorLive(ctx, performance.now() / 1000); // ...and the town decor that moves
  drawTopsLive(ctx, ts, performance.now() / 1000, game.cam.x, game.cam.y, game.cam.x + game.view.w, game.cam.y + game.view.h); // ...and swaying plants
  game.floor.portals.forEach(drawPortal);
  drawNpcs();
  corpses.forEach(drawCorpse);
  game.mobs.forEach(drawMob);
  quakes.forEach(drawQuake);
  game.shots.forEach(drawShot);
  drawGhosts();
  drawPlayer();
  drawPet();
  drawCoins(); // in front of the player, so you can see what you're standing on
  drawGearDrops(); // the same: you want to see what you're about to pick up
  game.fx.forEach(drawFx);
  if (settings.dmgNums) game.dmgNums.forEach(drawDmg);
  drawPlayerDeath(); // the tombstone and ghost sit above the action
  ctx.restore();
  drawHUD();
}
