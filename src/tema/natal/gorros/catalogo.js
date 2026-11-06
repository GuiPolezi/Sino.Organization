/*
 * Os 8 gorros de Natal (docs/tema-natal.md, 5.5 e 5.6). Só dados: nada de THREE
 * nem de DOM, para rodar nos testes em Node. Medidas no espaço da cabeça (m).
 * `cone` segue coneCurvo() de geometriasGorro.js; as cores são chaves da paleta.
 */

const pelucia = (cor) => Object.freeze({ cor, acabamento: 'pelucia' });
const massinha = (cor) => Object.freeze({ cor, acabamento: 'massinha' });

// O clássico: base dos que "herdam" dele (luxo, mini, casa).
const CLASSICO = {
  nome: 'Papai Noel clássico',
  tipo: 'cone',
  cone: { raioBase: 0.31, altura: 0.36, curva: 1.8, dir: [1, 0], perfil: 1.35, suave: 1.2 },
  aba: { tubo: 0.056 },
  pompom: { raio: 0.072 },
  cores: { corpo: massinha('vermelho'), aba: pelucia('creme'), pompom: pelucia('creme') },
};

export const GORROS = Object.freeze({
  classico: CLASSICO,
  caido: {
    nome: 'Gorro longo caído',
    tipo: 'cone',
    // Tomba para trás e para a direita, passa de 90° e termina num rabo pendurado.
    cone: { raioBase: 0.31, altura: 0.44, curva: 2.6, dir: [1, -1.2], perfil: 1, raioPonta: 0.045, suave: 0.8 },
    aba: { tubo: 0.056 },
    rabo: { raioTopo: 0.048, raioBase: 0.03, comprimento: 0.2, abertura: 0.3 },
    pompom: { raio: 0.07 },
    cores: { corpo: { textura: 'listrasCaido' }, aba: pelucia('creme'), pompom: pelucia('creme'), rabo: massinha('vermelho') },
  },
  elfo: {
    nome: 'Elfo',
    tipo: 'cone',
    // Fino, enrolando para trás; no lugar da aba, a gola de pétalas.
    cone: { raioBase: 0.29, altura: 0.44, curva: 2.4, dir: [0, -1], perfil: 1.1, suave: 1.1 },
    petalas: { quantas: 9, largura: 0.165, altura: 0.115, espessura: 0.05, faixa: 0.034 },
    sino: { raio: 0.045 },
    cores: {
      corpo: massinha('elfo'),
      faixa: pelucia('vermelho'),
      petalas: [massinha('vermelho'), massinha('creme')],
      sino: { cor: 'ouro', acabamento: 'ouro' },
    },
  },
  bengala: {
    nome: 'Bengala doce',
    tipo: 'cone',
    cone: { raioBase: 0.3, altura: 0.38, curva: 2.0, dir: [-1, 0], perfil: 1.3, suave: 1.1 },
    aba: { tubo: 0.056 },
    pompom: { raio: 0.066 },
    cores: { corpo: { textura: 'bengala' }, aba: pelucia('vermelho'), pompom: pelucia('creme') },
  },
  trico: {
    nome: 'Gorro de tricô',
    tipo: 'cupula',
    // Sem cone: cúpula achatada, barra dobrada e um pompom grande no topo.
    cupula: { raio: 0.37, achatar: 0.6 },
    barra: { raio: 0.355, altura: 0.085 },
    pompom: { raio: 0.095 },
    cores: { corpo: { textura: 'trico' }, barra: { textura: 'punho' }, pompom: pelucia('creme') },
  },
  luxo: {
    ...CLASSICO,
    nome: 'Noel veludo e ouro',
    cone: { raioBase: 0.32, altura: 0.34, curva: 1.7, dir: [1, 0], perfil: 1.35, suave: 1.3 },
    aba: { tubo: 0.066 },
    cores: { corpo: { cor: 'vinho', acabamento: 'veludo' }, aba: pelucia('ouroAntigo'), pompom: { cor: 'ouroAntigo', acabamento: 'cetim' } },
  },
  mini: {
    ...CLASSICO,
    nome: 'Mini gorro inclinado',
    // Cai para fora (−x), longe do centro da cabeça.
    cone: { ...CLASSICO.cone, dir: [-1, 0.25], curva: 1.7 },
    mini: { escala: 0.53, direcao: [-0.13, 0.32, 0.05], rotacao: [-0.1, 0, 0.45] },
  },
  casa: {
    ...CLASSICO,
    nome: 'Gorro da casa',
    cone: { ...CLASSICO.cone, curva: 2.0, dir: [-1, 0], suave: 1.1 },
    marca: { raio: 0.06 },
    cores: { corpo: massinha('oliva'), aba: pelucia('creme'), pompom: pelucia('creme'), marca: massinha('pinheiro') },
  },
});

export const ESTILOS_GORRO = Object.freeze(Object.keys(GORROS));

// Tabela curada: variedade por equipe e o gorro casado com o cabelo (5.6).
export const GORROS_POR_PESSOA = Object.freeze({
  // Suporte
  roberto: 'classico',
  fabio: 'luxo',
  'guilherme-p': 'trico',
  luiz: 'elfo',
  // Desenvolvimento
  adriano: 'caido',
  antonio: 'mini',
  arnaldo: 'bengala',
  caique: 'classico',
  donizeti: 'trico',
  eduardo: 'elfo',
  'guilherme-a': 'casa',
  gustavo: 'luxo',
  ketlyn: 'mini',
  rafael: 'caido',
  // Compilação
  leonardo: 'classico',
  ramon: 'elfo',
  gdressano: 'bengala',
  glopes: 'mini',
  nathalia: 'luxo',
  laura: 'caido',
  damaris: 'trico',
});

// FNV-1a, o mesmo de aparencia.js (copiado para não mexer no módulo base).
export function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Estilo do gorro de uma pessoa: o da tabela ou, para quem é novo, um sorteio
 * fixo pelo id (sempre o mesmo na cena, no retrato e no holograma).
 * @param {string} id
 * @returns {keyof typeof GORROS}
 */
export function gorroDe(id) {
  if (Object.hasOwn(GORROS_POR_PESSOA, id)) return GORROS_POR_PESSOA[id];
  return ESTILOS_GORRO[hash(`${id}#natal`) % ESTILOS_GORRO.length];
}

/** Fase do balanço do pompom (rad): os bonecos não balançam juntos. */
export const faseDe = (id) => (hash(String(id)) % 628) / 100;
