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

// Gota: soma um "sino" de cosseno na altura, com raio e força dados.
export const FRAGMENTO_GOTA = `${PRECISAO}
const float PI = 3.141592653589793;
uniform sampler2D textura;
uniform vec2 centro;
uniform float raio;
uniform float forca;
varying vec2 coord;
void main() {
  vec4 info = texture2D(textura, coord);
  float gota = max(0.0, 1.0 - length(centro * 0.5 + 0.5 - coord) / raio);
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

/*
 * Render. O fundo cobre o painel inteiro (uvFundo); a simulação é um
 * quadrado do lado maior do painel, então `razao` recorta a parte usada.
 */
export const VERTICE_RENDER = `
attribute vec2 vertice;
uniform vec2 razao;
varying vec2 uvFundo;
varying vec2 uvOndas;
void main() {
  uvFundo = vertice * 0.5 + 0.5;
  uvOndas = vertice * razao * 0.5 + 0.5;
  gl_Position = vec4(vertice, 0.0, 1.0);
}
`;

/*
 * `intensidade` (0 → 1, animada pelo GSAP) liga a refração e o brilho aos
 * poucos. Aqui o eixo y da simulação sobe; no plugin ele desce. Inverter o y
 * da inclinação reproduz exatamente a direção da luz e da refração de lá.
 */
export const FRAGMENTO_RENDER = `${PRECISAO}
uniform sampler2D fundo;
uniform sampler2D ondas;
uniform vec2 delta;
uniform float perturbacao;
uniform float intensidade;
varying vec2 uvFundo;
varying vec2 uvOndas;
void main() {
  float altura = texture2D(ondas, uvOndas).r;
  float alturaX = texture2D(ondas, vec2(uvOndas.x + delta.x, uvOndas.y)).r;
  float alturaY = texture2D(ondas, vec2(uvOndas.x, uvOndas.y + delta.y)).r;
  vec3 dx = vec3(delta.x, alturaX - altura, 0.0);
  vec3 dy = vec3(0.0, alturaY - altura, delta.y);
  vec2 desvio = -normalize(cross(dy, dx)).xz;
  desvio.y = -desvio.y;
  float especular = pow(max(0.0, dot(desvio, normalize(vec2(-0.6, 1.0)))), 4.0);
  vec4 cor = texture2D(fundo, uvFundo + desvio * perturbacao * intensidade);
  gl_FragColor = cor + vec4(especular * intensidade);
}
`;
