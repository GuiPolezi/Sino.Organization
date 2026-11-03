// Fase F3 do /compilacao: lê e grava no Supabase a atribuição de cada pessoa de
// Projetos Novos (tabela compilacao_atribuicoes) e o retrato diário do estoque
// (compilacao_versionadas_diario). Sem Supabase, ou sem a migração 0004, tudo
// segue sem memória (o projeto é inferido a cada busca e "Desde" fica vazio).
import { decidirAtribuicao, inferirPorDia, instanteParaIso } from '../scripts/lib/compilacao/atribuicao.mjs';
import { instanteDoItem } from '../scripts/lib/compilacao/itens.mjs';
import { inferirProjeto } from '../scripts/lib/compilacao/projeto.mjs';
import { normalizar } from '../scripts/lib/compilacao/tipos.mjs';

const ehListaDeIds = (ids) => Array.isArray(ids) && ids.length > 0 && ids.every(Number.isInteger);

/** Acesso às duas tabelas pela API REST do Supabase (`pedir` de server/supabase.mjs). */
export function repositorioAtribuicoes(pedir) {
  return {
    // Em vigor (ate vazio), da mais nova para a mais antiga.
    async abertas(personagens) {
      if (personagens.length === 0) return [];
      const quem = `personagem=in.(${personagens.map(encodeURIComponent).join(',')})`;
      const linhas = await pedir(
        `/compilacao_atribuicoes?select=id,personagem,cidade_uf,modulo_ids,origem,desde&ate=is.null&${quem}&order=criada_em.desc`,
      );
      return Array.isArray(linhas) ? linhas : [];
    },
    // `ate` = null reabre (desfaz um fechamento cuja troca não chegou a gravar).
    async fechar(id, ate) {
      await pedir(`/compilacao_atribuicoes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ ate }),
      });
    },
    async abrir(linha) {
      await pedir('/compilacao_atribuicoes', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify(linha),
      });
    },
    async gravarRetrato(linhas) {
      if (linhas.length === 0) return;
      await pedir('/compilacao_versionadas_diario', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(linhas),
      });
    },
  };
}

// A manual em vigor mais nova ganha; senão, a inferida em vigor.
function atribuicaoAtual(abertas, personagem) {
  const daPessoa = abertas.filter((l) => l.personagem === personagem && typeof l.cidade_uf === 'string' && ehListaDeIds(l.modulo_ids));
  const linha = daPessoa.find((l) => l.origem === 'manual') ?? daPessoa.find((l) => l.origem === 'inferida');
  return linha ? { id: linha.id, cidadeUf: linha.cidade_uf, moduloIds: linha.modulo_ids, origem: linha.origem, desde: linha.desde } : null;
}

// "Desde" de um projeto novo. Mesma cidade (só mudou o tipo): a 1ª ação dos dias
// que confirmaram a troca. Cidade nova: a 1ª versão da pessoa naquela cidade.
async function desdeDoProjeto({ cliente, membro, projeto, cidadeId, mesmaCidade, porDia, agora }) {
  const doCaso = porDia.map((d) => d.primeiraAcao).filter(Boolean).sort()[0];
  if (!mesmaCidade && cidadeId) {
    try {
      const item = await cliente.ultimoItem('Auditoria', { usuarioId: membro.usuarioId, cidadeId, modulo: 'Versões' });
      // Se o painel ignorasse o filtro de cidade, o registro seria de outra cidade.
      if (item && normalizar(item.cidadeUf ?? '') === normalizar(projeto.cidadeUf)) return instanteParaIso(instanteDoItem(item));
    } catch {
      // fica com a 1ª ação dos últimos dias
    }
  }
  return doCaso ? instanteParaIso(doCaso) : agora.toISOString();
}

/**
 * Decide (e grava) o projeto de cada pessoa de Projetos Novos.
 * @returns {Promise<Record<string, { cidadeUf: string, moduloIds: number[], desde: string | null } | null> | undefined>}
 *   undefined quando não há memória (sem Supabase ou sem a tabela): o montador infere.
 */
export async function decidirProjetos({ repo, cliente, equipe, auditoria, catalogo, idPorCidadeUf, agora, avisar }) {
  if (!repo) return undefined;
  const deProjetos = equipe.filter((m) => m.funcao === 'projetos');
  let abertas;
  try {
    abertas = await repo.abertas(deProjetos.map((m) => m.personagem));
  } catch {
    avisar('atribuições do Supabase indisponíveis (a migração 0004 foi rodada?); projeto inferido sem memória');
    return undefined;
  }

  const decididos = {};
  for (const membro of deProjetos) {
    const entrada = auditoria[membro.usuarioId];
    const atual = atribuicaoAtual(abertas, membro.personagem);
    const inferido = entrada ? inferirProjeto(entrada, catalogo) : null;
    const porDia = inferirPorDia(entrada, catalogo);
    const { acao, projeto } = entrada ? decidirAtribuicao({ atual, inferido, porDia }) : { acao: 'manter', projeto: atual };

    if (acao === 'manter' || acao === 'nada') {
      decididos[membro.personagem] = projeto ? { cidadeUf: projeto.cidadeUf, moduloIds: projeto.moduloIds, desde: acao === 'manter' ? projeto.desde : null } : null;
      continue;
    }

    const cidadeId = idPorCidadeUf.get(normalizar(projeto.cidadeUf)) ?? null;
    const mesmaCidade = acao === 'trocar' && atual.cidadeUf === projeto.cidadeUf;
    const desde = await desdeDoProjeto({ cliente, membro, projeto, cidadeId, mesmaCidade, porDia, agora });
    decididos[membro.personagem] = { cidadeUf: projeto.cidadeUf, moduloIds: projeto.moduloIds, desde };
    // Na troca, fecha a antiga antes de abrir a nova (só uma inferida aberta por pessoa).
    // Se a nova não gravar, reabre a antiga: senão a próxima busca abriria um projeto
    // de um dia só, sem a regra dos 2 dias.
    let fechada = false;
    try {
      if (acao === 'trocar') {
        await repo.fechar(atual.id, agora.toISOString());
        fechada = true;
      }
      await repo.abrir({
        personagem: membro.personagem,
        cidade_uf: projeto.cidadeUf,
        cidade_id: cidadeId,
        modulo_ids: projeto.moduloIds,
        origem: 'inferida',
        desde,
        motivo: acao === 'trocar' ? 'troca confirmada em 2 dias com ação' : 'primeira atribuição',
      });
    } catch {
      if (fechada) await repo.fechar(atual.id, null).catch(() => {});
      avisar(`não foi possível gravar a atribuição de ${membro.personagem}`);
    }
  }
  return decididos;
}

/** Linhas do retrato do dia (uma por par cidade×tipo com estoque que fecha). */
export function linhasDoRetrato({ estoque, pares, idPorCidadeUf, hoje, agora }) {
  const linhas = [];
  for (const { cidadeUf, moduloId } of pares) {
    const e = estoque[`${cidadeUf}|${moduloId}`];
    const cidadeId = idPorCidadeUf.get(normalizar(cidadeUf));
    if (!e || !cidadeId || e.versionadas + e.naoVersionadas !== e.total) continue;
    linhas.push({
      data: hoje,
      cidade_id: cidadeId,
      modulo_id: moduloId,
      cidade_uf: cidadeUf,
      total: e.total,
      versionadas: e.versionadas,
      nao_versionadas: e.naoVersionadas,
      capturado_em: agora.toISOString(),
    });
  }
  return linhas;
}
