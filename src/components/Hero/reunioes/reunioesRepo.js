// Repositório das reuniões: hoje grava no localStorage do navegador.
//
// TODO(banco de dados): quando houver backend, trocar SÓ este arquivo
// (a tela e o hook não sabem de onde os dados vêm):
//  - carregarReunioes/salvarReunioes viram chamadas assíncronas à API
//    (GET /reunioes, POST /reunioes, DELETE /reunioes/:id) em vez de
//    regravar a lista inteira; o hook passa a tratar loading/erro.
//  - Ids de reunião e de membro passam a ser gerados pelo servidor
//    (gerarId em reunioes.js vira só id temporário/otimista).
//  - O servidor repete a validação de reunioes.js (título, data futura,
//    modalidade, membros) — o cliente não é confiável.
//  - Unicidade de membro por reunião garantida por constraint
//    (ex.: UNIQUE(reuniao_id, chave_membro), com chave sem acento/caixa).
//  - Membros devem virar referência a usuários reais (usuario_id), não texto.
//  - Isolar por empresa/usuário logado (hoje é tudo deste navegador).
//  - Migrar o que estiver em CHAVE_STORAGE na primeira carga e apagar a chave.

import { gerarReunioesExemplo } from './reunioesSeed.js';

export const CHAVE_STORAGE = 'sino.reunioes.v1';

// TODO(banco de dados): demonstração. Marca que os exemplos de
// reunioesSeed.js já foram semeados neste navegador; remover junto com o
// seed quando as reuniões vierem do servidor.
export const CHAVE_EXEMPLOS = 'sino.reunioes.exemplos.v1';

// localStorage pode não existir (SSR/testes) ou lançar (modo privado/bloqueado).
const obterStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const ehTexto = (v) => typeof v === 'string' && v.length > 0;

// Descarta itens fora do formato esperado em vez de quebrar a tela.
const ehReuniaoValida = (r) =>
  r != null &&
  typeof r === 'object' &&
  ehTexto(r.id) &&
  ehTexto(r.titulo) &&
  ehTexto(r.dataHora) &&
  ehTexto(r.modalidade) &&
  (r.horaFim == null || ehTexto(r.horaFim)) && // opcional (reuniões antigas)
  Array.isArray(r.membros) &&
  r.membros.every((m) => m != null && ehTexto(m.id) && ehTexto(m.nome));

// TODO(banco de dados): demonstração — remover com reunioesSeed.js.
// Semeia os exemplos UMA vez por navegador: se CHAVE_EXEMPLOS não existe,
// ADICIONA os exemplos ao que já está salvo e grava a marca. Se o usuário
// apagar os exemplos, eles não voltam. Não mexe em dado corrompido nem
// marca nada se o storage falhar. Devolve true se semeou.
export const semearExemplos = (storage = obterStorage(), agora = new Date()) => {
  try {
    if (!storage || storage.getItem(CHAVE_EXEMPLOS) != null) return false;
    const bruto = storage.getItem(CHAVE_STORAGE);
    const atuais = bruto ? JSON.parse(bruto) : [];
    if (!Array.isArray(atuais)) return false;
    // Marca antes: se a lista não gravar, nunca duplica os exemplos.
    storage.setItem(CHAVE_EXEMPLOS, agora.toISOString());
    storage.setItem(
      CHAVE_STORAGE,
      JSON.stringify([...atuais, ...gerarReunioesExemplo(agora)]),
    );
    return true;
  } catch {
    return false;
  }
};

// Sem `storage` (uso normal da tela) usa o localStorage e semeia os
// exemplos; com `storage` explícito (testes) não semeia, salvo
// `{ semear: true }`.
export const carregarReunioes = (storage, { semear = storage === undefined } = {}) => {
  const alvo = storage === undefined ? obterStorage() : storage;
  if (semear) semearExemplos(alvo);
  try {
    const bruto = alvo?.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehReuniaoValida) : [];
  } catch {
    return [];
  }
};

// Devolve true se gravou (cota cheia ou storage bloqueado -> false).
export const salvarReunioes = (lista, storage = obterStorage()) => {
  try {
    if (!storage) return false;
    storage.setItem(CHAVE_STORAGE, JSON.stringify(Array.isArray(lista) ? lista : []));
    return true;
  } catch {
    return false;
  }
};
