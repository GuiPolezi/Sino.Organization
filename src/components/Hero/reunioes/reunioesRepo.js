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

export const CHAVE_STORAGE = 'sino.reunioes.v1';

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
  Array.isArray(r.membros) &&
  r.membros.every((m) => m != null && ehTexto(m.id) && ehTexto(m.nome));

export const carregarReunioes = (storage = obterStorage()) => {
  try {
    const bruto = storage?.getItem(CHAVE_STORAGE);
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
