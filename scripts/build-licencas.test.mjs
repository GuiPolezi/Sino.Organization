import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataIso, decodificarHtml, lerTabela, lerTotalClientes, montarLicencas } from './lib/build-licencas.mjs';

// Recorte do HTML da página inicial do Sino.Licença, no mesmo formato do site.
const tabela = (titulo, linhas) => `
    <div class="table-responsive">
        <table class="table table-striped table-hover">
            <caption><h3>${titulo}</h3></caption>
            <thead>
            <tr>
                <th>Cliente</th>
                <th class="text-center">Data</th>
                <th class="text-center">Sistema</th>
            </tr>
            </thead>
            <tbody>${linhas
              .map(
                ([id, nome, data, sistema]) => `
                <tr>
                    <td><a href="/Clientes/Details/${id}">${nome}</a></td>
                    <td class="text-center">${data}</td>
                    <td class="text-center">${sistema}</td>
                </tr>`,
              )
              .join('')}
            </tbody>
        </table>
    </div>`;

const INICIO = `<h2 class="page-header">Início</h2>
${tabela('Licenças Com Vencimento Próximo', [
  [20, 'C&#226;mara Municipal de Araras', '08/11/2026', 'Siscam'],
  [20, 'C&#226;mara Municipal de Araras', '08/11/2026', 'Workflow'],
])}
${tabela('Licenças Vencidas', [
  [78, 'C&#226;mara Municipal de Guaruj&#225;', '19/10/2026', 'Arquivamento'],
  [505, 'C&#226;mara Municipal de Santa B&#225;rbara D&#180;Oeste', '12/10/2026', 'Siscam'],
  [0, 'Sem link', '12/10/2026', 'Siscam'],
  [99, 'Data errada', '31/02/2026', 'Siscam'],
])}`;

const CLIENTES = '<p>\n                229 registro(s) encontrado(s)\n</p>';

test('decodificarHtml troca entidades numéricas e nomeadas', () => {
  assert.equal(decodificarHtml('C&#226;mara &amp; S&#xE3;o Jos&#233;'), 'Câmara & São José');
});

test('dataIso converte dd/mm/aaaa e recusa datas impossíveis', () => {
  assert.equal(dataIso('08/11/2026'), '2026-11-08');
  assert.equal(dataIso('31/02/2026'), null);
  assert.equal(dataIso('2026-11-08'), null);
});

test('lerTabela lê cliente, id, data e sistema e descarta linhas incompletas', () => {
  const { linhas, invalidas } = lerTabela(INICIO, 'Licenças Vencidas');
  assert.deepEqual(linhas, [
    { clienteId: 78, nome: 'Câmara Municipal de Guarujá', sistema: 'Arquivamento', vencimento: '2026-10-19' },
    { clienteId: 505, nome: 'Câmara Municipal de Santa Bárbara D´Oeste', sistema: 'Siscam', vencimento: '2026-10-12' },
  ]);
  assert.equal(invalidas, 2);
});

test('lerTabela falha se a tabela sumir da página', () => {
  assert.throws(() => lerTabela('<h2>Login</h2>', 'Licenças Vencidas'), /não encontrada/);
});

test('lerTotalClientes lê o total da lista de clientes', () => {
  assert.equal(lerTotalClientes(CLIENTES), 229);
  assert.equal(lerTotalClientes('<p>nada</p>'), null);
});

test('montarLicencas junta as duas tabelas da data mais antiga para a mais nova', () => {
  const { totalClientes, licencas, invalidas } = montarLicencas({ inicio: INICIO, clientes: CLIENTES });
  assert.equal(totalClientes, 229);
  assert.equal(invalidas, 2);
  assert.deepEqual(
    licencas.map((l) => `${l.clienteId} ${l.vencimento} ${l.sistema}`),
    ['505 2026-10-12 Siscam', '78 2026-10-19 Arquivamento', '20 2026-11-08 Siscam', '20 2026-11-08 Workflow'],
  );
});
