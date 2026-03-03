import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_cellSize;
uniform float u_speed;
uniform float u_seed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Simple "character" pattern using hash-based block patterns
float charPattern(vec2 uv, float charId) {
  vec2 grid = floor(uv * 5.0);
  return step(0.5, hash(grid + charId * 17.31));
}

void main() {
  vec2 pixCoord = v_uv * u_resolution;
  vec2 cell = floor(pixCoord / u_cellSize);
  vec2 cellUV = fract(pixCoord / u_cellSize);

  // Sample image luminance for this cell
  vec2 sampleUV = (cell * u_cellSize + u_cellSize * 0.5) / u_resolution;
  vec3 color = texture(u_texture, sampleUV).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Rain effect — columns fall at different speeds
  float columnSpeed = hash(vec2(cell.x, 0.0)) * 0.5 + 0.5;
  float rain = fract(cell.y * 0.05 - u_seed * columnSpeed * u_speed);

  // Character pattern
  float charId = hash(cell + floor(u_seed * columnSpeed * 3.0));
  float pattern = charPattern(cellUV, charId);

  // Brightness based on image luminance and rain position
  float brightness = luma * pattern;

  // Leading bright character
  float lead = smoothstep(0.0, 0.05, rain) * smoothstep(0.12, 0.05, rain);

  // Trail fade
  float trail = smoothstep(0.6, 0.0, rain) * 0.8;

  float intensity = brightness * (trail + lead * 2.0);

  // Green tint with bright white leads
  vec3 greenDark = vec3(0.0, 0.15, 0.0);
  vec3 greenBright = vec3(0.1, 0.9, 0.2);
  vec3 white = vec3(0.7, 1.0, 0.8);

  vec3 result = mix(greenDark, greenBright, intensity);
  result = mix(result, white, lead * brightness * 0.8);

  fragColor = vec4(result, 1.0);
}`;

export const matrix: Effect = {
  id: "matrix",
  name: "Matrix Rain",
  params: [
    { name: "cellSize", label: "Cell Size", min: 4, max: 20, default: 10 },
    { name: "speed", label: "Speed", min: 1, max: 100, default: 50 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_resolution: [source.width, source.height] as [number, number],
      u_cellSize: params.cellSize,
      u_speed: params.speed / 100,
      u_seed: Math.random() * 100,
    });
  },
};
