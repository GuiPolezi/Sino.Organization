// Importa uma planilha de Atualizações (um .xlsx por pessoa) para o Supabase.
// Por padrão é um dry-run: lê, confere e mostra o relatório, sem gravar nada.
//
// Uso (lê SUPABASE_URL e SUPABASE_SECRET_KEY do .env só com --gravar):
//   npm run importar:planilhas -- --pessoa nathalia "<arquivo.xlsx>"
//   npm run importar:planilhas -- --pessoa nathalia "<arquivo.xlsx>" --gravar
//
// Nunca coloque os .xlsx no repositório: têm nomes e números reais.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { criarClienteSupabase } from '../server/supabase.mjs';
import { lerArquivoExcel } from './lib/compilacao/leitor-excel.mjs';
import { lerPlanilha } from './lib/compilacao/planilha.mjs';
import { gravarAba, montarPayload } from './lib/compilacao/planilhas-banco.mjs';
import { montarRelatorio } from './lib/compilacao/planilhas-relatorio.mjs';

const CONFIG_URL = new URL('./data/compilacao-planilhas.json', import.meta.url);

function falhar(mensagem) {
  process.stderr.write(`${mensagem}\n`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  options: { pessoa: { type: 'string' }, gravar: { type: 'boolean', default: false } },
  allowPositionals: true,
});
const [arquivo] = positionals;
const configuracao = JSON.parse(await readFile(CONFIG_URL, 'utf8'));
const config = configuracao[values.pessoa];

if (!config) falhar(`Use --pessoa com um destes ids: ${Object.keys(configuracao).join(', ')}.`);
if (!arquivo) falhar('Informe o arquivo .xlsx.');

const sha256 = createHash('sha256').update(await readFile(arquivo)).digest('hex');
const resultado = lerPlanilha(await lerArquivoExcel(arquivo), config);
process.stdout.write(
  `${montarRelatorio({ pessoa: values.pessoa, arquivo, resultado, modoDeficit: config.modoDeficit, gravar: values.gravar })}\n`,
);

const comErro = resultado.abas.filter((a) => a.erro);
if (comErro.length) falhar(`\n${comErro.length} aba(s) com erro: nada foi gravado.`);
if (!values.gravar) process.exit(0);

const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: chave } = process.env;
if (!url || !chave) falhar('Defina SUPABASE_URL e SUPABASE_SECRET_KEY no .env para gravar.');
const pedir = criarClienteSupabase({ url, chave });
// Gancho: passe `resolverCidadeId` aqui quando a resolução cidade -> cidadeId existir.
for (const aba of resultado.abas) {
  await gravarAba(pedir, montarPayload(aba, { personagem: values.pessoa, arquivoSha256: sha256 }));
}
process.stdout.write(`\n${resultado.abas.length} abas gravadas.\n`);
