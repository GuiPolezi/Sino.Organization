/*
 * O que vai escrito no quadro da cena de /desenvolvimento: um resumo, à mão,
 * do painel que ele abre (card/CardQuadro.jsx), feito das mesmas contas
 * (mappers/visaoGeral.js, período "todo o tempo"). O post-it é o total de
 * tickets, o papel rasgado é a pizza "Carga por Dev" e a folha é a "Carga por
 * Local", com as mesmas cores do painel. Cada anotação só existe quando há
 * dado para ela; sem dado, ela sai null e não é desenhada.
 */
import { COR_OUTROS, coresDosTipos, fatiasPorDesenvolvedor } from '../card/cores.js';
import { OUTROS } from '../mappers/visaoGeral.js';

/** @import { AnotacoesQuadro } from '../../Suporte/quadro/texturas.js' */

// No papel cabem seis fatias na legenda; na folha, cinco barras.
const FATIAS_NO_PAPEL = 6;
const BARRAS_NA_FOLHA = 5;
// Na folha, o nome curto do local vai até aqui; mais que isso, a letra ficaria miúda.
export const LETRAS_DO_LOCAL = 24;

const formato = new Intl.NumberFormat('pt-BR');

// As maiores fatias da pizza do painel; as demais se juntam em "outros".
function fatiasDaPizza(porDesenvolvedor) {
  const fatias = fatiasPorDesenvolvedor(porDesenvolvedor)
    .filter(({ valor }) => valor > 0)
    .toSorted((a, b) => b.valor - a.valor);
  if (fatias.length <= FATIAS_NO_PAPEL) return fatias;

  const maiores = fatias.slice(0, FATIAS_NO_PAPEL - 1);
  const resto = fatias.slice(FATIAS_NO_PAPEL - 1).reduce((soma, { valor }) => soma + valor, 0);
  return [...maiores, { chave: OUTROS, rotulo: 'outros', valor: resto, cor: COR_OUTROS }];
}

const abreviar = (nome) => (nome.length > LETRAS_DO_LOCAL ? `${nome.slice(0, LETRAS_DO_LOCAL - 1).trimEnd()}…` : nome);

// Os locais com mais tickets, cada barra dividida pelos tipos com ticket, nas cores do painel.
function barrasDosLocais(porLocal, tiposDosLocais = []) {
  const corDe = coresDosTipos(tiposDosLocais);
  return porLocal.slice(0, BARRAS_NA_FOLHA).map(({ local, rotulo = local, total, tipos }) => ({
    rotulo: abreviar(rotulo),
    valor: total,
    partes: tipos.filter((tipo) => tipo.total > 0).map((tipo) => ({ cor: corDe(tipo.tipo), valor: tipo.total })),
  }));
}

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
  const fatias = fatiasDaPizza(resumo.visao.porDesenvolvedor);
  const barras = barrasDosLocais(resumo.visao.porLocal, resumo.visao.tiposDosLocais);
  return {
    assinatura: 'desenvolvimento',
    grafico: fatias.length ? { titulo: 'Carga por Dev', subtitulo: 'todo o tempo', fatias } : null,
    lista: barras.length ? { titulo: 'Carga por Local', barras } : null,
    postit: destaqueDoPostIt(resumo),
  };
}
