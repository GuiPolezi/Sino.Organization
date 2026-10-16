import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { CATEGORIAS, FECHADO, TIPOS } from '../mappers/chamados.js';
import { sorteador } from '../sorteador.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { Chamado, ChamadosDesenvolvedor } from '../mappers/chamados.js' */

const UM_DIA_MS = 864e5;
// Um ano e meio de histórico, para "Todo o Tempo" ter centenas de chamados.
const DIAS_DE_HISTORICO = 540;
// Peso das categorias de cada pessoa: a primeira concentra a maior parte.
const PESOS_CATEGORIAS = [60, 25, 10, 5];
// Peso de cada tipo de solicitação, na ordem de TIPOS.
const PESOS_TIPOS = [50, 18, 6, 14, 12];
// Cidades de clientes (src/data/clients.json), da que mais abre chamados para a que menos.
const LOCAIS = [
  'Bragança Paulista',
  'Araras',
  'Alumínio',
  'Franca',
  'Holambra',
  'Poços de Caldas',
  'Piracicaba',
  'São Paulo',
  'Americana',
  'São José do Rio Preto',
  'Amparo',
  'Barretos',
  'Guarulhos',
  'Mirassol',
  'Lins',
  'Jales',
  'Matão',
  'Boituva',
];
// Peso de cada cidade: cai rápido, para poucas concentrarem a maior parte dos chamados.
const PESOS_LOCAIS = LOCAIS.map((local, i) => [local, 1 / (i + 1) ** 1.2]);
const EM_ABERTO = [
  ['Com o desenvolvedor', 34],
  ['Em atendimento', 30],
  ['Aguardando Testes', 16],
  ['Aguardando Retorno do Solicitante', 10],
];

function escolher(sorteio, pares) {
  let resto = sorteio() * pares.reduce((soma, [, peso]) => soma + peso, 0);
  for (const [valor, peso] of pares) {
    resto -= peso;
    if (resto < 0) return valor;
  }
  return pares.at(-1)[0];
}

// O jeito de cada pessoa: volume, sistemas em que trabalha e status que usa.
function perfil(id) {
  const sorteio = sorteador(id);
  const porDiaUtil = 0.6 + sorteio() * 0.8;
  const quantasCategorias = 2 + Math.floor(sorteio() * 3);
  const categorias = [...CATEGORIAS]
    .map((nome) => [nome, sorteio()])
    .sort((a, b) => a[1] - b[1])
    .slice(0, quantasCategorias)
    .map(([nome], i) => [nome, PESOS_CATEGORIAS[i]]);
  const emAberto = [...EM_ABERTO];
  if (sorteio() < 0.45) emAberto.push(['Pendente', 12]);
  if (sorteio() < 0.5) emAberto.push(['Aguardando Deploy', 10]);

  return { porDiaUtil, categorias, emAberto, tipos: TIPOS.map((tipo, i) => [tipo, PESOS_TIPOS[i]]) };
}

// Quanto mais velho o chamado, mais provável que já esteja fechado. Desenvolvimento leva
// semanas, e alguns chamados antigos continuam em aberto.
const chanceDeFechado = (idade) => Math.min(0.97, 1 - 0.9 * Math.exp(-idade / 18));

function chamadosDoDia(id, jeito, data, idade) {
  const sorteio = sorteador(`${id}:${data}`);
  // A cidade sai de outra sequência, para não mudar os chamados que já existiam.
  const sorteioLocal = sorteador(`${id}:${data}:local`);
  const fimDeSemana = [0, 6].includes(new Date(`${data}T00:00:00Z`).getUTCDay());
  let quantidade = fimDeSemana ? 0 : Math.round(sorteio() * jeito.porDiaUtil * 2);
  // A demonstração sempre tem algo em "Hoje".
  if (idade === 0) quantidade = Math.max(quantidade, 1 + Math.floor(sorteio() * 3));

  return Array.from({ length: quantidade }, () => ({
    data,
    categoria: escolher(sorteio, jeito.categorias),
    tipo: escolher(sorteio, jeito.tipos),
    status: sorteio() < chanceDeFechado(idade) ? FECHADO : escolher(sorteio, jeito.emAberto),
    local: escolher(sorteioLocal, PESOS_LOCAIS),
  }));
}

/** @returns {Chamado[]} do mais novo para o mais antigo */
function chamadosFicticios(id, hoje) {
  const base = Date.parse(`${hoje}T00:00:00Z`);
  const jeito = perfil(id);
  return Array.from({ length: DIAS_DE_HISTORICO }, (_, idade) => {
    const data = new Date(base - idade * UM_DIA_MS).toISOString().slice(0, 10);
    return chamadosDoDia(id, jeito, data, idade);
  }).flat();
}

/**
 * Chamados atribuídos a cada desenvolvedor, para o card. Hoje são de
 * demonstração (`ficticio: true`): o Milldesk ainda não é consultado. Quando
 * for, só o corpo desta função muda, mantendo o formato de ChamadosDesenvolvedor;
 * os status, as categorias e os locais passam a ser os que vierem de lá.
 *
 * @param {Pick<Tecnico, 'id'>[]} tecnicos
 * @param {string} [hoje] "AAAA-MM-DD"
 * @returns {Promise<Record<string, ChamadosDesenvolvedor>>} por id
 */
export async function buscarChamados(tecnicos, hoje = hojeEmBrasilia()) {
  return Object.fromEntries(tecnicos.map(({ id }) => [id, { ficticio: true, lista: chamadosFicticios(id, hoje) }]));
}
