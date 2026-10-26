/*
 * Cores dos gráficos do painel do quadro. As duas paletas passaram pelo
 * validador de paleta de gráficos (faixa de luminosidade, saturação mínima e
 * distância entre vizinhas, com e sem daltonismo). O contraste com o fundo fica
 * abaixo de 3:1 em algumas, então a cor nunca está sozinha: toda fatia tem
 * rótulo com nome, as barras têm legenda e o valor escrito, e cada gráfico tem
 * uma tabela para leitores de tela.
 */
import { CATEGORIAS } from '../mappers/chamados.js';
import { OUTROS } from '../mappers/visaoGeral.js';

/** @import { ItemPizza } from './geometriaPizza.js' */

// Pincéis do quadro, na ordem: a cor segue a posição da pessoa na equipe (ou da categoria no Desempenho).
const PINCEIS = ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0090a8', '#9a5b1f'];
export const COR_OUTROS = '#6f6c62';

/*
 * Cores dos tipos (subcategorias) da "Carga por Local", na ordem da legenda: o
 * mais comum fica com a primeira. As cores do design, nesta ordem, para as
 * vizinhas na barra se distinguirem.
 */
const CORES_TIPOS = ['#d64848', '#7bc65a', '#1d7fc0', '#99978e', '#e2aa00'];

/**
 * A cor de cada tipo da legenda da "Carga por Local" (visaoGeral().tiposDosLocais).
 * Um tipo fora da legenda fica com a cor de "Outros".
 * @param {string[]} tipos
 * @returns {(tipo: string) => string}
 */
export function coresDosTipos(tipos) {
  const cores = new Map(tipos.filter((tipo) => tipo !== OUTROS).map((tipo, i) => [tipo, CORES_TIPOS[i] ?? COR_OUTROS]));
  return (tipo) => cores.get(tipo) ?? COR_OUTROS;
}

/*
 * Cada item fica com o pincel da posição dele. Quem passa do número de pincéis
 * (ou não tem posição) entra numa fatia "Outros", em vez de repetir uma cor.
 */
function pintar(itens) {
  const comPincel = itens.filter(({ posicao }) => posicao >= 0 && posicao < PINCEIS.length);
  const resto = itens.filter((item) => !comPincel.includes(item)).reduce((soma, { valor }) => soma + valor, 0);
  const pintados = comPincel.map(({ chave, rotulo, valor, posicao }) => ({ chave, rotulo, valor, cor: PINCEIS[posicao] }));
  return resto > 0 ? [...pintados, { chave: OUTROS, rotulo: OUTROS, valor: resto, cor: COR_OUTROS }] : pintados;
}

const primeiroNome = (nome) => nome.split(' ')[0];

/**
 * Fatias da "Carga por Dev", com a cor fixa de cada pessoa.
 * Quem saiu da equipe leva "(ex)" no rótulo.
 * @param {{ id: string, nome: string, total: number, exMembro?: boolean }[]} porDesenvolvedor na ordem da equipe
 * @returns {ItemPizza[]}
 */
export const fatiasPorDesenvolvedor = (porDesenvolvedor) =>
  pintar(
    porDesenvolvedor.map(({ id, nome, total, exMembro }, posicao) => ({
      chave: id,
      rotulo: exMembro ? `${primeiroNome(nome)} (ex)` : primeiroNome(nome),
      valor: total,
      posicao,
    })),
  );

/**
 * Fatias da "Carga por Categoria", com a cor fixa de cada categoria.
 * @param {{ nome: string, total: number }[]} porCategoria
 * @returns {ItemPizza[]}
 */
export const fatiasPorCategoria = (porCategoria) =>
  pintar(porCategoria.map(({ nome, total }) => ({ chave: nome, rotulo: nome, valor: total, posicao: CATEGORIAS.indexOf(nome) })));
