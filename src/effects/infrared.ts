import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_contrast;

// Thermal colormap: black → blue → magenta → red → yellow → white
vec3 thermal(float t) {
  t = clamp(t, 0.0, 1.0);

  // 5-stop gradient
  vec3 c0 = vec3(0.0, 0.0, 0.0);     // black
  vec3 c1 = vec3(0.0, 0.0, 0.8);     // blue
  vec3 c2 = vec3(0.8, 0.0, 0.8);     // magenta
  vec3 c3 = vec3(1.0, 0.2, 0.0);     // red-orange
  vec3 c4 = vec3(1.0, 0.85, 0.0);    // yellow
  vec3 c5 = vec3(1.0, 1.0, 1.0);     // white

  if (t < 0.2) return mix(c0, c1, t / 0.2);
  if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
  if (t < 0.6) return mix(c2, c3, (t - 0.4) / 0.2);
  if (t < 0.8) return mix(c3, c4, (t - 0.6) / 0.2);
  return mix(c4, c5, (t - 0.8) / 0.2);
}

void main() {
  vec3 c = texture(u_texture, v_uv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

  // Apply contrast curve
  float contrast = u_contrast;
  lum = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);

  fragColor = vec4(thermal(lum), 1.0);
}`;

export const infrared: Effect = {
  id: "infrared",
  name: "Infrared",
  params: [
    { name: "contrast", label: "Contrast", min: 50, max: 300, default: 150 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_contrast: params.contrast / 100,
    });
  },
};
