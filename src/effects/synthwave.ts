import type { Effect } from "./index";
import { renderMultiPass, type RenderPass } from "./gl";

// Pass 1: Edge detection → neon lines
const EDGE_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;

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
  float edge = sqrt(gx*gx + gy*gy);

  // Store edge magnitude and original luminance
  vec3 orig = texture(u_texture, v_uv).rgb;
  fragColor = vec4(orig, edge);
}`;

// Pass 2: Composite synthwave look
const COMPOSITE_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_edgeBrightness;
uniform float u_skyBlend;

void main() {
  vec4 data = texture(u_texture, v_uv);
  vec3 orig = data.rgb;
  float edge = data.a;

  float lum = dot(orig, vec3(0.2126, 0.7152, 0.0722));

  // Synthwave gradient: deep purple at top → hot pink → orange at bottom
  vec3 skyTop = vec3(0.08, 0.0, 0.18);
  vec3 skyMid = vec3(0.6, 0.05, 0.4);
  vec3 skyBot = vec3(0.95, 0.3, 0.1);

  vec3 sky;
  if (v_uv.y < 0.5) {
    sky = mix(skyTop, skyMid, v_uv.y * 2.0);
  } else {
    sky = mix(skyMid, skyBot, (v_uv.y - 0.5) * 2.0);
  }

  // Base: dark image tinted with sky gradient
  vec3 base = mix(orig * 0.15, sky * lum, u_skyBlend);

  // Neon edge glow — pink/cyan based on position
  float edgeIntensity = smoothstep(0.08, 0.25, edge) * u_edgeBrightness;
  vec3 edgeColor = mix(
    vec3(1.0, 0.1, 0.6),  // hot pink
    vec3(0.1, 0.9, 1.0),  // cyan
    v_uv.y
  );

  vec3 color = base + edgeColor * edgeIntensity;

  // Subtle scanlines
  float scanline = 1.0 - sin(v_uv.y * 800.0) * 0.04;
  color *= scanline;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const synthwave: Effect = {
  id: "synthwave",
  name: "Synthwave",
  params: [
    { name: "edgeBrightness", label: "Neon Intensity", min: 0, max: 100, default: 60 },
    { name: "skyBlend", label: "Sky Blend", min: 0, max: 100, default: 50 },
  ],
  apply(source, dest, params) {
    const texel: [number, number] = [1 / source.width, 1 / source.height];

    const passes: RenderPass[] = [
      {
        fragmentSrc: EDGE_SHADER,
        uniforms: { u_texel: texel },
      },
      {
        fragmentSrc: COMPOSITE_SHADER,
        uniforms: {
          u_edgeBrightness: params.edgeBrightness / 100 * 2.0,
          u_skyBlend: params.skyBlend / 100,
        },
      },
    ];

    renderMultiPass(source, dest, passes);
  },
};
