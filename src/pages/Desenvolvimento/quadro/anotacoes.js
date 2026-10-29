/*
 * O que vai escrito no quadro da cena de /desenvolvimento: um resumo, à mão,
 * do painel que ele abre (card/CardQuadro.jsx), feito das mesmas contas
 * (mappers/visaoGeral.js, período "todo o tempo"). O post-it é o total de
 * tickets, o papel rasgado são as barras da "Carga por Dev" (nas cores do painel)
 * e a folha é a linha da "Carga por Local", só com a quantidade. Cada anotação só existe quando há
 * dado para ela; sem dado, ela sai null e não é desenhada.
 */
import { COR_OUTROS, fatiasPorDesenvolvedor } from '../card/cores.js';
import { percentuais, textoPercentual } from '../card/geometriaPizza.js';
import { OUTROS } from '../mappers/visaoGeral.js';

/** @import { AnotacoesQuadro } from '../../Suporte/quadro/texturas.js' */

// No papel cabem seis barras; na folha, cinco pontos.
const BARRAS_NO_PAPEL = 6;
const PONTOS_NA_FOLHA = 5;
// Na folha, o nome curto do local vai até aqui; mais que isso, a letra ficaria miúda.
export const LETRAS_DO_LOCAL = 24;

const formato = new Intl.NumberFormat('pt-BR');

// As maiores barras da "Carga por Dev" do painel; as demais se juntam em "outros".
function barrasDosDevs(porDesenvolvedor) {
  const barras = fatiasPorDesenvolvedor(porDesenvolvedor)
    .filter(({ valor }) => valor > 0)
    .toSorted((a, b) => b.valor - a.valor);
  const cabem =
    barras.length <= BARRAS_NO_PAPEL
      ? barras
      : [
          ...barras.slice(0, BARRAS_NO_PAPEL - 1),
          {
            chave: OUTROS,
            rotulo: 'outros',
            valor: barras.slice(BARRAS_NO_PAPEL - 1).reduce((soma, { valor }) => soma + valor, 0),
            cor: COR_OUTROS,
          },
        ];
  // A parte do total com as mesmas contas do painel (somam 100%).
  const porcentos = percentuais(cabem.map(({ valor }) => valor));
  return cabem.map((barra, i) => ({ ...barra, percentual: textoPercentual(barra.valor, porcentos[i]) }));
}

const abreviar = (nome) => (nome.length > LETRAS_DO_LOCAL ? `${nome.slice(0, LETRAS_DO_LOCAL - 1).trimEnd()}…` : nome);

// Os locais com mais tickets, um ponto por local, na ordem do painel: só o nome e a quantidade.
const pontosDosLocais = (porLocal) =>
  porLocal.slice(0, PONTOS_NA_FOLHA).map(({ local, rotulo = local, total }) => ({ rotulo: abreviar(rotulo), valor: total }));

// Post-it: o total de tickets do painel ou, sem chamados, o tamanho da equipe.
function destaqueDoPostIt({ totalDesenvolvedores, visao }) {
  if (visao.total !== null) {
    // Como no painel: o "+" só com ticket.
    const numero = `${visao.total > 0 ? '+' : ''}${formato.format(visao.total)}`;
    return { numero, linhas: ['total de', 'tickets ★'] };
  }
  if (totalDesenvolvedores > 0) {
    const plural = totalDesenvolvedores === 1 ? 'desenvolvedor' : 'desenvolvedores';
    return { numero: totalDesenvolvedores, linhas: [plural, 'na equipe ★'] };
  }
  return null;
}

/**
 * @param {ReturnType<typeof import('./useResumo.js').useResumo>} resumo
 * @returns {AnotacoesQuadro}
 */
export function anotacoesDoQuadro(resumo) {
  const devs = barrasDosDevs(resumo.visao.porDesenvolvedor);
  const pontos = pontosDosLocais(resumo.visao.porLocal);
  return {
    assinatura: 'desenvolvimento',
    grafico: devs.length ? { titulo: 'Carga por Dev', subtitulo: 'todo o tempo', barras: devs } : null,
    lista: pontos.length ? { titulo: 'Carga por Local', pontos } : null,
    postit: destaqueDoPostIt(resumo),
  };
}
