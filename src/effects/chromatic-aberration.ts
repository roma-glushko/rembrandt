import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_strength;
uniform float u_falloff;

void main() {
  vec2 center = vec2(0.5);
  vec2 dir = v_uv - center;
  float dist = length(dir);

  // Strength increases toward edges
  float amount = pow(dist, u_falloff) * u_strength * 0.02;
  vec2 offset = dir * amount;

  float r = texture(u_texture, v_uv + offset).r;
  float g = texture(u_texture, v_uv).g;
  float b = texture(u_texture, v_uv - offset).b;

  fragColor = vec4(r, g, b, 1.0);
}`;

export const chromaticAberration: Effect = {
  id: "chromatic-aberration",
  name: "Chromatic Aberration",
  params: [
    { name: "strength", label: "Strength", min: 1, max: 100, default: 40 },
    { name: "falloff", label: "Falloff", min: 10, max: 40, default: 20 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_strength: params.strength,
      u_falloff: params.falloff / 10,
    });
  },
};
