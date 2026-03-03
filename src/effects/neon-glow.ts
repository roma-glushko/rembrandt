import type { Effect } from "./index";
import { renderMultiPass, type RenderPass } from "./gl";

// Pass 1: Sobel edge detection → neon-colored edges on black
const EDGE_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_threshold;
uniform float u_hue;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

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

  float edge = smoothstep(u_threshold / 255.0, (u_threshold + 40.0) / 255.0, mag);

  // Color based on edge direction + base hue
  float angle = atan(gy, gx);
  float h = fract(u_hue / 360.0 + angle / 6.28318);
  vec3 neon = hsl2rgb(h, 1.0, 0.55) * edge;

  fragColor = vec4(neon, 1.0);
}`;

// Pass 2: Additive blur glow
const GLOW_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_glowRadius;

void main() {
  vec3 sum = vec3(0.0);
  float total = 0.0;
  int rad = int(u_glowRadius);

  for (int dy = -rad; dy <= rad; dy++) {
    for (int dx = -rad; dx <= rad; dx++) {
      float dist = length(vec2(float(dx), float(dy)));
      float weight = exp(-dist * dist / (u_glowRadius * u_glowRadius * 0.5));
      sum += texture(u_texture, v_uv + vec2(float(dx), float(dy)) * u_texel).rgb * weight;
      total += weight;
    }
  }

  vec3 blurred = sum / total;
  vec3 original = texture(u_texture, v_uv).rgb;

  // Additive blend: sharp edges + soft glow
  fragColor = vec4(clamp(original + blurred * 0.8, 0.0, 1.0), 1.0);
}`;

export const neonGlow: Effect = {
  id: "neon-glow",
  name: "Neon Glow",
  params: [
    { name: "threshold", label: "Edge Threshold", min: 5, max: 200, default: 30 },
    { name: "hue", label: "Hue", min: 0, max: 360, default: 180 },
    { name: "glow", label: "Glow Radius", min: 1, max: 8, default: 4 },
  ],
  apply(source, dest, params) {
    const texel: [number, number] = [1 / source.width, 1 / source.height];

    const passes: RenderPass[] = [
      {
        fragmentSrc: EDGE_SHADER,
        uniforms: {
          u_texel: texel,
          u_threshold: params.threshold,
          u_hue: params.hue,
        },
      },
      {
        fragmentSrc: GLOW_SHADER,
        uniforms: {
          u_texel: texel,
          u_glowRadius: params.glow,
        },
      },
    ];

    renderMultiPass(source, dest, passes);
  },
};
