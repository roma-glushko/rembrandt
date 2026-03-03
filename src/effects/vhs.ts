import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_chromaShift;
uniform float u_scanlineStrength;
uniform float u_noiseAmount;
uniform float u_wobble;
uniform float u_seed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = v_uv;

  // Horizontal wobble (tape warping)
  float wobbleAmount = u_wobble * 0.008;
  float wobbleFreq = 15.0;
  uv.x += sin(uv.y * wobbleFreq + u_seed * 6.28) * wobbleAmount;

  // Occasional horizontal tracking glitch
  float trackingNoise = noise(vec2(uv.y * 3.0, u_seed * 10.0));
  if (trackingNoise > 0.92) {
    uv.x += (trackingNoise - 0.92) * 8.0 * wobbleAmount * 5.0;
  }

  // Chroma shift (VHS color bleeding)
  float shift = u_chromaShift * u_texel.x * 3.0;
  float r = texture(u_texture, vec2(uv.x + shift, uv.y)).r;
  float g = texture(u_texture, uv).g;
  float b = texture(u_texture, vec2(uv.x - shift, uv.y)).b;
  vec3 color = vec3(r, g, b);

  // Scanlines
  float scanline = sin(uv.y / u_texel.y * 3.14159) * 0.5 + 0.5;
  scanline = pow(scanline, 0.8);
  color *= 1.0 - u_scanlineStrength * (1.0 - scanline) * 0.5;

  // Film grain / noise
  float grain = hash(uv * 1000.0 + u_seed) * 2.0 - 1.0;
  color += grain * u_noiseAmount * 0.15;

  // Slight color desaturation (VHS color loss)
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(lum), 0.15);

  // Vignette (darker corners)
  float vignette = 1.0 - length((v_uv - 0.5) * 1.3) * 0.5;
  color *= vignette;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const vhs: Effect = {
  id: "vhs",
  name: "VHS",
  params: [
    { name: "chromaShift", label: "Color Bleed", min: 0, max: 20, default: 8 },
    { name: "scanlines", label: "Scanlines", min: 0, max: 100, default: 50 },
    { name: "noise", label: "Noise", min: 0, max: 100, default: 40 },
    { name: "wobble", label: "Wobble", min: 0, max: 100, default: 30 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_chromaShift: params.chromaShift,
      u_scanlineStrength: params.scanlines / 100,
      u_noiseAmount: params.noise / 100,
      u_wobble: params.wobble / 100,
      u_seed: Math.random(),
    });
  },
};
