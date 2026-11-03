/*
 * A visão geral da equipe de /compilacao (o Quadro da equipe e a folha da
 * estátua): a soma dos cards que vieram do servidor. Card sem número ("—") fica
 * fora da soma e conta no "parcial". O Dia só vale se os dados são de hoje.
 */
import { mesCurto } from './atuacao.js';
import { TIPOS_DE_NORMA } from './dados.js';

/** @import { Tecnico } from '../Suporte/tipos.js' */

const PERIODOS_DO_QUADRO = ['hoje', 'semana', 'mes'];
const ehNumero = (valor) => typeof valor === 'number';

// Subtítulo da fila no Quadro: de onde vem o número.
function legendaDaFila(pessoa) {
  if (pessoa.funcao === 'projetos') return pessoa.projeto ? `no projeto · ${pessoa.projeto.cidade.nome}` : 'no projeto';
  return pessoa.aguardando?.mes ? `déficit · planilha de ${mesCurto(pessoa.aguardando.mes)}` : 'déficit da planilha';
}

/**
 * @param {Tecnico[]} tecnicos a equipe, na ordem da página
 * @param {{ referencia: string, pessoas: Record<string, object> } | null} dados resposta do servidor
 * @param {string} hoje "AAAA-MM-DD" em Brasília (o do navegador)
 */
export function resumoCompilacao(tecnicos, dados, hoje) {
  const daResposta = tecnicos.map((tecnico) => ({ tecnico, pessoa: dados?.pessoas?.[tecnico.id] ?? null }));
  const deHoje = Boolean(dados) && dados.referencia === hoje;

  const totais = {};
  const parcial = {};
  for (const periodo of PERIODOS_DO_QUADRO) {
    const valores = daResposta.map(({ pessoa }) => (periodo === 'hoje' && !deHoje ? null : pessoa?.producao?.[periodo]));
    const comNumero = valores.filter(ehNumero);
    totais[periodo] = comNumero.length > 0 ? comNumero.reduce((a, b) => a + b, 0) : null;
    parcial[periodo] = comNumero.length > 0 ? valores.length - comNumero.length : 0;
  }

  // Normas por tipo no Mês: só de quem tem o Mês (assim Σ tipos = Mês do quadro).
  const comMes = daResposta.filter(({ pessoa }) => ehNumero(pessoa?.producao?.mes));
  const porTipo = TIPOS_DE_NORMA.map(({ chave, rotulo, curto, cor }) => ({
    chave,
    rotulo: curto ?? rotulo,
    cor,
    valor: totais.mes === null ? null : comMes.reduce((soma, { pessoa }) => soma + (pessoa.porTipo?.mes?.[chave] ?? 0), 0),
  }));

  // Do mais ao menos produtivo no Mês; "—" no fim; empate na ordem da página.
  const ranking = daResposta
    .map(({ tecnico, pessoa }) => ({
      id: tecnico.id,
      nome: tecnico.nome,
      funcao: tecnico.funcao,
      normasMes: ehNumero(pessoa?.producao?.mes) ? pessoa.producao.mes : null,
      emFila: ehNumero(pessoa?.aguardando?.valor) ? pessoa.aguardando.valor : null,
      legendaFila: pessoa ? legendaDaFila(pessoa) : '',
      divididaCom: pessoa?.projeto?.compartilhadaCom ?? [],
      cidades: pessoa?.funcao === 'projetos' ? (pessoa.projeto ? 1 : 0) : (pessoa?.cidades?.length ?? 0),
    }))
    .toSorted((a, b) => (b.normasMes ?? -1) - (a.normasMes ?? -1));

  return {
    carregado: Boolean(dados),
    totalCompiladores: tecnicos.length,
    normasMes: totais.mes,
    normasSemana: totais.semana,
    normasHoje: totais.hoje,
    parcial,
    porTipo,
    ranking,
  };
}

/**
 * "parcial · 2 sem dado" quando algum card ficou fora da soma; "" se não.
 * @param {number} semDado
 */
export const rotuloParcial = (semDado) => (semDado > 0 ? `parcial · ${semDado} sem dado` : '');
