import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_segments;
uniform float u_rotation;

void main() {
  vec2 center = vec2(0.5);
  vec2 p = v_uv - center;

  float angle = atan(p.y, p.x) + u_rotation;
  float r = length(p);

  // Mirror into segment
  float segAngle = 6.28318 / u_segments;
  angle = mod(angle, segAngle);
  if (angle > segAngle * 0.5) {
    angle = segAngle - angle;
  }

  vec2 uv = center + vec2(cos(angle), sin(angle)) * r;
  uv = clamp(uv, 0.0, 1.0);

  fragColor = texture(u_texture, uv);
}`;

export const kaleidoscope: Effect = {
  id: "kaleidoscope",
  name: "Kaleidoscope",
  params: [
    { name: "segments", label: "Segments", min: 3, max: 24, default: 8 },
    { name: "rotation", label: "Rotation", min: 0, max: 360, default: 0 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_segments: params.segments,
      u_rotation: (params.rotation * Math.PI) / 180,
    });
  },
};
