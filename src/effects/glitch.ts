import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_rgbShift;
uniform float u_sliceIntensity;
uniform float u_sliceCount;
uniform float u_seed;

// Simple hash for pseudo-random values
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = v_uv;

  // Horizontal slice displacement
  float sliceCount = max(u_sliceCount, 1.0);
  float sliceIndex = floor(uv.y * sliceCount);
  float sliceRand = hash(sliceIndex + u_seed * 13.37);

  // Only displace some slices (roughly half, based on threshold)
  float displace = 0.0;
  if (sliceRand > 0.5) {
    // Displacement amount varies per slice
    float amount = (hash(sliceIndex + u_seed * 7.13) - 0.5) * 2.0;
    displace = amount * u_sliceIntensity * 0.15;
  }

  uv.x += displace;

  // RGB channel separation
  float shift = u_rgbShift / 500.0;

  // Vary shift direction slightly per-slice for more chaotic look
  float shiftAngle = hash(sliceIndex + u_seed * 3.71) * 3.14159 * 0.5;
  vec2 shiftDir = vec2(cos(shiftAngle), sin(shiftAngle) * 0.3) * shift;

  float r = texture(u_texture, uv + shiftDir).r;
  float g = texture(u_texture, uv).g;
  float b = texture(u_texture, uv - shiftDir).b;

  // Occasional scanline darkening
  float scanline = 1.0 - step(0.92, hash2(vec2(sliceIndex, u_seed))) * 0.4;

  // Random color block artifacts on heavily displaced slices
  vec3 color = vec3(r, g, b) * scanline;

  if (abs(displace) > 0.05) {
    // Add subtle color tint to heavily glitched areas
    float tint = hash(sliceIndex + u_seed * 19.91);
    if (tint > 0.85) {
      color = mix(color, vec3(0.0, color.g * 1.5, color.b * 1.5), 0.3);
    } else if (tint > 0.7) {
      color = mix(color, vec3(color.r * 1.5, 0.0, color.b * 1.5), 0.3);
    }
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const glitch: Effect = {
  id: "glitch",
  name: "Glitch Art",
  params: [
    { name: "rgbShift", label: "RGB Shift", min: 0, max: 100, default: 30 },
    { name: "sliceIntensity", label: "Slice Intensity", min: 0, max: 100, default: 50 },
    { name: "sliceCount", label: "Slice Count", min: 5, max: 100, default: 30 },
    { name: "seed", label: "Seed", min: 1, max: 999, default: 42 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_rgbShift: params.rgbShift,
      u_sliceIntensity: params.sliceIntensity / 100,
      u_sliceCount: params.sliceCount,
      u_seed: params.seed,
    });
  },
};
