import type { Effect } from "./index";
import { renderMultiPass, type RenderPass } from "./gl";

// Pass 1: Edge detection with luminance preservation
const EDGE_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_sensitivity;

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

  float edge = smoothstep(0.02, 0.02 + u_sensitivity * 0.3, mag);
  fragColor = vec4(vec3(edge), 1.0);
}`;

// Pass 2: Stylize as glowing wireframe lines
const GLOW_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_hue;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  float edge = texture(u_texture, v_uv).r;

  // Soft glow by sampling neighbors
  float glow = 0.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      float w = 1.0 / (1.0 + float(dx*dx + dy*dy));
      glow += texture(u_texture, v_uv + vec2(float(dx), float(dy)) * u_texel * 1.5).r * w;
    }
  }
  glow /= 4.0;

  vec3 wireColor = hsl2rgb(u_hue / 360.0, 0.9, 0.6);
  vec3 glowColor = hsl2rgb(u_hue / 360.0, 0.7, 0.35);

  vec3 color = wireColor * edge + glowColor * glow * 0.5;

  // Subtle grid
  vec2 grid = abs(fract(v_uv * 80.0) - 0.5);
  float gridLine = 1.0 - smoothstep(0.45, 0.5, min(grid.x, grid.y));
  color += wireColor * gridLine * 0.03;

  fragColor = vec4(color, 1.0);
}`;

export const wireframe: Effect = {
  id: "wireframe",
  name: "Wireframe",
  params: [
    { name: "sensitivity", label: "Sensitivity", min: 1, max: 100, default: 30 },
    { name: "hue", label: "Hue", min: 0, max: 360, default: 140 },
  ],
  apply(source, dest, params) {
    const texel: [number, number] = [1 / source.width, 1 / source.height];

    const passes: RenderPass[] = [
      {
        fragmentSrc: EDGE_SHADER,
        uniforms: {
          u_texel: texel,
          u_sensitivity: params.sensitivity / 100,
        },
      },
      {
        fragmentSrc: GLOW_SHADER,
        uniforms: {
          u_texel: texel,
          u_hue: params.hue,
        },
      },
    ];

    renderMultiPass(source, dest, passes);
  },
};
