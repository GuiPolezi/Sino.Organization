// Fase F6 do /compilacao: o Todo o Tempo de quem faz Projetos Novos, em normas
// distintas. O histórico (tabela compilacao_historico_normas, migração 0005) guarda
// cada norma de cada pessoa uma vez; a carga inicial roda na máquina do líder
// (scripts/carregar-historico-compilacao.mjs) e cada busca da rota acrescenta as
// normas das versões que ela já leu (a janela, desde o começo da semana ou do mês).
// O Todo o Tempo só aparece se o histórico cobre tudo até o começo dessa janela;
// sem a migração, sem a carga ou com algum pedido falhando, fica "—" com aviso.
import { createHash } from 'node:crypto';
import { dataDoItem, ehDoModulo, ehInclusao } from '../scripts/lib/compilacao/itens.mjs';
import { normasComBalde } from '../scripts/lib/compilacao/normas-distintas.mjs';
import { BALDES } from '../scripts/lib/compilacao/tipos.mjs';

// Linhas por pedido de gravação (o corpo fica bem abaixo do limite do Supabase).
export const LOTE = 1000;

const diaAntes = (data) => new Date(Date.parse(`${data}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Resumo guardado no lugar da chave (cidade + tipo + número/ano, ou o texto): só hexadecimal. */
export const chaveGuardada = (chave) => createHash('sha256').update(chave).digest('hex');

/** Só as versões novas (Versões, ação 1): as mesmas que contam no Mês. */
export const inclusoesDeVersoes = (versoes) =>
  (Array.isArray(versoes) ? versoes : []).filter((i) => ehDoModulo(i, 'Versões') && ehInclusao(i));

/** Linhas do histórico de uma pessoa a partir das versões. Dia sem ação = nenhuma linha. */
export function linhasDoHistorico(personagem, versoes, catalogo, dataPadrao) {
  const normas = normasComBalde(inclusoesDeVersoes(versoes), catalogo, dataDoItem);
  return [...normas].map(([chave, { balde, data }]) => ({
    personagem,
    chave: chaveGuardada(chave),
    balde,
    primeira_data: data ?? dataPadrao,
  }));
}

/** Totais da view (linhas { personagem, balde, normas }) -> { personagem: { total, porBalde } }. */
export function totaisPorPessoa(linhas, personagens) {
  const resultado = {};
  for (const personagem of personagens) {
    resultado[personagem] = { total: 0, porBalde: Object.fromEntries(BALDES.map((b) => [b, 0])) };
  }
  for (const { personagem, balde, normas } of Array.isArray(linhas) ? linhas : []) {
    const pessoa = resultado[personagem];
    if (!pessoa || !Object.hasOwn(pessoa.porBalde, balde) || !Number.isInteger(normas) || normas < 0) continue;
    pessoa.porBalde[balde] += normas;
    pessoa.total += normas;
  }
  return resultado;
}

/** Acesso às tabelas da F6 pela API REST do Supabase (`pedir` de server/supabase.mjs). */
export function repositorioHistorico(pedir) {
  const quem = (personagens) => `personagem=in.(${personagens.map(encodeURIComponent).join(',')})`;
  return {
    // personagem -> 'AAAA-MM-DD' (até que dia o histórico está completo).
    async cargas(personagens) {
      if (personagens.length === 0) return new Map();
      const linhas = await pedir(`/compilacao_historico_carga?select=personagem,carregado_ate&${quem(personagens)}`);
      if (!Array.isArray(linhas)) throw new Error('formato inesperado');
      return new Map(linhas.map((l) => [l.personagem, l.carregado_ate]));
    },
    // Rota: norma que já está no histórico fica como está (guarda a data mais antiga).
    // Carga: `substituir` regrava a data, que ali é a primeira de todo o histórico.
    async gravarNormas(linhas, { substituir = false } = {}) {
      const resolucao = substituir ? 'merge-duplicates' : 'ignore-duplicates';
      for (let i = 0; i < linhas.length; i += LOTE) {
        await pedir('/compilacao_historico_normas', {
          method: 'POST',
          headers: { prefer: `resolution=${resolucao},return=minimal` },
          body: JSON.stringify(linhas.slice(i, i + LOTE)),
        });
      }
    },
    // Rota: só avança quem JÁ tem carga (PATCH não cria linha). Se a carga da pessoa
    // foi apagada no meio de uma recarga, nada muda e o Todo o Tempo dela segue "—".
    async avancarCargas(personagens, ate, agora) {
      if (personagens.length === 0) return;
      await pedir(`/compilacao_historico_carga?${quem(personagens)}&carregado_ate=lt.${encodeURIComponent(ate)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ carregado_ate: ate, atualizado_em: agora }),
      });
    },
    // Só a carga: cria ou regrava a linha da pessoa.
    async marcarCargas(linhas) {
      if (linhas.length === 0) return;
      await pedir('/compilacao_historico_carga', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(linhas),
      });
    },
    // Só a carga com --refazer: tira a marca primeiro (o Todo o Tempo da pessoa vira
    // "—", nunca um número pela metade) e depois apaga as normas dela.
    async apagarPessoa(personagem) {
      const dela = `personagem=eq.${encodeURIComponent(personagem)}`;
      await pedir(`/compilacao_historico_carga?${dela}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
      await pedir(`/compilacao_historico_normas?${dela}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    },
    async totais(personagens) {
      if (personagens.length === 0) return [];
      const linhas = await pedir(`/compilacao_historico_totais?select=personagem,balde,normas&${quem(personagens)}`);
      if (!Array.isArray(linhas)) throw new Error('formato inesperado');
      return linhas;
    },
  };
}

