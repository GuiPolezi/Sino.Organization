// Carga inicial do Todo o Tempo de Projetos Novos (fase F6). Roda na máquina do
// líder, depois da migração 0005: lê do sistema (só GET) todas as versões novas de
// cada pessoa de Projetos Novos até ontem (~45 pedidos para as quatro) e grava no
// Supabase uma linha por norma distinta. Depois disso, cada busca da rota mantém
// o histórico em dia.
//
// Uso: node --env-file=.env scripts/carregar-historico-compilacao.mjs [--refazer] [personagem ...]
// Sem nomes, carrega todas as pessoas de Projetos Novos. Quem já foi carregado é
// pulado (dá para rodar de novo depois de uma falha); --refazer apaga o histórico
// da pessoa e carrega de novo (assim não sobra norma com chave antiga, por exemplo
// depois de o sistema mudar a lista de tipos). Enquanto recarrega, o Todo o Tempo
// dela fica "—" na página.
// Na tela só aparecem o id público de personagem e contagens.
import { conferirUmaPessoa, lerCatalogo } from '../server/compilacao.mjs';
import { linhasDoHistorico, repositorioHistorico, totaisPorPessoa } from '../server/compilacao-historico.mjs';
import { criarClienteLegislacaoDoAmbiente } from '../server/legislacao.mjs';
import { criarClienteSupabase } from '../server/supabase.mjs';
import { lerEquipe } from './lib/compilacao/configuracao.mjs';
import { calcularPeriodos } from './lib/compilacao/periodos.mjs';

const INICIO = '2000-01-01';

const argumentos = process.argv.slice(2);
const refazer = argumentos.includes('--refazer');
const nomes = argumentos.filter((a) => !a.startsWith('--'));

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY no .env.');
}
const repo = repositorioHistorico(criarClienteSupabase({ url: process.env.SUPABASE_URL, chave: process.env.SUPABASE_SECRET_KEY }));
const cliente = criarClienteLegislacaoDoAmbiente();

const { hoje } = calcularPeriodos(new Date());
// Até ontem: a lista não muda enquanto pagina (a Auditoria vem do mais novo para o
// mais antigo, e uma ação nova no meio da carga deslocaria as páginas).
const ontem = new Date(Date.parse(`${hoje}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

const projetos = lerEquipe(process.env.COMPILACAO_EQUIPE).filter((m) => m.funcao === 'projetos');
const desconhecidos = nomes.filter((n) => !projetos.some((m) => m.personagem === n));
if (desconhecidos.length > 0) throw new Error(`Não são de Projetos Novos: ${desconhecidos.join(', ')}`);
const alvo = nomes.length > 0 ? projetos.filter((m) => nomes.includes(m.personagem)) : projetos;

const { catalogo, doSistema } = await lerCatalogo(cliente, (m) => console.warn(m));
if (!doSistema) throw new Error('Sem o catálogo de tipos do sistema (ModulosNorma); tente de novo mais tarde.');

const cargas = await repo.cargas(alvo.map((m) => m.personagem)).catch(() => {
  throw new Error('Não deu para ler compilacao_historico_carga. A migração 0005 foi rodada no Supabase?');
});

console.log(`Carga do Todo o Tempo até ${ontem}`);
for (const membro of alvo) {
  const ja = cargas.get(membro.personagem);
  if (ja && !refazer) {
    console.log(`${membro.personagem}: já carregado até ${ja} (use --refazer para carregar de novo)`);
    continue;
  }
  // Sempre do zero: também limpa o que sobrou de uma carga que parou no meio.
  await repo.apagarPessoa(membro.personagem);
  const filtro = { usuarioId: membro.usuarioId, modulo: 'Versões', acao: 1, dataInicial: INICIO, dataFinal: ontem };
  const versoes = await cliente.listarTudo('Auditoria', filtro);
  conferirUmaPessoa([versoes]);
  const linhas = linhasDoHistorico(membro.personagem, versoes, catalogo, ontem);
  await repo.gravarNormas(linhas, { substituir: true });
  await repo.marcarCargas([{ personagem: membro.personagem, carregado_ate: ontem, atualizado_em: new Date().toISOString() }]);
  const { total } = totaisPorPessoa(await repo.totais([membro.personagem]), [membro.personagem])[membro.personagem];
  console.log(`${membro.personagem}: ${versoes.length} versões, ${linhas.length} normas distintas, ${total} no histórico`);
}
console.log('Pronto.');
