// Configuração da equipe (env COMPILACAO_EQUIPE), validada na borda (I5, I7):
// { "<usuarioId>": { "personagem": "<id>", "funcao": "projetos" | "atualizacoes" } }
// Os erros daqui são seguros para mostrar: nunca repetem o que veio no env.
import { ELENCO, FUNCOES } from './elenco.mjs';

export class CompilacaoError extends Error {}

const invalida = () => new CompilacaoError('A configuração da equipe do /compilacao (COMPILACAO_EQUIPE) está inválida.');

function lerObjeto(bruto) {
  if (bruto && typeof bruto === 'object' && !Array.isArray(bruto)) return bruto;
  if (typeof bruto !== 'string' || !bruto.trim()) throw invalida();
  try {
    const objeto = JSON.parse(bruto);
    if (objeto && typeof objeto === 'object' && !Array.isArray(objeto)) return objeto;
  } catch {
    // cai no erro seguro abaixo
  }
  throw invalida();
}

/**
 * Devolve [{ usuarioId, personagem, funcao }] na ordem do elenco.
 * @param {string | object | undefined} bruto texto JSON do env (ou o objeto já lido)
 */
export function lerEquipe(bruto, elenco = ELENCO) {
  const entradas = Object.entries(lerObjeto(bruto));
  if (entradas.length === 0) throw invalida();
  const pessoas = entradas.map(([usuarioId, valor]) => {
    const ok =
      /^\d+$/.test(usuarioId) &&
      valor &&
      elenco.includes(valor.personagem) &&
      FUNCOES.includes(valor.funcao);
    if (!ok) throw invalida();
    return { usuarioId, personagem: valor.personagem, funcao: valor.funcao };
  });
  if (new Set(pessoas.map((p) => p.personagem)).size !== pessoas.length) throw invalida();
  return pessoas.sort((a, b) => elenco.indexOf(a.personagem) - elenco.indexOf(b.personagem));
}
