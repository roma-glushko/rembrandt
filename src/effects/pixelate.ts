import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_blockSize;

void main() {
  vec2 blockUV = u_blockSize / u_resolution;
  vec2 snapped = floor(v_uv / blockUV + 0.5) * blockUV;
  fragColor = texture(u_texture, snapped);
}`;

export const pixelate: Effect = {
  id: "pixelate",
  name: "Pixelate",
  params: [
    { name: "blockSize", label: "Block Size", min: 2, max: 64, default: 12 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_resolution: [source.width, source.height] as [number, number],
      u_blockSize: params.blockSize,
    });
  },
};
