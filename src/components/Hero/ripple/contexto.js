/*
 * Contexto WebGL e formato de textura da simulação.
 *
 * A água precisa de textura de ponto flutuante na qual dê para desenhar
 * (render target). WebGL2: RGBA32F/RGBA16F com EXT_color_buffer_float (ou
 * _half_float). WebGL1: OES_texture_float / OES_texture_half_float, como no
 * jquery.ripples. Sem nenhum desses, não há efeito (devolve null).
 */

const ATRIBUTOS = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

// Confere se o formato aceita ser alvo de desenho (framebuffer completo).
function renderizavel(gl, formato) {
  const textura = gl.createTexture();
  const quadro = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, formato.interno, 4, 4, 0, gl.RGBA, formato.tipo, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, quadro);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textura, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(quadro);
  gl.deleteTexture(textura);
  return ok;
}

function candidatosWebgl2(gl) {
  const float = gl.getExtension('EXT_color_buffer_float');
  const meio = float || gl.getExtension('EXT_color_buffer_half_float');
  const floatLinear = gl.getExtension('OES_texture_float_linear');
  const f32 = (linear) => ({ interno: gl.RGBA32F, tipo: gl.FLOAT, linear });
  const f16 = { interno: gl.RGBA16F, tipo: gl.HALF_FLOAT, linear: true };
  return [
    float && floatLinear && f32(true),
    meio && f16,
    float && f32(false),
  ].filter(Boolean);
}

function candidatosWebgl1(gl) {
  const lista = [];
  if (gl.getExtension('OES_texture_float')) {
    gl.getExtension('WEBGL_color_buffer_float');
    const linear = Boolean(gl.getExtension('OES_texture_float_linear'));
    lista.push({ interno: gl.RGBA, tipo: gl.FLOAT, linear });
  }
  const meio = gl.getExtension('OES_texture_half_float');
  if (meio) {
    gl.getExtension('EXT_color_buffer_half_float');
    const linear = Boolean(gl.getExtension('OES_texture_half_float_linear'));
    lista.push({ interno: gl.RGBA, tipo: meio.HALF_FLOAT_OES, linear });
  }
  return lista;
}

/*
 * Um canvas só tem um tipo de contexto: se o WebGL2 existir mas não servir,
 * não dá para tentar WebGL1 no mesmo canvas. Na prática, quem tem WebGL2 tem
 * algum formato float renderizável.
 */
export function obterContexto(canvas) {
  const gl2 = canvas.getContext('webgl2', ATRIBUTOS);
  const gl = gl2 ?? canvas.getContext('webgl', ATRIBUTOS);
  if (!gl || gl.isContextLost()) return null;
  const candidatos = gl2 ? candidatosWebgl2(gl) : candidatosWebgl1(gl);
  const formato = candidatos.find((f) => renderizavel(gl, f));
  return formato ? { gl, formato } : null;
}

function compilar(gl, tipo, fonte) {
  const shader = gl.createShader(tipo);
  gl.shaderSource(shader, fonte);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader da água não compilou: ${log}`);
  }
  return shader;
}

// Programa com o atributo `vertice` fixo na posição 0 e os uniforms já localizados.
export function criarPrograma(gl, vertice, fragmento) {
  const programa = gl.createProgram();
  const shaders = [
    compilar(gl, gl.VERTEX_SHADER, vertice),
    compilar(gl, gl.FRAGMENT_SHADER, fragmento),
  ];
  shaders.forEach((s) => gl.attachShader(programa, s));
  gl.bindAttribLocation(programa, 0, 'vertice');
  gl.linkProgram(programa);
  shaders.forEach((s) => gl.deleteShader(s));
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    throw new Error(`Programa da água não ligou: ${gl.getProgramInfoLog(programa)}`);
  }
  const uniforms = {};
  const total = gl.getProgramParameter(programa, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < total; i++) {
    const { name } = gl.getActiveUniform(programa, i);
    uniforms[name] = gl.getUniformLocation(programa, name);
  }
  return { programa, uniforms };
}
