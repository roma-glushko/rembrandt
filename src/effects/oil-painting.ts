// Inspired by https://codepen.io/loktar00/pen/Rwgxor
// GPU implementation using intensity histogram approach

import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_intensity;
uniform float u_radius;

void main() {
  int rad = int(u_radius);
  int levels = int(u_intensity);

  // Fixed-size histogram — track count + accumulated RGB per intensity bin
  // Max 100 intensity levels (matching param max)
  float bestCount = 0.0;
  vec3 bestColor = vec3(0.0);

  // We can't use variable-length arrays, so we accumulate on-the-fly
  // using a two-pass approach: first find the most common intensity bin,
  // then gather colors for that bin.

  // Pass 1: find the dominant intensity bin
  // We'll use a simpler approach: for each pixel in the neighborhood,
  // compute intensity bin. Track up to 101 bins with counts.
  float counts[101];
  float sumR[101];
  float sumG[101];
  float sumB[101];

  for (int i = 0; i <= levels; i++) {
    counts[i] = 0.0;
    sumR[i] = 0.0;
    sumG[i] = 0.0;
    sumB[i] = 0.0;
  }

  for (int dy = -rad; dy <= rad; dy++) {
    for (int dx = -rad; dx <= rad; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * u_texel;
      vec3 c = texture(u_texture, v_uv + offset).rgb;
      float avg = (c.r + c.g + c.b) / 3.0;
      int bin = int(avg * float(levels) + 0.5);
      bin = clamp(bin, 0, levels);
      counts[bin] += 1.0;
      sumR[bin] += c.r;
      sumG[bin] += c.g;
      sumB[bin] += c.b;
    }
  }

  // Find bin with highest count
  float maxCount = 0.0;
  int maxBin = 0;
  for (int i = 0; i <= levels; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      maxBin = i;
    }
  }

  vec3 color = vec3(
    sumR[maxBin] / maxCount,
    sumG[maxBin] / maxCount,
    sumB[maxBin] / maxCount
  );

  fragColor = vec4(color, 1.0);
}`;

export const oilPainting: Effect = {
  id: "oil-painting",
  name: "Oil Painting",
  params: [
    { name: "intensity", label: "Intensity", min: 1, max: 100, default: 25 },
    { name: "radius", label: "Radius", min: 1, max: 20, default: 4 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_intensity: params.intensity,
      u_radius: params.radius,
    });
  },
};
