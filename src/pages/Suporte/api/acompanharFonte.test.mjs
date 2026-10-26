// Casos da busca repetida dos dados da API (sem F5).
// Uso: npm run test:card
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ATUALIZAR_A_CADA_MS,
  ESPERA_CURTA_MS,
  TENTATIVAS_CURTAS,
  acompanharFonte,
  proximaEspera,
} from './acompanharFonte.js';

// Relógio de mentira: guarda o que foi agendado em vez de esperar de verdade.
function relogioFalso() {
  const agendados = [];
  let agora = 0;
  return {
    agendados,
    avancar(ms) {
      agora += ms;
    },
    relogio: {
      agendar(fn, ms) {
        const item = { fn, ms, cancelado: false };
        agendados.push(item);
        return item;
      },
      cancelar(item) {
        if (item) item.cancelado = true;
      },
      agora: () => agora,
    },
  };
}

const esperarPromessas = () => new Promise((resolve) => setImmediate(resolve));

test('dado em dia: próxima busca em 15 minutos', () => {
  assert.deepEqual(proximaEspera({ ok: true, situacao: 'recente', seguidas: 0 }), {
    espera: ATUALIZAR_A_CADA_MS,
    seguidas: 0,
  });
  assert.deepEqual(proximaEspera({ ok: true, situacao: 'atualizado', seguidas: 2 }), {
    espera: ATUALIZAR_A_CADA_MS,
    seguidas: 0,
  });
});

test('dado velho ou falha: tenta de novo logo, até o limite de tentativas', () => {
  assert.deepEqual(proximaEspera({ ok: true, situacao: 'atualizando', seguidas: 0 }), {
    espera: ESPERA_CURTA_MS,
    seguidas: 1,
  });
  assert.deepEqual(proximaEspera({ ok: true, situacao: 'antigo', seguidas: 1 }), { espera: ESPERA_CURTA_MS, seguidas: 2 });
  assert.deepEqual(proximaEspera({ ok: false, seguidas: 0 }), { espera: ESPERA_CURTA_MS, seguidas: 1 });
  // Passou do limite: volta ao ritmo normal, sem martelar o servidor.
  assert.deepEqual(proximaEspera({ ok: false, seguidas: TENTATIVAS_CURTAS }), {
    espera: ATUALIZAR_A_CADA_MS,
    seguidas: TENTATIVAS_CURTAS,
  });
});

test('dado velho é buscado de novo sozinho até chegar o atual', async () => {
  const { agendados, relogio } = relogioFalso();
  const respostas = [{ situacao: 'atualizando', valor: 'ontem' }, { situacao: 'atualizado', valor: 'hoje' }];
  const recebidos = [];

  acompanharFonte({
    buscar: async () => respostas.shift(),
    aoReceber: (r) => recebidos.push(r.valor),
    aoFalhar: () => assert.fail('não devia falhar'),
    relogio,
  });
  await esperarPromessas();
  assert.deepEqual(recebidos, ['ontem']);
  assert.equal(agendados.at(-1).ms, ESPERA_CURTA_MS);

  agendados.at(-1).fn();
  await esperarPromessas();
  assert.deepEqual(recebidos, ['ontem', 'hoje']);
  assert.equal(agendados.at(-1).ms, ATUALIZAR_A_CADA_MS);
});

test('falha avisa e agenda nova tentativa; "agora" busca na hora', async () => {
  const { agendados, relogio } = relogioFalso();
  let falhas = 0;
  let recebidos = 0;
  let deveFalhar = true;

  const fonte = acompanharFonte({
    buscar: async () => {
      if (deveFalhar) throw new Error('fora do ar');
      return { situacao: 'recente' };
    },
    aoReceber: () => (recebidos += 1),
    aoFalhar: () => (falhas += 1),
    relogio,
  });
  await esperarPromessas();
  assert.equal(falhas, 1);
  assert.equal(agendados.at(-1).ms, ESPERA_CURTA_MS);

  deveFalhar = false;
  await fonte.agora();
  assert.equal(recebidos, 1);
  // A tentativa agendada antes foi cancelada: não há duas buscas na fila.
  assert.equal(agendados.filter((a) => !a.cancelado).length, 1);
});

test('depois de parar, nada mais é buscado nem entregue', async () => {
  const { agendados, relogio } = relogioFalso();
  let recebidos = 0;
  let liberar;

  const fonte = acompanharFonte({
    buscar: () => new Promise((resolve) => (liberar = resolve)),
    aoReceber: () => (recebidos += 1),
    aoFalhar: () => {},
    relogio,
  });
  fonte.parar();
  liberar({ situacao: 'recente' });
  await esperarPromessas();

  assert.equal(recebidos, 0);
  assert.equal(agendados.length, 0);
});

test('o relógio padrão chama setTimeout/clearTimeout sem trocar o this (como exige o navegador)', async () => {
  const originais = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const agendados = [];
  // Como no navegador: chamado com this que não é o global, lança.
  globalThis.setTimeout = function (fn, ms) {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    agendados.push(ms);
    return 1;
  };
  globalThis.clearTimeout = function () {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
  };
  try {
    let recebidos = 0;
    const fonte = acompanharFonte({
      buscar: async () => ({ situacao: 'recente' }),
      aoReceber: () => (recebidos += 1),
      aoFalhar: () => assert.fail('não devia falhar'),
    });
    await esperarPromessas();
    fonte.parar();

    assert.equal(recebidos, 1);
    assert.deepEqual(agendados, [ATUALIZAR_A_CADA_MS]);
  } finally {
    Object.assign(globalThis, originais);
  }
});

test('atrasado: só depois de 15 minutos da última busca', async () => {
  const { avancar, relogio } = relogioFalso();
  const fonte = acompanharFonte({
    buscar: async () => ({ situacao: 'recente' }),
    aoReceber: () => {},
    aoFalhar: () => {},
    relogio,
  });
  await esperarPromessas();

  avancar(ATUALIZAR_A_CADA_MS - 1);
  assert.equal(fonte.atrasado(), false);
  avancar(1);
  assert.equal(fonte.atrasado(), true);
  fonte.parar();
});
