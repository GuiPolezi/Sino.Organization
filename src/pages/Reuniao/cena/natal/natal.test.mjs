/*
 * Natal da sala de reunião (docs/tema-natal.md, 6.1, teste 4): com o obstáculo
 * da árvore somado, todo lugar ativo continua alcançável vindo da frente da sala.
 * Não fixa o valor de NATAL_ATIVO: só lê os dados.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTACOES, OBSTACULOS, dentroDaArea, rotaAte } from '../../../Suporte/boneco/estacoes.js';
import { MARCA_NATAL, sincronizarObstaculos, tirarObstaculos } from '../../../../tema/natal/obstaculos.js';
import { PRESENTES, raioDoPresente } from '../../../../tema/natal/pecas/medidas.js';
import { AREA_REUNIAO } from '../config.js';
import { configurarLugares } from '../lugares.js';
import { LOGO, PAINEIS, VIDRO } from '../planta.js';
import {
  ARVORE_REUNIAO,
  CURVAS_FESTAO_VIDRO,
  GUIRLANDA_REUNIAO,
  OBSTACULOS_NATAL_REUNIAO,
  PLANOS_NEVE,
  PRESENTES_REUNIAO,
  dentroDoTapete,
} from './pontos.js';

const BLOQUEIAM = new Set(['cenario-reuniao', MARCA_NATAL]);

// Como o NatalReuniao montado: os círculos de Natal entram em OBSTACULOS.
function comArvore(fazer) {
  const postos = sincronizarObstaculos([], OBSTACULOS_NATAL_REUNIAO);
  try {
    fazer();
  } finally {
    tirarObstaculos(postos);
    configurarLugares(0);
  }
}

// Cópia de cena.test.mjs, com a árvore também contando como mobília fixa.
function rotaLivre(inicio, estacao) {
  const alvo = estacao.aprox;
  let pos = inicio;
  for (let passo = 0; passo < 6; passo++) {
    const { ponto } = rotaAte(pos, alvo, AREA_REUNIAO);
    for (let k = 1; k <= 40; k++) {
      const p = { x: pos.x + ((ponto.x - pos.x) * k) / 40, z: pos.z + ((ponto.z - pos.z) * k) / 40 };
      if (!dentroDaArea(AREA_REUNIAO, p, -0.05)) return `saiu da área em (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
      for (const o of OBSTACULOS) {
        if (o.r <= 0 || !BLOQUEIAM.has(o.estacao)) continue;
        if (Math.hypot(p.x - o.x, p.z - o.z) < o.r - 0.05) {
          return `passa por dentro de ${o.estacao} em (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
        }
      }
    }
    if (ponto === alvo) return null;
    pos = ponto;
  }
  return 'não chegou em 6 trechos';
}

test('com a árvore, dá para chegar a todo lugar ativo vindo da frente da sala', () => {
  comArvore(() => {
    for (const n of [2, 4, 6, 12]) {
      configurarLugares(n);
      for (const estacao of ESTACOES) {
        for (const inicio of [{ x: -3, z: 2.5 }, { x: 0, z: 3 }, { x: 3, z: 2.5 }]) {
          const erro = rotaLivre(inicio, estacao);
          assert.equal(erro, null, `${n} membros, ${estacao.id} vindo de (${inicio.x}, ${inicio.z}): ${erro}`);
        }
      }
    }
  });
});

test('a árvore fica a ≥ 0,3 m de toda chegada e continua em OBSTACULOS quando os lugares mudam', () => {
  comArvore(() => {
    for (const n of [2, 4, 6, 12]) {
      configurarLugares(n);
      const arvore = OBSTACULOS.filter(({ estacao }) => estacao === MARCA_NATAL);
      assert.equal(arvore.length, 1, `${n} membros: a árvore saiu dos obstáculos`);
      for (const estacao of ESTACOES) {
        const d = Math.hypot(estacao.aprox.x - ARVORE_REUNIAO.x, estacao.aprox.z - ARVORE_REUNIAO.z);
        assert.ok(d >= ARVORE_REUNIAO.r + 0.3, `${estacao.id}: chegada a ${(d - ARVORE_REUNIAO.r).toFixed(2)} m da árvore`);
      }
    }
  });
});

test('árvore e presentes: no tapete, dentro do obstáculo e antes do vidro', () => {
  assert.ok(dentroDoTapete(ARVORE_REUNIAO), 'a árvore saiu do tapete');
  for (const presente of PRESENTES_REUNIAO) {
    const d = Math.hypot(presente.x - ARVORE_REUNIAO.x, presente.z - ARVORE_REUNIAO.z);
    assert.ok(d + raioDoPresente(PRESENTES[presente.modelo]) <= ARVORE_REUNIAO.r, `presente ${presente.modelo} passa do obstáculo da árvore`);
  }
  // Nada encosta no vidro: os círculos da parede têm 0,5 m e a árvore 0,85.
  for (const p of PAINEIS) {
    const d = Math.hypot(p.x - ARVORE_REUNIAO.x, p.z - ARVORE_REUNIAO.z);
    assert.ok(d > 0.85, `a árvore encosta no trecho ${p.indice}`);
  }
});

test('festão do vidro: 10 barrigas abaixo do trilho de cima e acima do logo', () => {
  assert.equal(CURVAS_FESTAO_VIDRO.length, PAINEIS.length);
  const trilho = VIDRO.altura - VIDRO.espessuraMoldura;
  // Topo do logo girado: meia diagonal do quadrado na direção vertical.
  const topoLogo = LOGO.y + (LOGO.tamanho / 2) * (Math.abs(Math.cos(LOGO.giro)) + Math.abs(Math.sin(LOGO.giro)));
  CURVAS_FESTAO_VIDRO.forEach((curva, i) => {
    const ys = curva.map(([, y]) => y);
    assert.ok(Math.max(...ys) + 0.035 <= trilho, `trecho ${i}: o festão entra no trilho`);
    assert.ok(Math.min(...ys) >= 2.55, `trecho ${i}: o festão desce demais`);
    if (i === LOGO.trecho) assert.ok(Math.min(...ys) - 0.1 > topoLogo, 'o festão encosta no logo');
  });
  // A guirlanda fica entre o chão e o trilho.
  assert.ok(GUIRLANDA_REUNIAO.y + GUIRLANDA_REUNIAO.diametro / 2 < GUIRLANDA_REUNIAO.topoFita);
  assert.equal(PLANOS_NEVE.length, 8);
});
