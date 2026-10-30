import * as THREE from 'three';
import logoUrl from '../../../assets/images/logo-sino.png';

// Tronco: é sobre ele que o logo da camisa se curva.
const RAIO_CORPO = 0.34;
const LADO_LOGO = 0.14;

// Barba: casca rente ao rosto, de uma orelha à outra pela frente. A borda de
// cima sobe nas laterais até o cabelo (costeletas) e desce na frente para deixar
// as bochechas livres; a de baixo acompanha o maxilar até o queixo. `volume`
// engrossa a parte de baixo da frente: a barba fechada tem, a curta não.
// `topoFrente` (em frações de π) baixa a borda de cima na frente, e `estreitar`
// afina as costeletas: quanto maior, mais estreita a subida nas laterais.
function criarBarba({ raio: raioBase, volume, topoFrente = 0.58, estreitar = 4 }) {
  const COLUNAS = 40;
  const LINHAS = 12;
  const GIRO_MAX = (95 * Math.PI) / 180;
  const posicoes = [];
  const indices = [];
  for (let i = 0; i <= COLUNAS; i++) {
    // Giro a partir da frente (+z): negativo à direita do boneco, positivo à esquerda.
    const giro = -GIRO_MAX + (2 * GIRO_MAX * i) / COLUNAS;
    const lateral = Math.abs(Math.sin(giro)) ** estreitar;
    const frente = Math.cos(giro) ** 2;
    // Ângulos a partir do topo da cabeça.
    const topo = Math.PI * (topoFrente - (topoFrente - 0.42) * lateral);
    const base = Math.PI * (0.76 + 0.14 * frente);
    for (let j = 0; j <= LINHAS; j++) {
      const t = j / LINHAS;
      const polar = topo + (base - topo) * t;
      // Mais cheia embaixo, sobretudo na frente.
      const raio = raioBase + volume * t * frente;
      posicoes.push(
        raio * Math.sin(polar) * Math.sin(giro),
        raio * Math.cos(polar),
        raio * Math.sin(polar) * Math.cos(giro),
      );
    }
  }
  for (let i = 0; i < COLUNAS; i++) {
    for (let j = 0; j < LINHAS; j++) {
      const a = i * (LINHAS + 1) + j;
      const b = a + LINHAS + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return geometria;
}

const suavizar = (inicio, fim, x) => {
  const t = Math.min(1, Math.max(0, (x - inicio) / (fim - inicio)));
  return t * t * (3 - 2 * t);
};

// Degradê: uma casca só, sem degraus. Grossa em cima; nas laterais e na nuca vai
// ficando rente à cabeça e some na pele (a transparência vai na cor de cada
// vértice). Na frente o corte não esfuma: só a borda da franja se afina.
// `lateralDe(giro)` diz, de 0 a 1, quanto cada lado esfuma (o padrão: laterais e
// nuca; o degradê lateral passa só as laterais).
const LATERAIS_E_NUCA = (giro) => 1 - Math.max(0, Math.cos(giro)) ** 2;
const SO_LATERAIS = (giro) => Math.sin(giro) ** 2;

function criarDegrade(lateralDe = LATERAIS_E_NUCA) {
  const COLUNAS = 48;
  const LINHAS = 20;
  const POLAR_MAX = Math.PI * 0.47;
  const RAIO_PELE = 0.345;
  const VOLUME = 0.045;
  const posicoes = [];
  const cores = [];
  const indices = [];
  for (let i = 0; i <= COLUNAS; i++) {
    const giro = (2 * Math.PI * i) / COLUNAS;
    // 0 onde o cabelo fica cheio até a borda, 1 onde esfuma por inteiro.
    const lateral = lateralDe(giro);
    const inicioAfinar = 0.9 - 0.45 * lateral;
    const inicioSumir = 0.95 - 0.35 * lateral;
    for (let j = 0; j <= LINHAS; j++) {
      const u = j / LINHAS;
      const polar = POLAR_MAX * u;
      const raio = RAIO_PELE + VOLUME * (1 - suavizar(inicioAfinar, 1, u));
      posicoes.push(
        raio * Math.sin(polar) * Math.sin(giro),
        raio * Math.cos(polar),
        raio * Math.sin(polar) * Math.cos(giro),
      );
      cores.push(1, 1, 1, 1 - suavizar(inicioSumir, 1, u));
    }
  }
  for (let i = 0; i < COLUNAS; i++) {
    for (let j = 0; j < LINHAS; j++) {
      const a = i * (LINHAS + 1) + j;
      const b = a + LINHAS + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(cores, 4));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return geometria;
}

// Geometrias e materiais base: criados uma vez e compartilhados por todos os bonecos.
export const G = {
  corpo: new THREE.CapsuleGeometry(RAIO_CORPO, 0.36, 10, 24),
  cabeca: new THREE.SphereGeometry(0.34, 36, 28),
  perna: new THREE.CapsuleGeometry(0.115, 0.2, 8, 14),
  braco: new THREE.CapsuleGeometry(0.085, 0.28, 8, 14),
  mao: new THREE.SphereGeometry(0.095, 16, 12),
  olho: new THREE.SphereGeometry(0.045, 14, 10),
  brilho: new THREE.SphereGeometry(0.014, 8, 6),
  bochecha: new THREE.SphereGeometry(0.06, 14, 10),
  cabeloCurto: new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
  degrade: criarDegrade(),
  // Degradê só nas laterais: a frente e a nuca ficam cheias até a borda.
  degradeLateral: criarDegrade(SO_LATERAIS),
  // Cabelo volumoso: mais grosso e um pouco mais baixo que o curto.
  cabeloVolumoso: new THREE.SphereGeometry(0.375, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
  // Cabelo raspado: uma película rente à cabeça, um pouco mais baixa que o curto.
  cabeloRaspado: new THREE.SphereGeometry(0.348, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.46),
  cabeloLongo: new THREE.SphereGeometry(0.365, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
  coque: new THREE.SphereGeometry(0.15, 18, 14),
  // Coque samurai: a casca do cabelo puxado (até a altura das orelhas; girada
  // para trás, cobre a nuca e deixa a testa livre) e o pé do coque, um anel de
  // cabelo apertado logo abaixo da bola.
  cabeloPuxado: new THREE.SphereGeometry(0.362, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53),
  peDoCoque: new THREE.CylinderGeometry(0.075, 0.1, 0.09, 18),
  rabo: new THREE.CapsuleGeometry(0.22, 0.32, 8, 16),
  // Mecha que cai do lado do rosto até o ombro, no cabelo comprido.
  mechaLateral: new THREE.CapsuleGeometry(0.08, 0.3, 6, 12),
  moicano: new THREE.CapsuleGeometry(0.07, 0.42, 6, 12),
  topete: new THREE.SphereGeometry(0.16, 20, 16),
  cacho: new THREE.SphereGeometry(0.11, 16, 12),
  cachinho: new THREE.SphereGeometry(0.065, 12, 10),
  bigode: new THREE.CapsuleGeometry(0.026, 0.07, 6, 10),
  cavanhaque: new THREE.SphereGeometry(0.075, 14, 10),
  barbaFechada: criarBarba({ raio: 0.35, volume: 0.02 }),
  barbaCurta: criarBarba({ raio: 0.346, volume: 0, topoFrente: 0.62, estreitar: 8 }),
  // Barba grande: o contorno da fechada, mais afastada do rosto e bem mais cheia embaixo.
  barbaGrande: criarBarba({ raio: 0.356, volume: 0.06 }),
  queixo: new THREE.SphereGeometry(0.11, 18, 14),
  pupila: new THREE.SphereGeometry(0.022, 10, 8),
  lente: new THREE.TorusGeometry(0.085, 0.018, 8, 22),
  ponte: new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6),
  arco: new THREE.TorusGeometry(0.385, 0.028, 8, 28, Math.PI),
  concha: new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18),
  aba: new THREE.CylinderGeometry(0.26, 0.26, 0.035, 24),
  maleta: new THREE.BoxGeometry(0.34, 0.24, 0.09),
  gravata: new THREE.CapsuleGeometry(0.05, 0.2, 4, 8),
  // Moletom: o capuz caído nas costas e a gola em volta do pescoço.
  capuz: new THREE.SphereGeometry(0.26, 24, 16),
  gola: new THREE.TorusGeometry(0.2, 0.05, 10, 28),
  // Retalho quadrado da lateral de um cilindro, rente ao tronco e centrado na frente.
  logo: new THREE.CylinderGeometry(
    RAIO_CORPO + 0.004,
    RAIO_CORPO + 0.004,
    LADO_LOGO,
    8,
    1,
    true,
    -LADO_LOGO / RAIO_CORPO / 2,
    LADO_LOGO / RAIO_CORPO,
  ),
  anel: new THREE.TorusGeometry(0.55, 0.035, 10, 48),
  hit: new THREE.CylinderGeometry(0.5, 0.5, 2.1, 10),
};

// Material "massinha": fosco e sem brilho metálico.
export const clay = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });

export const ESCURO = clay('#1F1A24');
export const CORDAO = clay('#EFEAE0');
// Logo estampado na camisa: a imagem tem fundo transparente.
const texturaLogo = new THREE.TextureLoader().load(logoUrl);
texturaLogo.colorSpace = THREE.SRGBColorSpace;
export const LOGO = new THREE.MeshStandardMaterial({
  map: texturaLogo,
  roughness: 0.82,
  metalness: 0,
  transparent: true,
  depthWrite: false,
});
export const BRANCO = new THREE.MeshBasicMaterial({ color: '#ffffff' });
export const BOCHECHA = new THREE.MeshStandardMaterial({
  color: '#F08A8A',
  roughness: 1,
  transparent: true,
  opacity: 0.55,
});
export const INVISIVEL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
// A área de clique não entra no passe de sombras de contato.
INVISIVEL.allowOverride = false;
