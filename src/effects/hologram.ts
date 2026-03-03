import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_scanlineDensity;
uniform float u_flickerBands;
uniform float u_tintStrength;
uniform float u_seed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  vec3 orig = texture(u_texture, uv).rgb;
  float lum = dot(orig, vec3(0.2126, 0.7152, 0.0722));

  // Blue/cyan holographic tint
  vec3 holoTint = vec3(0.15, 0.65, 1.0);
  vec3 color = mix(orig, holoTint * lum * 1.5, u_tintStrength);

  // Keep some brightness variation from original
  color += orig * 0.15;

  // Horizontal scanlines
  float scanline = sin(uv.y / u_texel.y * 3.14159 / u_scanlineDensity) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5);
  color *= 0.7 + 0.3 * scanline;

  // Flicker bands — horizontal bands that brighten/darken
  float bandY = uv.y + u_seed * 0.3;
  float band = sin(bandY * u_flickerBands * 6.28) * 0.5 + 0.5;
  float flickerNoise = hash(vec2(floor(bandY * u_flickerBands), u_seed));

  if (flickerNoise > 0.7) {
    color *= 0.6 + band * 0.8;
  }

  // Edge glow — brighten edges for holographic rim light
  float tl = dot(texture(u_texture, uv + vec2(-u_texel.x, -u_texel.y)).rgb, vec3(0.333));
  float br = dot(texture(u_texture, uv + vec2( u_texel.x,  u_texel.y)).rgb, vec3(0.333));
  float t  = dot(texture(u_texture, uv + vec2(0.0, -u_texel.y)).rgb, vec3(0.333));
  float b  = dot(texture(u_texture, uv + vec2(0.0,  u_texel.y)).rgb, vec3(0.333));
  float edge = length(vec2(br - tl, b - t)) * 2.0;
  color += vec3(0.3, 0.7, 1.0) * edge * 0.6;

  // Slight noise / static
  float grain = hash(uv * 500.0 + u_seed) * 0.08;
  color += grain;

  // Transparency fade at edges
  float alpha = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
  color *= alpha;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const hologram: Effect = {
  id: "hologram",
  name: "Hologram",
  params: [
    { name: "scanlineDensity", label: "Scanline Size", min: 1, max: 8, default: 2 },
    { name: "flickerBands", label: "Flicker Bands", min: 1, max: 30, default: 10 },
    { name: "tintStrength", label: "Tint Strength", min: 0, max: 100, default: 70 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_scanlineDensity: params.scanlineDensity,
      u_flickerBands: params.flickerBands,
      u_tintStrength: params.tintStrength / 100,
      u_seed: Math.random(),
    });
  },
};
