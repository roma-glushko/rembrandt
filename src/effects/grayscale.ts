import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_strength;

void main() {
  vec4 c = texture(u_texture, v_uv);
  float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  fragColor = vec4(mix(c.rgb, vec3(luma), u_strength), c.a);
}`;

export const grayscale: Effect = {
  id: "grayscale",
  name: "Grayscale",
  params: [
    { name: "strength", label: "Strength", min: 0, max: 100, default: 100 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_strength: params.strength / 100,
    });
  },
};
