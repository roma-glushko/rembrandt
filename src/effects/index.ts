export type ParamDef = {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
};

export type Effect = {
  id: string;
  name: string;
  params: ParamDef[];
  apply: (
    source: HTMLCanvasElement,
    dest: HTMLCanvasElement,
    params: Record<string, number>,
  ) => void;
};

import { oilPainting } from "./oil-painting";
import { pixelate } from "./pixelate";
import { grayscale } from "./grayscale";
import { emboss } from "./emboss";
import { edgeDetect } from "./edge-detect";
import { posterize } from "./posterize";
import { watercolor } from "./watercolor";
import { glitch } from "./glitch";
import { neonGlow } from "./neon-glow";
import { synthwave } from "./synthwave";
import { infrared } from "./infrared";
import { datamosh } from "./datamosh";
import { vhs } from "./vhs";
import { hologram } from "./hologram";
import { chromaticAberration } from "./chromatic-aberration";
import { kaleidoscope } from "./kaleidoscope";
import { swirl } from "./swirl";
import { halftone } from "./halftone";
import { wireframe } from "./wireframe";
import { matrix } from "./matrix";
import { duotone } from "./duotone";
import { tiltShift } from "./tilt-shift";
import { corruptJpeg } from "./corrupt-jpeg";

export const effects: Effect[] = [
  // Artistic
  oilPainting,
  watercolor,
  halftone,
  duotone,
  // Classic
  grayscale,
  posterize,
  emboss,
  edgeDetect,
  pixelate,
  // Futuristic
  neonGlow,
  synthwave,
  wireframe,
  infrared,
  hologram,
  matrix,
  // Distortion
  glitch,
  datamosh,
  corruptJpeg,
  vhs,
  chromaticAberration,
  swirl,
  kaleidoscope,
  tiltShift,
];

export function getDefaults(effect: Effect): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const p of effect.params) {
    defaults[p.name] = p.default;
  }
  return defaults;
}
