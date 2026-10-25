// Entra no Sino.Licença e gera src/data/licencas.json com as licenças das duas
// tabelas da página inicial (vencidas e com vencimento próximo) e o total de
// clientes cadastrados. O site não tem API; o acesso está em scripts/lib/licenca.mjs
// e a leitura do HTML em scripts/lib/build-licencas.mjs. A senha nunca sai daqui.
//
// Uso:
//   npm run sync:licencas                        (lê LICENCA_USUARIO e LICENCA_SENHA do .env)
//   npm run sync:licencas -- --from pasta/       (usa inicio.html e clientes.html já baixados)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { montarLicencas } from './lib/build-licencas.mjs';
import { LicencaError, baixarPaginas } from './lib/licenca.mjs';

const OUTPUT = 'src/data/licencas.json';

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const lerPaginas = async () => {
  const origem = process.argv.indexOf('--from');
  if (origem === -1) return baixarPaginas();
  const pasta = process.argv[origem + 1];
  return {
    inicio: await readFile(path.join(pasta, 'inicio.html'), 'utf8'),
    clientes: await readFile(path.join(pasta, 'clientes.html'), 'utf8'),
  };
};

// Em qualquer falha o arquivo atual fica como está.
const resultado = await lerPaginas()
  .then(montarLicencas)
  .catch((error) => fail(`${error instanceof LicencaError ? error.message : `Erro: ${error.message}`} ${OUTPUT} não foi alterado.`));
const { totalClientes, licencas, invalidas } = resultado;

await mkdir('src/data', { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify({ source: 'sino-licenca', geradoEm: new Date().toISOString(), totalClientes, licencas })}\n`,
);

const clientes = new Set(licencas.map((l) => l.clienteId)).size;
process.stdout.write(
  [
    `${licencas.length} licenças de ${clientes} clientes -> ${OUTPUT}`,
    `Clientes cadastrados: ${totalClientes ?? 'não encontrado'}`,
    ...(invalidas ? [`Linhas sem cliente, data ou sistema, ignoradas: ${invalidas}`] : []),
  ].join('\n') + '\n',
);
