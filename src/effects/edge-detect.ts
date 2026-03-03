import type { Effect } from "./index";
import { renderEffect } from "./gl";

const SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_threshold;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  float tl = luma(texture(u_texture, v_uv + vec2(-u_texel.x, -u_texel.y)).rgb);
  float t  = luma(texture(u_texture, v_uv + vec2( 0.0,       -u_texel.y)).rgb);
  float tr = luma(texture(u_texture, v_uv + vec2( u_texel.x, -u_texel.y)).rgb);
  float l  = luma(texture(u_texture, v_uv + vec2(-u_texel.x,  0.0)).rgb);
  float r  = luma(texture(u_texture, v_uv + vec2( u_texel.x,  0.0)).rgb);
  float bl = luma(texture(u_texture, v_uv + vec2(-u_texel.x,  u_texel.y)).rgb);
  float b  = luma(texture(u_texture, v_uv + vec2( 0.0,        u_texel.y)).rgb);
  float br = luma(texture(u_texture, v_uv + vec2( u_texel.x,  u_texel.y)).rgb);

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float mag = sqrt(gx*gx + gy*gy);

  float val = mag > u_threshold / 255.0 ? 1.0 : 0.0;
  fragColor = vec4(vec3(val), 1.0);
}`;

export const edgeDetect: Effect = {
  id: "edge-detect",
  name: "Edge Detect",
  params: [
    { name: "threshold", label: "Threshold", min: 0, max: 255, default: 30 },
  ],
  apply(source, dest, params) {
    renderEffect(source, dest, SHADER, {
      u_texel: [1 / source.width, 1 / source.height] as [number, number],
      u_threshold: params.threshold,
    });
  },
};
