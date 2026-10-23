// Casos da classificação dos chamados dos desenvolvedores (scripts/lib/build-chamados.mjs).
// Uso: npm run test:chamados-sync
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OUTROS,
  SEM_ASSUNTO,
  assuntoDoTicket,
  categoriaDoSite,
  cidadesDosClientes,
  montarChamados,
  statusDoSite,
  tipoDoAssunto,
} from './lib/build-chamados.mjs';

test('as categorias do Milldesk caem nas 8 do site, sem depender de caixa ou acento', () => {
  const casos = {
    'Cartórios - Selo Digital': 'Cartórios',
    'Cartórios - Escrituras': 'Cartórios',
    'Cartorios - firmas': 'Cartórios',
    'Cartórios - Financeiro': 'Cartórios',
    'Cartórios - Cobrança': 'Cartórios',
    'Siscam 9 WEB': 'Siscam 9',
    'Siscam 8 - WorkFlow': 'Siscam 8',
    'Siscam 8 - Sino.Assinador': 'Siscam 8',
    Site: 'Site',
    'Site - Transmissão Sessão': 'Site',
    'Site - Ouvidoria e SIC': 'Site',
    'APP Mobile': 'App Mobile',
    'Aplicativo Mobile Campinas': 'App Mobile',
    'Painel de Votação': 'Painel',
    'Sistema - Recepção': 'Sistema (Outros)',
    '  Legislação   Digital ': 'Legislação Digital',
  };
  for (const [milldesk, site] of Object.entries(casos)) assert.equal(categoriaDoSite(milldesk), site, milldesk);
});

test('categorias fora do mapeamento não entram', () => {
  for (const nome of ['zEscrituras', 'zLegislação Digital', 'Servidor de E-mail', 'Sistema - Patrimônio', 'Siscam 8', null, 'null']) {
    assert.equal(categoriaDoSite(nome), null, String(nome));
  }
});

test('status: "Com o Desenvolvimento" fica separado de "Com o Desenvolvedor"; os novos seguem como vieram', () => {
  assert.equal(statusDoSite('Com o Desenvolvedor'), 'Com o desenvolvedor');
  assert.equal(statusDoSite('Com o Desenvolvimento'), 'Com o Desenvolvimento');
  assert.equal(statusDoSite('Fechado'), 'Fechado');
  assert.equal(statusDoSite('aguardando deploy'), 'Aguardando Deploy');
  assert.equal(statusDoSite(' Rejeitado '), 'Rejeitado');
  assert.equal(statusDoSite(null), null);
});

test('o assunto é a subcategoria, e o tipo do quadro sai dele', () => {
  assert.equal(assuntoDoTicket(' Bug / Erro '), 'Bug / Erro');
  assert.equal(assuntoDoTicket(null), SEM_ASSUNTO);
  assert.equal(tipoDoAssunto('Bug / Erro - SIC e Ouvidoria'), 'Bug/Erro');
  assert.equal(tipoDoAssunto('Melhoria / Nova Função'), 'Melhoria/Função');
  assert.equal(tipoDoAssunto('Nova função'), 'Melhoria/Função');
  assert.equal(tipoDoAssunto('Implantação'), 'Implantação');
  assert.equal(tipoDoAssunto('Dúvida Operacional'), 'Dúvidas');
  assert.equal(tipoDoAssunto('Migração / Dados'), 'Migração/Dados');
  assert.equal(tipoDoAssunto('Configuração de Parâmetros'), OUTROS);
});

test('montarChamados separa pelo campo Técnico e guarda só campos de classificação', () => {
  const equipe = [
    { id: 'ana', agent: 'Ana Souza' },
    { id: 'beto', agent: 'Beto' },
  ];
  const cidades = cidadesDosClientes({ cities: [{ city: 'Itapevi', clients: ['Itapevi CM'] }] });
  const ticket = (id, campos) => ({
    id,
    agent: 'Ana Souza',
    category: 'Site',
    subcategory: 'Bug / Erro',
    status: 'Fechado',
    start: '01/10/2026',
    end: '03/10/2026',
    location: 'Itapevi CM',
    ticket: 'Título com nome de cliente',
    description: '<p>texto</p>',
    requester: 'Fulano',
    ...campos,
  });
  const { desenvolvedores, categoriasIgnoradas, semData } = montarChamados(
    [
      ticket(1),
      ticket(1),
      ticket(2, { agent: 'ana souza ', status: 'Com o Desenvolvimento', start: '05/10/2026', location: 'Outro' }),
      ticket(3, { category: 'zEscrituras' }),
      ticket(4, { agent: 'Marcos' }),
      ticket(5, { start: null }),
    ],
    equipe,
    cidades,
  );

  assert.deepEqual(desenvolvedores, {
    ana: [
      { data: '2026-10-05', status: 'Com o Desenvolvimento', categoria: 'Site', assunto: 'Bug / Erro', tipo: 'Bug/Erro' },
      {
        data: '2026-10-01',
        status: 'Fechado',
        categoria: 'Site',
        assunto: 'Bug / Erro',
        tipo: 'Bug/Erro',
        local: 'Itapevi',
        fechadoEm: '2026-10-03',
      },
    ],
    beto: [],
  });
  assert.deepEqual(categoriasIgnoradas, { zEscrituras: 1 });
  assert.equal(semData, 1);
});
