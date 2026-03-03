import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_focusY;
uniform float u_focusWidth;
uniform float u_blurAmount;

void main() {
  // Distance from the focus band
  float dist = abs(v_uv.y - u_focusY);
  float focusHalf = u_focusWidth * 0.5;
  float blur = smoothstep(focusHalf, focusHalf + 0.15, dist) * u_blurAmount;

  int radius = int(blur * 8.0);

  if (radius == 0) {
    fragColor = texture(u_texture, v_uv);
    return;
  }

  vec3 sum = vec3(0.0);
  float total = 0.0;

  for (int dy = -radius; dy <= radius; dy++) {
    for (int dx = -radius; dx <= radius; dx++) {
      float d = length(vec2(float(dx), float(dy)));
      if (d > float(radius)) continue;
      float w = 1.0 - d / float(radius + 1);
      sum += texture(u_texture, v_uv + vec2(float(dx), float(dy)) * u_texel).rgb * w;
      total += w;
    }
  }

  vec3 blurred = sum / total;

  // Slight saturation boost for miniature look
  float luma = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
  vec3 saturated = mix(vec3(luma), blurred, 1.3);

  fragColor = vec4(clamp(saturated, 0.0, 1.0), 1.0);
}`;

export const tiltShift: Effect = {
  id: "tilt-shift",
  name: "Tilt Shift",
  params: [
    { name: "focusY", label: "Focus Position", min: 10, max: 90, default: 50 },
    { name: "focusWidth", label: "Focus Width", min: 5, max: 50, default: 20 },
    { name: "blurAmount", label: "Blur Amount", min: 10, max: 100, default: 60 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_focusY: params.focusY / 100,
      u_focusWidth: params.focusWidth / 100,
      u_blurAmount: params.blurAmount / 100,
    });
  },
};
