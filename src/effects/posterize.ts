import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_levels;

void main() {
  vec4 c = texture(u_texture, v_uv);
  float levels = max(u_levels, 2.0);
  vec3 q = floor(c.rgb * levels + 0.5) / levels;
  fragColor = vec4(q, c.a);
}`;

export const posterize: Effect = {
  id: "posterize",
  name: "Posterize",
  params: [
    { name: "levels", label: "Levels", min: 2, max: 32, default: 5 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_levels: params.levels,
    });
  },
};
