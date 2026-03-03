import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dotSize;
uniform float u_colorMode;

void main() {
  vec2 pixelCoord = v_uv * u_resolution;
  vec2 cell = floor(pixelCoord / u_dotSize) * u_dotSize + u_dotSize * 0.5;
  vec2 cellUV = cell / u_resolution;

  vec3 color = texture(u_texture, cellUV).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Distance from center of cell
  float dist = length(pixelCoord - cell) / (u_dotSize * 0.5);

  // Dot radius based on brightness
  float dotRadius = sqrt(1.0 - luma) * 1.1;
  float dot = 1.0 - smoothstep(dotRadius - 0.05, dotRadius + 0.05, dist);

  vec3 result;
  if (u_colorMode > 0.5) {
    // Color mode: colored dots on dark background
    result = color * dot;
  } else {
    // Classic: black dots on white
    result = vec3(1.0 - dot);
  }

  fragColor = vec4(result, 1.0);
}`;

export const halftone: Effect = {
  id: "halftone",
  name: "Halftone",
  params: [
    { name: "dotSize", label: "Dot Size", min: 3, max: 20, default: 8 },
    { name: "colorMode", label: "Color (1) / BW (0)", min: 0, max: 1, default: 1 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_resolution: [source.width, source.height] as [number, number],
      u_dotSize: params.dotSize,
      u_colorMode: params.colorMode,
    });
  },
};
