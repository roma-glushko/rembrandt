import type { Effect } from "./index";
import { renderEffect } from "./gl";

// Pixel sorting effect — sorts pixels along rows by luminance,
// creating horizontal streak/melt artifacts
const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_threshold;
uniform float u_direction;
uniform float u_streakLength;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  vec3 origColor = texture(u_texture, uv).rgb;
  float origLuma = luma(origColor);

  // Only sort pixels above/below the luminance threshold
  bool inSortRange = (u_direction > 0.5) ? (origLuma > u_threshold) : (origLuma < u_threshold);

  if (!inSortRange) {
    fragColor = vec4(origColor, 1.0);
    return;
  }

  // Walk along the row to find where the sortable region starts/ends
  // and pick the pixel that would be "sorted" to this position
  int maxSteps = int(u_streakLength);

  // Find the run of consecutive pixels that pass the threshold
  int runStart = 0;
  int runEnd = 0;

  // Search left for run start
  for (int i = 1; i <= maxSteps; i++) {
    vec2 checkUV = uv + vec2(-float(i) * u_texel.x, 0.0);
    float l = luma(texture(u_texture, checkUV).rgb);
    bool passes = (u_direction > 0.5) ? (l > u_threshold) : (l < u_threshold);
    if (!passes || checkUV.x < 0.0) break;
    runStart = i;
  }

  // Search right for run end
  for (int i = 1; i <= maxSteps; i++) {
    vec2 checkUV = uv + vec2(float(i) * u_texel.x, 0.0);
    float l = luma(texture(u_texture, checkUV).rgb);
    bool passes = (u_direction > 0.5) ? (l > u_threshold) : (l < u_threshold);
    if (!passes || checkUV.x > 1.0) break;
    runEnd = i;
  }

  int runLen = runStart + runEnd + 1;

  // Position within the run (0 = leftmost)
  int posInRun = runStart;

  // Find how many pixels in the run are darker/brighter than us
  // This determines our "sorted" position
  int sortedPos = 0;
  for (int i = -runStart; i <= runEnd; i++) {
    vec2 checkUV = uv + vec2(float(i) * u_texel.x, 0.0);
    float l = luma(texture(u_texture, checkUV).rgb);
    if (l < origLuma) sortedPos++;
  }

  // Map sorted position back to a UV offset
  int offset = sortedPos - posInRun;
  vec2 sortedUV = uv + vec2(float(offset) * u_texel.x, 0.0);

  vec3 sortedColor = texture(u_texture, sortedUV).rgb;

  fragColor = vec4(sortedColor, 1.0);
}`;

export const datamosh: Effect = {
  id: "datamosh",
  name: "Datamosh",
  params: [
    { name: "threshold", label: "Threshold", min: 0, max: 100, default: 40 },
    { name: "direction", label: "Sort Bright (1) / Dark (0)", min: 0, max: 1, default: 1 },
    { name: "streakLength", label: "Streak Length", min: 10, max: 200, default: 80 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_threshold: params.threshold / 100,
      u_direction: params.direction,
      u_streakLength: params.streakLength,
    });
  },
};
