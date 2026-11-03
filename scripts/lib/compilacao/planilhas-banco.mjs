// Das abas lidas para as linhas do Supabase (supabase/migrations/0003_compilacao_planilhas.sql).
// Só números e sinais vão para o banco: nunca notas, links, títulos nem texto de D/F/I/J.
import { createHash } from 'node:crypto';

const semCidade = () => null;

function linhaDoBanco(linha, base, resolverCidadeId) {
  return {
    ...base,
    cidade: linha.cidade,
    uf: linha.uf,
    // Gancho: quando a resolução cidade -> cidadeId existir (F1), ela entra aqui.
    cidade_id: resolverCidadeId(linha.cidade, linha.uf),
    cidade_status: linha.cidade_status,
    sigla_planilha: linha.sigla,
    modulo_id: linha.moduloId,
    balde: linha.balde,
    total_planilha: linha.total,
    deficit: linha.deficit,
    compiladas: linha.compiladas,
    faltantes: linha.faltantes.total,
    faltantes_do: linha.faltantes.doDO,
    faltantes_siscam: linha.faltantes.siscam,
    faltantes_numeros: linha.faltantes.numeros,
    par_em_alerta: linha.par_em_alerta,
    sigla_duvidosa: linha.sigla_duvidosa,
    nao_municipal: linha.nao_municipal,
  };
}

/**
 * @param {object} aba resultado de lerAba
 * @param {{ personagem: string, arquivoSha256: string, resolverCidadeId?: (cidade: string, uf: string) => number | null }} contexto
 */
export function montarPayload(aba, { personagem, arquivoSha256, resolverCidadeId = semCidade }) {
  const base = { personagem, ano: aba.ano, mes: aba.mes };
  const linhas = aba.linhas.map((l) => linhaDoBanco(l, base, resolverCidadeId));
  const resumo = {
    titulo_confere: aba.tituloConfere,
    total_formula: aba.totalFormula,
    deficit_formula: aba.deficitFormula,
    fragmentos_ilegiveis: aba.fragmentosIlegiveis,
    numeros_suspeitos: aba.numerosSuspeitos,
    avisos: aba.avisos,
  };
  // Hash só do que vai para o banco: reimportar o mesmo conteúdo não muda nada.
  const conteudo = createHash('sha256').update(JSON.stringify({ base, resumo, linhas })).digest('hex');
  return { aba: { ...base, ...resumo, arquivo_sha256: arquivoSha256, conteudo_sha256: conteudo }, linhas };
}

/** Troca, numa transação só, tudo o que há da pessoa naquele mês (função SQL do banco). */
export async function gravarAba(pedir, { aba, linhas }) {
  await pedir('/rpc/compilacao_importar_aba', {
    method: 'POST',
    body: JSON.stringify({ p_aba: aba, p_linhas: linhas }),
  });
}
