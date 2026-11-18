import { criarPrograma, obterContexto } from './contexto.js';
import {
  FRAGMENTO_GOTA,
  FRAGMENTO_ONDA,
  FRAGMENTO_RENDER,
  VERTICE_RENDER,
  VERTICE_SIMULACAO,
} from './shaders.js';

/*
 * Simulação da água em "ping-pong": duas texturas float, uma lida e outra
 * escrita, que trocam de papel a cada gota ou passo. O fundo (o painel
 * redesenhado num canvas 2D) é uma textura comum, refratada no render.
 *
 * Devolve null quando o navegador não tem WebGL com textura float
 * renderizável, ou quando algo falha na montagem.
 */
export function criarSimulacao(canvas, { resolucao }) {
  const contexto = obterContexto(canvas);
  if (!contexto) return null;
  const { gl, formato } = contexto;
  const recursos = { texturas: [], quadros: [], programas: [] };

  try {
    return montar(gl, formato, resolucao, recursos);
  } catch {
    liberar(gl, recursos);
    return null;
  }
}

function texturaDaAgua(gl, formato, resolucao) {
  const textura = gl.createTexture();
  const filtro = formato.linear ? gl.LINEAR : gl.NEAREST;
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // `null` zera a textura: água parada.
  gl.texImage2D(gl.TEXTURE_2D, 0, formato.interno, resolucao, resolucao, 0, gl.RGBA, formato.tipo, null);
  return textura;
}

function texturaDoFundo(gl) {
  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return textura;
}

function montar(gl, formato, resolucao, recursos) {
  const delta = new Float32Array([1 / resolucao, 1 / resolucao]);

  for (let i = 0; i < 2; i++) {
    const textura = texturaDaAgua(gl, formato, resolucao);
    const quadro = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, quadro);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textura, 0);
    recursos.texturas.push(textura);
    recursos.quadros.push(quadro);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const fundo = texturaDoFundo(gl);
  recursos.texturas.push(fundo);

  const gota = criarPrograma(gl, VERTICE_SIMULACAO, FRAGMENTO_GOTA);
  const onda = criarPrograma(gl, VERTICE_SIMULACAO, FRAGMENTO_ONDA);
  const render = criarPrograma(gl, VERTICE_RENDER, FRAGMENTO_RENDER);
  recursos.programas.push(gota, onda, render);

  gl.useProgram(onda.programa);
  gl.uniform2fv(onda.uniforms.delta, delta);
  gl.useProgram(render.programa);
  gl.uniform2fv(render.uniforms.delta, delta);
  gl.uniform1i(render.uniforms.fundo, 0);
  gl.uniform1i(render.uniforms.ondas, 1);

  recursos.quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, recursos.quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  let leitura = 0;
  const desenharQuad = () => gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

  // Lê a textura atual, escreve na outra e troca.
  const passarPelaAgua = ({ programa }) => {
    gl.viewport(0, 0, resolucao, resolucao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, recursos.quadros[1 - leitura]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, recursos.texturas[leitura]);
    gl.useProgram(programa);
    desenharQuad();
    leitura = 1 - leitura;
  };

  return {
    // Maior lado que o fundo pode ter (textura e canvas de desenho).
    maximo: Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),

    // `centro` em [-1, 1] e `raio` em fração do lado (ver geometria.js).
    gota(centro, raio, forca) {
      gl.useProgram(gota.programa);
      gl.uniform1i(gota.uniforms.textura, 0);
      gl.uniform2f(gota.uniforms.centro, centro[0], centro[1]);
      gl.uniform1f(gota.uniforms.raio, raio);
      gl.uniform1f(gota.uniforms.forca, forca);
      passarPelaAgua(gota);
    },

    avancar() {
      gl.useProgram(onda.programa);
      gl.uniform1i(onda.uniforms.textura, 0);
      passarPelaAgua(onda);
    },

    /*
     * Sobe o canvas 2D do fundo. Lança se o navegador recusar (SecurityError
     * de canvas "sujo") ou se o WebGL acusar erro (ex.: textura grande demais):
     * sem fundo, o título ficaria em branco com os originais escondidos.
     */
    enviarFundo(origem) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fundo);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, origem);
      } finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      }
      const erro = gl.getError();
      if (erro !== gl.NO_ERROR) throw new Error(`Fundo da água não subiu (WebGL ${erro})`);
    },

    desenhar({ razao, perturbacao, intensidade }) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(render.programa);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fundo);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, recursos.texturas[leitura]);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(render.uniforms.razao, razao[0], razao[1]);
      gl.uniform1f(render.uniforms.perturbacao, perturbacao);
      gl.uniform1f(render.uniforms.intensidade, intensidade);
      desenharQuad();
    },

    // Apaga os recursos e devolve o contexto ao navegador (o limite é ~16 por página).
    destruir() {
      liberar(gl, recursos);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

function liberar(gl, recursos) {
  if (gl.isContextLost()) return;
  recursos.texturas.forEach((t) => gl.deleteTexture(t));
  recursos.quadros.forEach((q) => gl.deleteFramebuffer(q));
  recursos.programas.forEach(({ programa }) => gl.deleteProgram(programa));
  if (recursos.quad) gl.deleteBuffer(recursos.quad);
}
