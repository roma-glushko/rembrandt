import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_angle;
uniform float u_radius;

void main() {
  vec2 center = vec2(0.5);
  vec2 delta = v_uv - center;
  float dist = length(delta);

  float maxRadius = u_radius * 0.5;
  float t = 1.0 - smoothstep(0.0, maxRadius, dist);
  float twist = u_angle * t * t;

  float s = sin(twist);
  float c = cos(twist);
  vec2 rotated = vec2(
    delta.x * c - delta.y * s,
    delta.x * s + delta.y * c
  );

  vec2 uv = center + rotated;
  uv = clamp(uv, 0.0, 1.0);

  fragColor = texture(u_texture, uv);
}`;

export const swirl: Effect = {
  id: "swirl",
  name: "Swirl",
  params: [
    { name: "angle", label: "Twist", min: -20, max: 20, default: 8 },
    { name: "radius", label: "Radius", min: 10, max: 100, default: 80 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_angle: params.angle,
      u_radius: params.radius / 100,
    });
  },
};
