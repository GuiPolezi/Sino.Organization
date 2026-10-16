/*
 * O que o quadro da cena de /desenvolvimento escreve (o painel que ele abre tem
 * as contas dele em visaoGeral.js). Sai dos mesmos chamados dos cards
 * (api/chamados.js), somados para a equipe.
 * Como no card, cada chamado conta no dia em que foi atribuído: "fechado no mês"
 * é o chamado atribuído no mês corrente, até hoje, que já está fechado.
 */
import { diasRecentes } from '../../Suporte/mappers/atendimentos.js';
import { FECHADO, compararStatus } from './chamados.js';

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
 * Tudo o que o quadro mostra. Sem chamados carregados, os totais
 * saem null e as listas vazias: só o tamanho da equipe aparece.
 *
 * @param {Tecnico[]} tecnicos
 * @param {Record<string, ChamadosDesenvolvedor>} [chamados] por id do desenvolvedor
 * @param {string} hoje "AAAA-MM-DD"
 */
export function resumoEquipe(tecnicos, chamados = {}, hoje) {
  const comChamados = tecnicos.filter(({ id }) => Array.isArray(chamados[id]?.lista));
  const listas = comChamados.map(({ id }) => chamados[id].lista);
  const temDados = comChamados.length > 0;

  const mes = hoje.slice(0, 7);
  const fechadoNoMes = ({ data, status }) => status === FECHADO && data.startsWith(mes) && data <= hoje;

  return {
    totalDesenvolvedores: tecnicos.length,
    fechadosMes: temDados ? listas.reduce((total, lista) => total + contar(lista, fechadoNoMes), 0) : null,
    dias: temDados ? diasRecentes(recebidosPorDia(listas), hoje) : [],
    fila: filaDaEquipe(listas),
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
