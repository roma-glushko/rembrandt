import type { Effect } from "./index";
import { renderMultiPass, type RenderPass } from "./gl";

// Pass 1-3: Box blur (repeated 3x approximates gaussian for soft paint bleed)
const BLUR_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_radius;

void main() {
  int rad = int(u_radius);
  vec3 sum = vec3(0.0);
  float count = 0.0;

  for (int dy = -rad; dy <= rad; dy++) {
    for (int dx = -rad; dx <= rad; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * u_texel;
      sum += texture(u_texture, v_uv + offset).rgb;
      count += 1.0;
    }
  }

  fragColor = vec4(sum / count, 1.0);
}`;

// Final pass: quantize colors + Sobel edge darkening
const FINAL_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_levels;
uniform float u_edgeStrength;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 c = texture(u_texture, v_uv);

  // Quantize
  float levels = max(u_levels, 2.0);
  vec3 q = floor(c.rgb * levels + 0.5) / levels;

  // Sobel edge detection on the blurred image
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

  float edgeDarken = 1.0 - min(mag * 2.0, 1.0) * u_edgeStrength;

  fragColor = vec4(q * edgeDarken, 1.0);
}`;

export const watercolor: Effect = {
  id: "watercolor",
  name: "Watercolor",
  params: [
    { name: "blur", label: "Softness", min: 1, max: 10, default: 4 },
    { name: "levels", label: "Color Levels", min: 3, max: 24, default: 8 },
    { name: "edges", label: "Edge Ink", min: 0, max: 100, default: 40 },
  ],
  apply(source, dest, params) {
    const texel: [number, number] = [1 / source.width, 1 / source.height];

    const blurPass = (radius: number): RenderPass => ({
      fragmentSrc: BLUR_SHADER,
      uniforms: {
        u_texel: texel,
        u_radius: radius,
      },
    });

    // 3 blur passes with decreasing radius for smooth falloff
    const r = params.blur;
    const passes: RenderPass[] = [
      blurPass(r),
      blurPass(r),
      blurPass(Math.max(1, Math.round(r / 2))),
      {
        fragmentSrc: FINAL_SHADER,
        uniforms: {
          u_texel: texel,
          u_levels: params.levels,
          u_edgeStrength: params.edges / 100,
        },
      },
    ];

    renderMultiPass(source, dest, passes);
  },
};
