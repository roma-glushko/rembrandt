import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_strength;

void main() {
  vec3 tl = texture(u_texture, v_uv + vec2(-u_texel.x, -u_texel.y)).rgb;
  vec3 br = texture(u_texture, v_uv + vec2( u_texel.x,  u_texel.y)).rgb;
  vec3 val = vec3(0.5) + (br - tl) * u_strength;
  fragColor = vec4(clamp(val, 0.0, 1.0), 1.0);
}`;

export const emboss: Effect = {
  id: "emboss",
  name: "Emboss",
  params: [
    { name: "strength", label: "Strength", min: 1, max: 10, default: 2 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_strength: params.strength,
    });
  },
};
