// Drawing the pattern through the mesh with WebGL. The table is cut into
// small triangles (calc/mesh.ts); each vertex knows where it sits on the
// screen and which table point it is. The fragment shader turns the table
// point into a page point through the placement and looks the pixel up in the
// page picture, so moving or turning the pattern never rebuilds geometry and
// a bent mesh bends the picture with it.

import type { Mat3 } from './calc/homography';
import type { Triangles } from './calc/mesh';

const VERT = `#version 300 es
in vec2 aScreen;
in vec2 aTable;
uniform vec2 uViewport;
out vec2 vTable;
void main() {
  vTable = aTable;
  vec2 clip = aScreen / uViewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vTable;
uniform mat3 uTableToPage;
uniform vec2 uPageSize;
uniform sampler2D uPage;
uniform vec2 uTexel;
uniform int uWeight;
uniform bool uInvert;
uniform bool uHasPage;
out vec4 outColor;
void main() {
  if (!uHasPage) discard;
  vec3 p = uTableToPage * vec3(vTable, 1.0);
  vec2 uv = p.xy / uPageSize;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  vec3 c = texture(uPage, uv).rgb;
  // Line weight: the darkest of the neighbouring texels thickens the lines.
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      if (abs(dx) > uWeight || abs(dy) > uWeight || (dx == 0 && dy == 0)) continue;
      c = min(c, texture(uPage, uv + vec2(float(dx), float(dy)) * uTexel).rgb);
    }
  }
  if (uInvert) c = 1.0 - c;
  outColor = vec4(c, 1.0);
}`;

export interface DrawOptions {
  /** False clears the canvas and draws nothing (calibrating, or no page yet). */
  show: boolean;
  tableToPage: Mat3;
  pageSize: { width: number; height: number };
  invert: boolean;
  /** 0–2: how many texels to spread dark lines by. */
  weight: number;
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private screenBuf: WebGLBuffer;
  private tableBuf: WebGLBuffer;
  private indexBuf: WebGLBuffer;
  private texture: WebGLTexture;
  private count = 0;
  private hasPage = false;
  private texel: [number, number] = [0, 0];
  private loc: Record<string, WebGLUniformLocation | null> = {};
  readonly maxTexture: number;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('This browser has no WebGL 2, which Lantern needs to bend the picture');
    this.gl = gl;
    this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'program');
    this.program = program;
    for (const name of ['uViewport', 'uTableToPage', 'uPageSize', 'uPage', 'uTexel', 'uWeight', 'uInvert', 'uHasPage']) this.loc[name] = gl.getUniformLocation(program, name);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.screenBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.screenBuf);
    const aScreen = gl.getAttribLocation(program, 'aScreen');
    gl.enableVertexAttribArray(aScreen);
    gl.vertexAttribPointer(aScreen, 2, gl.FLOAT, false, 0, 0);
    this.tableBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tableBuf);
    const aTable = gl.getAttribLocation(program, 'aTable');
    gl.enableVertexAttribArray(aTable);
    gl.vertexAttribPointer(aTable, 2, gl.FLOAT, false, 0, 0);
    this.indexBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
    gl.bindVertexArray(null);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /** The mesh's triangles, in CSS pixels. */
  setMesh(t: Triangles): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.screenBuf);
    gl.bufferData(gl.ARRAY_BUFFER, t.screen, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tableBuf);
    gl.bufferData(gl.ARRAY_BUFFER, t.table, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, t.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.count = t.indices.length;
  }

  /** The page picture; null clears it. */
  setPage(source: HTMLCanvasElement | null): void {
    const gl = this.gl;
    this.hasPage = !!source;
    if (!source) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.texel = [1 / source.width, 1 / source.height];
  }

  /** Size the drawing buffer to the canvas's CSS size at the device's pixel ratio. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(cssWidth: number, cssHeight: number, o: DrawOptions): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.count || !o.show || !this.hasPage) return;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.loc.uViewport!, cssWidth, cssHeight);
    // GLSL mat3 is column-major; ours is row-major.
    const m = o.tableToPage;
    gl.uniformMatrix3fv(this.loc.uTableToPage!, false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
    gl.uniform2f(this.loc.uPageSize!, o.pageSize.width, o.pageSize.height);
    gl.uniform2f(this.loc.uTexel!, this.texel[0], this.texel[1]);
    gl.uniform1i(this.loc.uWeight!, Math.max(0, Math.min(2, Math.round(o.weight))));
    gl.uniform1i(this.loc.uInvert!, o.invert ? 1 : 0);
    gl.uniform1i(this.loc.uHasPage!, this.hasPage ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.loc.uPage!, 0);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}
