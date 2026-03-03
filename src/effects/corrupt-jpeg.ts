import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform vec2 u_resolution;
uniform float u_blockSize;
uniform float u_corruption;
uniform float u_colorShift;
uniform float u_seed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  vec2 pixCoord = uv * u_resolution;
  vec2 block = floor(pixCoord / u_blockSize);

  float blockRand = hash(block + u_seed);
  float blockRand2 = hash2(block + u_seed);

  vec3 color = texture(u_texture, uv).rgb;

  // Decide if this block is corrupted
  bool corrupted = blockRand < u_corruption;

  if (corrupted) {
    // Different corruption types per block
    float type = hash(block * 3.17 + u_seed);

    if (type < 0.25) {
      // Type 1: Offset — sample from a shifted position
      vec2 offset = vec2(
        (hash(block + u_seed + 1.0) - 0.5) * 0.15,
        (hash(block + u_seed + 2.0) - 0.5) * 0.08
      );
      color = texture(u_texture, uv + offset).rgb;

    } else if (type < 0.5) {
      // Type 2: Solid color block — average of block with harsh quantization
      vec2 blockCenter = (block + 0.5) * u_blockSize / u_resolution;
      vec3 avg = texture(u_texture, blockCenter).rgb;
      // Harsh quantize to 3-4 levels
      avg = floor(avg * 3.0 + 0.5) / 3.0;
      color = avg;

    } else if (type < 0.7) {
      // Type 3: Horizontal smear — repeat a single column across the block
      float smearX = (block.x + hash(block + u_seed + 5.0)) * u_blockSize / u_resolution.x;
      color = texture(u_texture, vec2(smearX, uv.y)).rgb;

    } else if (type < 0.85) {
      // Type 4: Color channel corruption
      float r = texture(u_texture, uv + vec2(u_texel.x * 4.0 * blockRand2, 0.0)).r;
      float g = texture(u_texture, uv).g;
      float b = texture(u_texture, uv - vec2(u_texel.x * 3.0 * blockRand, 0.0)).b;
      color = vec3(r, g, b);

    } else {
      // Type 5: Brightness/contrast blast
      float luma = dot(color, vec3(0.333));
      color = mix(color, vec3(luma > 0.5 ? 1.0 : 0.0), 0.7);
    }
  }

  // Global JPEG-like color banding (YCbCr quantization simulation)
  float bandStrength = u_colorShift * 0.02;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  vec2 chroma = vec2(color.r - luma, color.b - luma);
  chroma = floor(chroma / bandStrength + 0.5) * bandStrength;
  color = vec3(
    luma + chroma.x,
    luma - chroma.x * 0.344 - chroma.y * 0.714,
    luma + chroma.y
  );

  // Occasional horizontal line artifacts
  float lineRand = hash(vec2(floor(pixCoord.y / 2.0), u_seed * 7.0));
  if (lineRand > (1.0 - u_corruption * 0.15)) {
    float shift = (hash(vec2(floor(pixCoord.y), u_seed)) - 0.5) * 0.05;
    color = texture(u_texture, vec2(uv.x + shift, uv.y)).rgb;
    color = floor(color * 4.0 + 0.5) / 4.0;
  }

  // Block grid lines (subtle)
  vec2 blockFract = fract(pixCoord / u_blockSize);
  float gridLine = step(blockFract.x, u_texel.x * u_blockSize * 0.15) +
                   step(blockFract.y, u_texel.y * u_blockSize * 0.15);
  if (corrupted) {
    color = mix(color, color * 0.7, gridLine * 0.5);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const corruptJpeg: Effect = {
  id: "corrupt-jpeg",
  name: "Corrupt JPEG",
  params: [
    { name: "blockSize", label: "Block Size", min: 4, max: 32, default: 12 },
    { name: "corruption", label: "Corruption", min: 5, max: 100, default: 35 },
    { name: "colorShift", label: "Color Banding", min: 1, max: 50, default: 15 },
    { name: "seed", label: "Seed", min: 1, max: 999, default: 42 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_resolution: [source.width, source.height] as [number, number],
      u_blockSize: params.blockSize,
      u_corruption: params.corruption / 100,
      u_colorShift: params.colorShift,
      u_seed: params.seed,
    });
  },
};
