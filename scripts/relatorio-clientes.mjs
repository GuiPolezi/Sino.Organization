// Relatório do mapa de clientes: lê os locais do Milldesk e mostra os casos que
// merecem conferência (cidade não reconhecida, situada por aproximação, nome e
// cadastro que discordam). Não grava nada: o site lê os clientes da API
// (/api/clientes). Use o relatório para ajustar scripts/data/client-overrides.json.
//
// Uso (lê MILLDESK_API_KEY do .env):
//   npm run relatorio:clientes
//   npm run relatorio:clientes -- --from arq.json   (usa um JSON local no formato da API)
import { readFile } from 'node:fs/promises';
import { ClientesError, montarClientes } from './lib/build-clients.mjs';
import { MilldeskError, fetchMilldesk, toRecords } from './lib/milldesk.mjs';

const lerJson = async (caminho) => JSON.parse(await readFile(caminho, 'utf8'));
const origem = process.argv.indexOf('--from');

try {
  const registros = toRecords(origem !== -1 ? await lerJson(process.argv[origem + 1]) : await fetchMilldesk('listLocals'));
  const { clientes, relatorio } = montarClientes(registros, {
    municipios: await lerJson(new URL('./data/municipios.json', import.meta.url)),
    overrides: await lerJson(new URL('./data/client-overrides.json', import.meta.url)),
  });

  const secao = (titulo, linhas) =>
    linhas.length ? `${linhas.length} ${titulo}:\n${linhas.map((l) => `  - ${l}`).join('\n')}\n` : '';
  process.stdout.write(
    `${relatorio.lidos} locais habilitados lidos (${relatorio.desabilitados} desabilitados e ${relatorio.excluidos} excluídos ignorados): ` +
      `${clientes.totals.clients} clientes em ${clientes.totals.cities} cidades e ${clientes.totals.states} estados\n` +
      secao('locais sem cidade reconhecida (ficam fora do mapa)', relatorio.semCidade) +
      secao('locais com o nome da cidade abreviado, situados por aproximação (confira)', relatorio.aproximados) +
      secao('locais situados só pelo nome, sem CEP nem cadastro que confirmem (confira)', relatorio.naoConfirmados) +
      secao('locais sem cidade no nome, situados pela cidade do cadastro (confira)', relatorio.peloCadastro) +
      secao('locais em que nome e cadastro discordam, situados pelo cadastro (confira)', relatorio.conflitos),
  );
} catch (erro) {
  if (!(erro instanceof MilldeskError || erro instanceof ClientesError)) throw erro;
  process.stderr.write(`${erro.message}\n`);
  process.exit(1);
}
