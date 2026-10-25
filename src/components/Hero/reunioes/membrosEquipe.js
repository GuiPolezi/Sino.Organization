import { useEffect, useSyncExternalStore } from 'react';
import { buscarDados } from '../../../api/buscarApi.js';
import { chaveMembro } from './reunioes.js';

/*
 * Quem é cada membro de reunião: o boneco da equipe (suporte ou desenvolvimento)
 * se o nome bater, ou um boneco próprio, gerado pelo id do membro. Serve à tela
 * de Reuniões da home e à página do cenário de reunião.
 *
 * As equipes vêm da API do site (/api/equipes/*, que lê o Milldesk) uma vez por
 * carregamento de página. Até chegarem, todo membro aparece com boneco próprio;
 * quem usa `useEquipes()` é renderizado de novo quando elas chegam.
 */

let pessoas = []; // suporte + desenvolvimento: { id, name, role, absent }
let porNome = new Map();
let ordenadas = [];
let carregando = null;
const ouvintes = new Set();

/** Troca as equipes conhecidas e avisa quem está ouvindo (também usado nos testes). */
export function definirEquipes(lista) {
  pessoas = lista;
  porNome = new Map(lista.map((pessoa) => [chaveMembro(pessoa.name), pessoa]));
  // Sem repetir id, em ordem alfabética: a lista do seletor de personagens.
  ordenadas = [...new Map(lista.map((p) => [p.id, p])).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  ouvintes.forEach((avisar) => avisar());
}

/** Busca as duas equipes (uma vez; se falhar, a próxima chamada tenta de novo). */
export function carregarEquipes() {
  carregando ??= Promise.all([buscarDados('/api/equipes/suporte'), buscarDados('/api/equipes/desenvolvimento')])
    .then(([suporte, desenvolvimento]) => {
      definirEquipes([...suporte.team, ...desenvolvimento.team]);
      return pessoas;
    })
    .catch((erro) => {
      carregando = null;
      throw erro;
    });
  return carregando;
}

const inscrever = (avisar) => {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
};

/** As pessoas das equipes; o componente renderiza de novo quando elas chegam. */
export function useEquipes() {
  useEffect(() => {
    carregarEquipes().catch(() => {});
  }, []);
  return useSyncExternalStore(inscrever, () => pessoas);
}

/** Pessoas das equipes sem repetir, em ordem alfabética (lista estável entre renderizações). */
export const pessoasDasEquipes = () => ordenadas;

export function usePessoasDasEquipes() {
  useEquipes();
  return useSyncExternalStore(inscrever, pessoasDasEquipes);
}

/** Nome de quem tem este id na equipe, se houver. */
export const nomeDaPessoa = (id) => pessoas.find((pessoa) => pessoa.id === id)?.name;

// Membro da reunião → id do boneco (o da equipe, se o nome bater) e cargo.
export function identificar(membro) {
  const pessoa = porNome.get(chaveMembro(membro.nome));
  return pessoa ? { id: pessoa.id, cargo: pessoa.role } : { id: membro.id, cargo: null };
}

// "Ana Maria Souza" → "AS"; "Bia" → "B".
export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
