/*
 * Shaders da água. Técnica e constantes do jquery.ripples v0.6.3, de Pim
 * Schreurs (sirxemic), licença MIT: https://github.com/sirxemic/jquery.ripples
 * Reescritos aqui sem jQuery; GLSL ES 1.00, que roda em WebGL1 e WebGL2.
 *
 * A água é um campo de alturas numa textura de ponto flutuante:
 *   r = altura, g = velocidade.
 * A cada passo cada texel puxa a média dos 4 vizinhos (equação da onda
 * discreta) e perde 0,5% da velocidade. O render usa a inclinação da
 * superfície para deslocar a leitura do fundo (refração) e somar um brilho
 * especular, como luz batendo na onda.
 */

const PRECISAO = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

// Quadrado de tela cheia: a simulação inteira, ou o canvas inteiro no render.
export const VERTICE_SIMULACAO = `
attribute vec2 vertice;
varying vec2 coord;
void main() {
  coord = vertice * 0.5 + 0.5;
  gl_Position = vec4(vertice, 0.0, 1.0);
}
`;

/*
 * Gota: soma um "sino" de cosseno na altura, com raio e força dados. O raio
 * é fração da altura; `proporcao` (largura / altura) deixa a gota redonda.
 */
export const FRAGMENTO_GOTA = `${PRECISAO}
const float PI = 3.141592653589793;
uniform sampler2D textura;
uniform vec2 centro;
uniform float raio;
uniform float forca;
uniform float proporcao;
varying vec2 coord;
void main() {
  vec4 info = texture2D(textura, coord);
  vec2 distancia = (centro * 0.5 + 0.5 - coord) * vec2(proporcao, 1.0);
  float gota = max(0.0, 1.0 - length(distancia) / raio);
  gota = 0.5 - cos(gota * PI) * 0.5;
  info.r += gota * forca;
  gl_FragColor = info;
}
`;

// Um passo da equação da onda, com amortecimento.
export const FRAGMENTO_ONDA = `${PRECISAO}
uniform sampler2D textura;
uniform vec2 delta;
varying vec2 coord;
void main() {
  vec4 info = texture2D(textura, coord);
  vec2 dx = vec2(delta.x, 0.0);
  vec2 dy = vec2(0.0, delta.y);
  float media = (
    texture2D(textura, coord - dx).r +
    texture2D(textura, coord - dy).r +
    texture2D(textura, coord + dx).r +
    texture2D(textura, coord + dy).r
  ) * 0.25;
  info.g += (media - info.r) * 2.0;
  info.g *= 0.995;
  info.r += info.g;
  gl_FragColor = info;
}
`;

// Render: o fundo e a simulação cobrem o painel inteiro, então o uv é o mesmo.
export const VERTICE_RENDER = `
attribute vec2 vertice;
varying vec2 uv;
void main() {
  uv = vertice * 0.5 + 0.5;
  gl_Position = vec4(vertice, 0.0, 1.0);
}
`;

/*
 * `intensidade` (0 → 1, animada pelo GSAP) liga a refração e o brilho aos
 * poucos. Aqui o eixo y da simulação sobe; no plugin ele desce. Inverter o y
 * da inclinação reproduz exatamente a direção da luz e da refração de lá.
 * `delta` é um texel em cada eixo (para ler os vizinhos); `passo` é o
 * tamanho do texel na conta da inclinação, igual nos dois eixos (texels
 * quadrados) e fixo, para a refração ter a força de sempre. `perturbacao`
 * vem por eixo (em uv), para o desvio ter os mesmos px na horizontal e na vertical.
 */
export const FRAGMENTO_RENDER = `${PRECISAO}
uniform sampler2D fundo;
uniform sampler2D ondas;
uniform vec2 delta;
uniform float passo;
uniform vec2 perturbacao;
uniform float intensidade;
varying vec2 uv;
void main() {
  float altura = texture2D(ondas, uv).r;
  float alturaX = texture2D(ondas, vec2(uv.x + delta.x, uv.y)).r;
  float alturaY = texture2D(ondas, vec2(uv.x, uv.y + delta.y)).r;
  vec3 dx = vec3(passo, alturaX - altura, 0.0);
  vec3 dy = vec3(0.0, alturaY - altura, passo);
  vec2 desvio = -normalize(cross(dy, dx)).xz;
  desvio.y = -desvio.y;
  float especular = pow(max(0.0, dot(desvio, normalize(vec2(-0.6, 1.0)))), 4.0);
  vec4 cor = texture2D(fundo, uv + desvio * perturbacao * intensidade);
  gl_FragColor = cor + vec4(especular * intensidade);
}
`;
