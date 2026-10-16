/*
 * Visão geral da equipe de desenvolvimento, para o quadro da cena e o painel.
 * Sai dos mesmos chamados dos cards (api/chamados.js), somados para a equipe.
 * Como no card, cada chamado conta no dia em que foi atribuído: "fechado no mês"
 * é o chamado atribuído no mês corrente, até hoje, que já está fechado.
 */
import { diasRecentes } from '../../Suporte/mappers/atendimentos.js';
import { COM_O_DESENVOLVEDOR, FECHADO, compararStatus } from './chamados.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { Chamado, ChamadosDesenvolvedor } from './chamados.js' */

/** @param {Chamado[]} lista @param {(chamado: Chamado) => boolean} condicao */
const contar = (lista, condicao) => lista.reduce((total, chamado) => total + (condicao(chamado) ? 1 : 0), 0);

// Chamados recebidos (atribuídos) pela equipe em cada dia: "AAAA-MM-DD" -> total.
function recebidosPorDia(listas) {
  const porDia = {};
  for (const lista of listas) {
    for (const { data } of lista) porDia[data] = (porDia[data] ?? 0) + 1;
  }
  return porDia;
}

// Os status em aberto da equipe inteira, de todos os tempos, na ordem do fluxo.
function filaDaEquipe(listas) {
  const totais = new Map();
  for (const lista of listas) {
    for (const { status } of lista) {
      if (status !== FECHADO) totais.set(status, (totais.get(status) ?? 0) + 1);
    }
  }
  return [...totais]
    .map(([status, total]) => ({ status, total }))
    .toSorted((a, b) => compararStatus(a.status, b.status));
}

/**
 * Tudo o que o quadro e o painel mostram. Sem chamados carregados, os totais
 * saem null e as listas vazias: só o tamanho da equipe aparece.
 *
 * @param {Tecnico[]} tecnicos
 * @param {Record<string, ChamadosDesenvolvedor>} [chamados] por id do desenvolvedor
 * @param {string} hoje "AAAA-MM-DD"
 */
export function resumoEquipe(tecnicos, chamados = {}, hoje) {
  const comChamados = tecnicos.filter(({ id }) => Array.isArray(chamados[id]?.lista));
  const listaDe = (id) => chamados[id].lista;
  const listas = comChamados.map(({ id }) => listaDe(id));
  const temDados = comChamados.length > 0;

  const mes = hoje.slice(0, 7);
  const fechadoNoMes = ({ data, status }) => status === FECHADO && data.startsWith(mes) && data <= hoje;
  const fechadoHoje = ({ data, status }) => status === FECHADO && data === hoje;

  // Do que mais fechou no mês para o que menos; no empate, a ordem da equipe.
  const ranking = comChamados
    .map(({ id, nome, funcao }) => ({ id, nome, funcao, fechadosMes: contar(listaDe(id), fechadoNoMes) }))
    .toSorted((a, b) => b.fechadosMes - a.fechadosMes);

  return {
    totalDesenvolvedores: tecnicos.length,
    fechadosMes: temDados ? ranking.reduce((total, { fechadosMes }) => total + fechadosMes, 0) : null,
    fechadosHoje: temDados ? listas.reduce((total, lista) => total + contar(lista, fechadoHoje), 0) : null,
    dias: temDados ? diasRecentes(recebidosPorDia(listas), hoje) : [],
    ranking,
    // Os mesmos números do card de cada um em "Todo o Tempo".
    tickets: comChamados.map(({ id, nome }) => ({
      id,
      nome,
      comODesenvolvedor: contar(listaDe(id), ({ status }) => status === COM_O_DESENVOLVEDOR),
    })),
    fila: filaDaEquipe(listas),
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
