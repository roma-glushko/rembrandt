const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

let glCanvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;
let quadVAO: WebGLVertexArrayObject | null = null;

const programCache = new Map<string, WebGLProgram>();

function getGL(): WebGL2RenderingContext {
  if (gl) return gl;

  glCanvas = document.createElement("canvas");
  gl = glCanvas.getContext("webgl2", { preserveDrawingBuffer: true })!;
  if (!gl) throw new Error("WebGL2 not supported");

  // Create fullscreen quad VAO
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  quadVAO = vao;
  return gl;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function getProgram(fragmentSrc: string): WebGLProgram {
  const cached = programCache.get(fragmentSrc);
  if (cached) return cached;

  const ctx = getGL();
  const vs = compileShader(ctx, ctx.VERTEX_SHADER, VERTEX_SRC);
  const fs = compileShader(ctx, ctx.FRAGMENT_SHADER, fragmentSrc);

  const program = ctx.createProgram()!;
  ctx.attachShader(program, vs);
  ctx.attachShader(program, fs);
  ctx.bindAttribLocation(program, 0, "a_position");
  ctx.linkProgram(program);

  if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
    const log = ctx.getProgramInfoLog(program);
    ctx.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }

  ctx.deleteShader(vs);
  ctx.deleteShader(fs);
  programCache.set(fragmentSrc, program);
  return program;
}

function uploadTexture(
  gl: WebGL2RenderingContext,
  source: TexImageSource,
  unit: number,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return tex;
}

function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, number | [number, number]>,
): void {
  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (loc === null) continue;
    if (Array.isArray(value)) {
      gl.uniform2f(loc, value[0], value[1]);
    } else {
      gl.uniform1f(loc, value);
    }
  }
}

/** Copy the GL canvas to a 2D canvas, flipping Y to correct for
 *  WebGL's bottom-left origin vs canvas 2D's top-left origin. */
function copyToDest(dest: HTMLCanvasElement, width: number, height: number): void {
  dest.width = width;
  dest.height = height;
  const ctx2d = dest.getContext("2d")!;
  ctx2d.save();
  ctx2d.translate(0, height);
  ctx2d.scale(1, -1);
  ctx2d.drawImage(glCanvas!, 0, 0);
  ctx2d.restore();
}

export function renderEffect(
  source: HTMLCanvasElement,
  dest: HTMLCanvasElement,
  fragmentSrc: string,
  uniforms: Record<string, number | [number, number]>,
): void {
  const ctx = getGL();
  const width = source.width;
  const height = source.height;

  glCanvas!.width = width;
  glCanvas!.height = height;
  ctx.viewport(0, 0, width, height);

  const program = getProgram(fragmentSrc);
  ctx.useProgram(program);

  const tex = uploadTexture(ctx, source, 0);
  const texLoc = ctx.getUniformLocation(program, "u_texture");
  if (texLoc !== null) ctx.uniform1i(texLoc, 0);

  setUniforms(ctx, program, uniforms);

  ctx.bindVertexArray(quadVAO);
  ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);

  copyToDest(dest, width, height);
  ctx.deleteTexture(tex);
}

export type RenderPass = {
  fragmentSrc: string;
  uniforms: Record<string, number | [number, number]>;
};

export function renderMultiPass(
  source: HTMLCanvasElement,
  dest: HTMLCanvasElement,
  passes: RenderPass[],
): void {
  const ctx = getGL();
  const width = source.width;
  const height = source.height;

  glCanvas!.width = width;
  glCanvas!.height = height;
  ctx.viewport(0, 0, width, height);

  // Create two FBOs for ping-pong
  const fbos: { fbo: WebGLFramebuffer; tex: WebGLTexture }[] = [];
  for (let i = 0; i < 2; i++) {
    const tex = ctx.createTexture()!;
    ctx.activeTexture(ctx.TEXTURE0 + 2 + i);
    ctx.bindTexture(ctx.TEXTURE_2D, tex);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      width,
      height,
      0,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      null,
    );

    const fbo = ctx.createFramebuffer()!;
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fbo);
    ctx.framebufferTexture2D(
      ctx.FRAMEBUFFER,
      ctx.COLOR_ATTACHMENT0,
      ctx.TEXTURE_2D,
      tex,
      0,
    );
    fbos.push({ fbo, tex });
  }

  // Upload source image as texture unit 0
  const srcTex = uploadTexture(ctx, source, 0);

  ctx.bindVertexArray(quadVAO);

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    const program = getProgram(pass.fragmentSrc);
    ctx.useProgram(program);

    // Input: source texture for first pass, previous FBO's texture for subsequent
    const inputUnit = i === 0 ? 0 : 2 + ((i - 1) % 2);
    const texLoc = ctx.getUniformLocation(program, "u_texture");
    if (texLoc !== null) ctx.uniform1i(texLoc, inputUnit);

    setUniforms(ctx, program, pass.uniforms);

    const isLast = i === passes.length - 1;
    if (isLast) {
      // Render to screen (the glCanvas)
      ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
    } else {
      // Render to FBO
      const target = fbos[i % 2];
      ctx.bindFramebuffer(ctx.FRAMEBUFFER, target.fbo);
      // Bind output texture to its unit so next pass can read it
      ctx.activeTexture(ctx.TEXTURE0 + 2 + (i % 2));
      ctx.bindTexture(ctx.TEXTURE_2D, target.tex);
    }

    ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
  }

  copyToDest(dest, width, height);

  // Cleanup
  ctx.deleteTexture(srcTex);
  for (const { fbo, tex } of fbos) {
    ctx.deleteFramebuffer(fbo);
    ctx.deleteTexture(tex);
  }
}
