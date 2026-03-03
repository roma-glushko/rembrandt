import type { Effect } from "./index";
import { renderMultiPass, type RenderPass } from "./gl";

// Pass 1: Kuwahara filter — edge-preserving smoothing that creates
// the characteristic flat color regions of watercolor paint.
// Divides neighborhood into 4 quadrants, picks the one with lowest variance.
const KUWAHARA_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_radius;

void main() {
  int rad = int(u_radius);

  // 4 quadrant accumulators: mean + squared mean for variance
  vec3 mean[4];
  vec3 sqMean[4];
  float count[4];

  for (int i = 0; i < 4; i++) {
    mean[i] = vec3(0.0);
    sqMean[i] = vec3(0.0);
    count[i] = 0.0;
  }

  for (int dy = -rad; dy <= rad; dy++) {
    for (int dx = -rad; dx <= rad; dx++) {
      vec3 c = texture(u_texture, v_uv + vec2(float(dx), float(dy)) * u_texel).rgb;

      // Assign to quadrant(s)
      // Q0: top-left, Q1: top-right, Q2: bottom-left, Q3: bottom-right
      if (dx <= 0 && dy <= 0) { mean[0] += c; sqMean[0] += c*c; count[0] += 1.0; }
      if (dx >= 0 && dy <= 0) { mean[1] += c; sqMean[1] += c*c; count[1] += 1.0; }
      if (dx <= 0 && dy >= 0) { mean[2] += c; sqMean[2] += c*c; count[2] += 1.0; }
      if (dx >= 0 && dy >= 0) { mean[3] += c; sqMean[3] += c*c; count[3] += 1.0; }
    }
  }

  // Pick quadrant with lowest variance
  float minVar = 1e10;
  vec3 result = vec3(0.0);

  for (int i = 0; i < 4; i++) {
    mean[i] /= count[i];
    sqMean[i] /= count[i];
    vec3 variance = sqMean[i] - mean[i] * mean[i];
    float totalVar = dot(variance, vec3(1.0));

    if (totalVar < minVar) {
      minVar = totalVar;
      result = mean[i];
    }
  }

  fragColor = vec4(result, 1.0);
}`;

// Pass 2: Wet edge simulation — pigment pools at edges where
// color transitions happen, creating darker concentrated lines.
// Also adds subtle paper texture noise for organic feel.
const WET_EDGE_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_edgeStrength;
uniform float u_paperGrain;
uniform float u_pastel;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Multi-octave noise for paper texture
float paperNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * paperNoise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 center = texture(u_texture, v_uv).rgb;

  // Detect color boundaries using local color difference
  float edgeAccum = 0.0;
  vec3 colorAccum = vec3(0.0);
  float samples = 0.0;

  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec3 neighbor = texture(u_texture, v_uv + vec2(float(dx), float(dy)) * u_texel).rgb;
      float diff = length(neighbor - center);
      edgeAccum += diff;
      colorAccum += neighbor;
      samples += 1.0;
    }
  }

  float edge = edgeAccum / samples;
  vec3 avgColor = colorAccum / samples;

  // Wet edge: darken and desaturate at color boundaries
  // Simulates pigment pooling where water meets dry paper
  float pigmentPool = smoothstep(0.02, 0.12, edge) * u_edgeStrength;
  float luma = dot(center, vec3(0.299, 0.587, 0.114));
  vec3 poolColor = center * (0.55 + luma * 0.2); // darker, slightly warm
  vec3 result = mix(center, poolColor, pigmentPool);

  // Slight color bleed toward average at edges (wet diffusion)
  result = mix(result, avgColor, pigmentPool * 0.2);

  // Paper texture — subtle grain that affects paint absorption
  vec2 paperCoord = v_uv / u_texel * 0.15; // scale to pixel space
  float grain = fbm(paperCoord);
  float grainEffect = (grain - 0.5) * u_paperGrain;

  // Paper absorbs more paint in some areas (darker) and less in others
  result += grainEffect * 0.15;

  // Pastel: desaturate + push toward white for chalky watercolor tones
  float resultLuma = dot(result, vec3(0.299, 0.587, 0.114));
  float desat = 0.85 + (1.0 - pigmentPool) * 0.15;
  desat = mix(desat, 0.45, u_pastel); // reduce saturation with pastel
  result = mix(vec3(resultLuma), result, desat);

  // Lighten — watercolors are translucent, more so with pastel
  float lighten = 0.06 + u_pastel * 0.22;
  result = mix(result, vec3(1.0), lighten);

  fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;

// Pass 3: Soft edge darkening with feathered ink lines
const EDGE_INK_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_inkStrength;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec3 center = texture(u_texture, v_uv).rgb;

  if (u_inkStrength < 0.01) {
    fragColor = vec4(center, 1.0);
    return;
  }

  // Soft Sobel for gentle ink outlines
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

  // Soft feathered edge rather than harsh line
  float ink = smoothstep(0.05, 0.2, mag) * u_inkStrength;

  // Darken with a warm-ish tint (sepia-ish ink)
  vec3 inkColor = center * vec3(0.35, 0.30, 0.25);
  vec3 result = mix(center, inkColor, ink);

  fragColor = vec4(result, 1.0);
}`;

export const watercolor: Effect = {
  id: "watercolor",
  name: "Watercolor",
  params: [
    { name: "smoothing", label: "Smoothing", min: 2, max: 8, default: 4 },
    { name: "wetEdge", label: "Wet Edges", min: 0, max: 100, default: 60 },
    { name: "paper", label: "Paper Grain", min: 0, max: 100, default: 40 },
    { name: "pastel", label: "Pastel", min: 0, max: 100, default: 45 },
    { name: "ink", label: "Ink Lines", min: 0, max: 100, default: 25 },
  ],
  apply(source, dest, params) {
    const texel: [number, number] = [1 / source.width, 1 / source.height];

    const passes: RenderPass[] = [
      // Kuwahara filter (run twice for stronger effect)
      {
        fragmentSrc: KUWAHARA_SHADER,
        uniforms: { u_texel: texel, u_radius: params.smoothing },
      },
      {
        fragmentSrc: KUWAHARA_SHADER,
        uniforms: { u_texel: texel, u_radius: Math.max(2, params.smoothing - 1) },
      },
      // Wet edge simulation + paper texture
      {
        fragmentSrc: WET_EDGE_SHADER,
        uniforms: {
          u_texel: texel,
          u_edgeStrength: params.wetEdge / 100,
          u_paperGrain: params.paper / 100,
          u_pastel: params.pastel / 100,
        },
      },
      // Soft ink outlines
      {
        fragmentSrc: EDGE_INK_SHADER,
        uniforms: {
          u_texel: texel,
          u_inkStrength: params.ink / 100,
        },
      },
    ];

    renderMultiPass(source, dest, passes);
  },
};
