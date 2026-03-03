import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_hue1;
uniform float u_hue2;
uniform float u_contrast;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  vec3 c = texture(u_texture, v_uv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));

  // Apply contrast
  luma = clamp((luma - 0.5) * u_contrast + 0.5, 0.0, 1.0);

  vec3 dark = hsl2rgb(u_hue1 / 360.0, 0.85, 0.15);
  vec3 light = hsl2rgb(u_hue2 / 360.0, 0.8, 0.7);

  vec3 result = mix(dark, light, luma);

  fragColor = vec4(result, 1.0);
}`;

export const duotone: Effect = {
  id: "duotone",
  name: "Duotone",
  params: [
    { name: "hue1", label: "Dark Hue", min: 0, max: 360, default: 240 },
    { name: "hue2", label: "Light Hue", min: 0, max: 360, default: 30 },
    { name: "contrast", label: "Contrast", min: 50, max: 300, default: 130 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_hue1: params.hue1,
      u_hue2: params.hue2,
      u_contrast: params.contrast / 100,
    });
  },
};
