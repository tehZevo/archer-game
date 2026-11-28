import { art } from './artsheets';
import { HAT_AT, type ArcherPose } from './archer';
import { CIRCLET, HATS } from './hatart';
import type { Look } from './look';

/** A look's hat on a frame of a pose: its image and where its top-left goes,
 *  in the frame's own pixels (facing right, from the frame's top-left).
 *  Null with no hat, or where the head is turned (see HAT_AT). */
export function hatOn(look: Look, pose: ArcherPose, frame: number): { img: HTMLCanvasElement; x: number; y: number } | null {
  const at = look.hat ? HAT_AT[pose]?.[frame] : null;
  if (!at) return null;
  const h = HATS[look.hat - 1];
  return { img: art(`hat/${look.hat}`), x: at.x - CIRCLET.x + h.left, y: at.y - CIRCLET.y + h.top };
}