/**
 * Todo o Tempo de cada pessoa de Projetos Novos cujo histórico está completo:
 * { personagem: { total, porBalde } }. Quem fica de fora tem Todo o Tempo "—".
 * Grava antes de ler, para que a janela desta busca já conte (I12).
 * @param {{
 *   repo: ReturnType<typeof repositorioHistorico> | null,
 *   equipe: { usuarioId: string, personagem: string, funcao: string }[],
 *   auditoria: Record<string, { versoes?: object[] }>,
 *   catalogo: object[],
 *   catalogoDoSistema: boolean,
 *   hoje: string,
 *   inicioVersoes: string,
 *   agora: Date,
 *   avisar: (mensagem: string) => void,
 * }} opcoes
 */
export async function todoOTempoDosProjetos({ repo, equipe, auditoria, catalogo, catalogoDoSistema, hoje, inicioVersoes, agora, avisar }) {
  if (!repo) return {};
  const comAuditoria = equipe.filter((m) => m.funcao === 'projetos' && auditoria?.[m.usuarioId]);
  if (comAuditoria.length === 0) return {};

  let cargas;
  try {
    cargas = await repo.cargas(comAuditoria.map((m) => m.personagem));
  } catch {
    avisar('não foi possível ler o histórico do Todo o Tempo (a migração 0005 foi rodada?)');
    return {};
  }
  // A chave da norma depende do catálogo de tipos: com o catálogo fixo, as chaves
  // podiam não bater com as da carga e a mesma norma contaria duas vezes.
  if (!catalogoDoSistema) {
    avisar('sem o catálogo de tipos do sistema, o Todo o Tempo fica "—"');
    return {};
  }

  const completos = [];
  for (const membro of comAuditoria) {
    const ate = cargas.get(membro.personagem);
    if (!ate) {
      avisar(`histórico de ${membro.personagem} ainda não carregado`);
    } else if (ate < diaAntes(inicioVersoes)) {
      avisar(`histórico de ${membro.personagem} parou em ${ate}; rode a carga de novo`);
    } else {
      completos.push(membro);
    }
  }
  if (completos.length === 0) return {};

  const linhas = completos.flatMap((m) => linhasDoHistorico(m.personagem, auditoria[m.usuarioId].versoes, catalogo, hoje));
  try {
    await repo.gravarNormas(linhas);
  } catch {
    avisar('não foi possível gravar o histórico do Todo o Tempo');
    return {};
  }
  const avancar = completos.filter((m) => cargas.get(m.personagem) < hoje).map((m) => m.personagem);
  await repo
    .avancarCargas(avancar, hoje, agora.toISOString())
    .catch(() => avisar('não foi possível marcar até onde vai o histórico do Todo o Tempo'));

  try {
    const personagens = completos.map((m) => m.personagem);
    return totaisPorPessoa(await repo.totais(personagens), personagens);
  } catch {
    avisar('não foi possível ler os totais do Todo o Tempo');
    return {};
  }
}

