import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarApi } from './api.mjs';

// O agendamento da compilação busca no sistema e grava no Supabase: só com o segredo certo.
test('cron da compilação: sem CRON_SECRET 503, segredo errado ou ausente 401', async () => {
  const antes = process.env.CRON_SECRET;
  const pedir = (headers = {}) => tratarApi(new Request('http://x/api/cron/compilacao', { headers }));
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await pedir({ authorization: 'Bearer qualquer' })).status, 503);
    process.env.CRON_SECRET = 'segredo-de-teste';
    assert.equal((await pedir()).status, 401);
    assert.equal((await pedir({ authorization: 'Bearer outro' })).status, 401);
    assert.equal((await pedir({ authorization: 'segredo-de-teste' })).status, 401);
  } finally {
    if (antes === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = antes;
  }
});
