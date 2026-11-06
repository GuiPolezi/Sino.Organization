// Gorros de Natal (docs/tema-natal.md, 5 e 6.1): sorteio fixo e variado, regra do
// envelope do retrato e encaixe em todo estilo de cabelo.
// Uso: node --test src/tema/natal/gorros/gorros.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { APARENCIAS_COMPILACAO } from '../../../pages/Compilacao/equipe.js';
import { APARENCIAS_DEV } from '../../../pages/Desenvolvimento/aparencias.js';
import { ESTILOS, aparencias as APARENCIAS_SUPORTE } from '../../../pages/Suporte/boneco/aparencia.js';
import { ESTILOS_GORRO, GORROS, GORROS_POR_PESSOA, faseDe, gorroDe } from './catalogo.js';
import { CABELO_SOB_GORRO, ENCAIXE, cabeloSobGorro, encaixeDe } from './encaixe.js';
import { BALANCO, montarGorro, paraObjeto3D } from './montagem.js';

const EQUIPES = {
  suporte: ['roberto', 'fabio', 'guilherme-p', 'luiz'],
  desenvolvimento: ['adriano', 'antonio', 'arnaldo', 'caique', 'donizeti', 'eduardo', 'guilherme-a', 'gustavo', 'ketlyn', 'rafael'],
  compilacao: ['leonardo', 'ramon', 'gdressano', 'glopes', 'nathalia', 'laura', 'damaris'],
};
const CONHECIDOS = Object.values(EQUIPES).flat();

// Teto do retrato (5.3): nenhum ponto do gorro acima de y 0,53 no espaço da cabeça.
const TETO = 0.53;
// O que a lente do rosto enxerga acima do centro da cabeça (Retratos.jsx).
const BORDA_DO_RETRATO = 0.556;
// Giro da cabeça no aceno do retrato (Boneco.jsx, Figura com `aceno`).
const ACENO = -0.08;

// Encaixes a medir: um por estilo de cabelo, e o mesmo com o headset (que alarga).
const ENCAIXES = Object.entries(ENCAIXE).flatMap(([cabelo, encaixe]) => [
  [cabelo, encaixe],
  [`${cabelo}+headset`, encaixeDe({ cabelo: { estilo: cabelo }, acessorio: 'headset' })],
]);
// Extremos do balanço dos pompons, sinos e rabos (x e z, em rad).
const A = BALANCO.pompom;
const GIROS = [[0, 0], [A, A], [A, -A], [-A, A], [-A, -A]];

function caixa(estilo, encaixe, giro, cabeca = 0) {
  const pai = new THREE.Group();
  pai.rotation.z = cabeca;
  pai.add(paraObjeto3D(montarGorro(estilo, encaixe), giro));
  pai.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(pai, true);
}

test('são 8 estilos, cada um com corpo e cores', () => {
  assert.equal(ESTILOS_GORRO.length, 8);
  for (const estilo of ESTILOS_GORRO) {
    assert.ok(['cone', 'cupula'].includes(GORROS[estilo].tipo), estilo);
    assert.ok(GORROS[estilo].cores.corpo, estilo);
  }
});

test('gorroDe é determinístico, para conhecidos e para gente nova', () => {
  for (const id of [...CONHECIDOS, 'fulano', 'pessoa-nova-42', '']) assert.equal(gorroDe(id), gorroDe(id), id);
});

test('as 21 pessoas conhecidas estão na tabela, com estilos válidos', () => {
  assert.equal(CONHECIDOS.length, 21);
  assert.deepEqual(Object.keys(GORROS_POR_PESSOA).sort(), [...CONHECIDOS].sort());
  for (const id of CONHECIDOS) assert.ok(ESTILOS_GORRO.includes(gorroDe(id)), id);
});

test('cada equipe tem ao menos min(n, 7) estilos diferentes', () => {
  for (const [equipe, ids] of Object.entries(EQUIPES)) {
    const distintos = new Set(ids.map(gorroDe)).size;
    assert.ok(distintos >= Math.min(ids.length, 7), `${equipe}: ${distintos}`);
  }
  // Suporte e Compilação: nenhum estilo se repete.
  assert.equal(new Set(EQUIPES.suporte.map(gorroDe)).size, EQUIPES.suporte.length);
  assert.equal(new Set(EQUIPES.compilacao.map(gorroDe)).size, EQUIPES.compilacao.length);
});

test('gente nova cai sempre num estilo válido, e o sorteio usa todos os 8', () => {
  const vistos = new Set();
  for (let i = 0; i < 400; i++) {
    const estilo = gorroDe(`pessoa-${i}`);
    assert.ok(ESTILOS_GORRO.includes(estilo));
    vistos.add(estilo);
  }
  assert.equal(vistos.size, ESTILOS_GORRO.length);
});

test('a fase do balanço é fixa por pessoa e fica em [0, 2π)', () => {
  for (const id of CONHECIDOS) {
    assert.equal(faseDe(id), faseDe(id));
    assert.ok(faseDe(id) >= 0 && faseDe(id) < Math.PI * 2, id);
  }
  assert.ok(new Set(CONHECIDOS.map(faseDe)).size > 15, 'os bonecos não balançam juntos');
});

test('envelope: nenhum ponto do gorro passa de y 0,53, em todo estilo, encaixe e balanço', () => {
  for (const estilo of ESTILOS_GORRO) {
    for (const [cabelo, encaixe] of ENCAIXES) {
      for (const giro of GIROS) {
        const topo = caixa(estilo, encaixe, giro).max.y;
        assert.ok(topo <= TETO, `${estilo} em ${cabelo} (giro ${giro}): topo ${topo.toFixed(3)}`);
      }
    }
  }
});

test('envelope: com a cabeça inclinada do aceno, o gorro cabe no retrato e não sai para os lados', () => {
  for (const estilo of ESTILOS_GORRO) {
    for (const [cabelo, encaixe] of ENCAIXES) {
      for (const giro of GIROS) {
        const b = caixa(estilo, encaixe, giro, ACENO);
        assert.ok(b.max.y < BORDA_DO_RETRATO, `${estilo} em ${cabelo}: topo ${b.max.y.toFixed(3)}`);
        // A lente do rosto enxerga ±0,70 m na altura da cabeça.
        assert.ok(Math.max(-b.min.x, b.max.x) < 0.6, `${estilo} em ${cabelo}: largura`);
      }
    }
  }
});

test('os gorros não descem sobre os olhos (y 0,04, topo 0,085) na frente do rosto', () => {
  for (const estilo of ESTILOS_GORRO) {
    for (const [cabelo, encaixe] of ENCAIXES) {
      const objeto = paraObjeto3D(montarGorro(estilo, encaixe));
      objeto.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      objeto.traverse((malha) => {
        if (!malha.isMesh) return;
        const pos = malha.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(malha.matrixWorld);
          // Só a frente do rosto, entre os olhos e as bochechas.
          if (v.z > 0.2 && Math.abs(v.x) < 0.2) assert.ok(v.y > 0.1, `${estilo} em ${cabelo}: y ${v.y.toFixed(3)}`);
        }
      });
    }
  }
});

// Raio da casca do cabelo no alto da cabeça (Boneco.jsx e geometrias.js); o
// topete, o coque e os cachos do alto são tratados à parte (CABELO_SOB_GORRO).
const CASCA = {
  careca: 0.34, raspado: 0.348, degrade: 0.39, degradeLateral: 0.39, degradeMedio: 0.39,
  curto: 0.36, longo: 0.365, comprido: 0.376, compridoSemFranja: 0.376, ombro: 0.376,
  coque: 0.36, topete: 0.36, volumoso: 0.375, samurai: 0.362, cacheado: 0.33,
  cacheadoLongo: 0.33, cachinhos: 0.36, moicano: 0.34,
};

test('o corpo do gorro passa por fora da casca do cabelo, acima da aba', () => {
  for (const estilo of ESTILOS_GORRO.filter((e) => GORROS[e].tipo === 'cone' && !GORROS[e].mini)) {
    for (const [cabelo, encaixe] of Object.entries(ENCAIXE)) {
      const objeto = paraObjeto3D(montarGorro(estilo, encaixe));
      objeto.updateMatrixWorld(true);
      const corpo = objeto.children[0];
      const pos = corpo.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (v.y < 0.08) continue; // dentro da aba
        const folga = v.applyMatrix4(corpo.matrixWorld).length() - CASCA[cabelo];
        assert.ok(folga > 0, `${estilo} em ${cabelo}: ${folga.toFixed(3)}`);
      }
    }
  }
});

// Os estilos de cabelo do tipo EstiloCabelo (Suporte/tipos.js), lidos do próprio arquivo.
function estilosDoTipo() {
  const fonte = readFileSync(new URL('../../../pages/Suporte/tipos.js', import.meta.url), 'utf8');
  const linha = fonte.match(/@typedef \{([^}]+)\} EstiloCabelo/);
  assert.ok(linha, 'EstiloCabelo em tipos.js');
  return [...linha[1].matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]);
}

test('ENCAIXE cobre todo estilo de cabelo: o tipo, o sorteio e as três equipes', () => {
  const usados = [APARENCIAS_SUPORTE, APARENCIAS_DEV, APARENCIAS_COMPILACAO].flatMap((tabela) =>
    Object.values(tabela).map((a) => a.cabelo.estilo),
  );
  const todos = new Set([...estilosDoTipo(), ...ESTILOS, ...usados]);
  assert.ok(todos.size >= 18);
  for (const estilo of todos) assert.ok(Object.hasOwn(ENCAIXE, estilo), estilo);
  for (const estilo of Object.keys(CABELO_SOB_GORRO)) assert.ok(Object.hasOwn(ENCAIXE, estilo), estilo);
  for (const estilo of Object.keys(ENCAIXE)) assert.ok(Object.hasOwn(CASCA, estilo), `CASCA de ${estilo}`);
});

test('cabeloSobGorro: boné sai, arco do headset some sob gorro cheio, mini deixa o coque', () => {
  const comBone = { cabelo: { estilo: 'curto' }, acessorio: 'bone' };
  assert.equal(cabeloSobGorro('roberto', comBone).semBone, true);
  // antonio usa o mini: o headset fica à mostra.
  assert.equal(cabeloSobGorro('antonio', { cabelo: { estilo: 'curto' }, acessorio: 'headset' }).semArco, undefined);
  assert.equal(cabeloSobGorro('roberto', { cabelo: { estilo: 'curto' }, acessorio: 'headset' }).semArco, true);
  // glopes (mini, samurai): o coque fica; com gorro cheio, ele desce para a nuca.
  assert.deepEqual(cabeloSobGorro('glopes', APARENCIAS_COMPILACAO.glopes), {});
  assert.ok(cabeloSobGorro('roberto', { cabelo: { estilo: 'samurai' }, acessorio: 'nenhum' }).coque);
  // O moicano some com qualquer gorro.
  for (const id of CONHECIDOS) {
    assert.equal(cabeloSobGorro(id, { cabelo: { estilo: 'moicano' }, acessorio: 'nenhum' }).moicano, null, id);
  }
});

test('cabeloSobGorro devolve um objeto novo e não altera as tabelas', () => {
  const aparencia = { cabelo: { estilo: 'topete' }, acessorio: 'bone' };
  const a = cabeloSobGorro('fabio', aparencia);
  a.extra = true;
  assert.equal(cabeloSobGorro('fabio', aparencia).extra, undefined);
  assert.ok(Object.isFrozen(ENCAIXE) && Object.isFrozen(CABELO_SOB_GORRO));
});

test('os cachos escondidos existem nas listas de cachos de Boneco.jsx', () => {
  // cacheado: 1 + 6 + 8 + 7 + 6 + 4 = 32 cachos; cachinhos: 1 + 8 + 12 + 11 = 32.
  for (const ajuste of Object.values(CABELO_SOB_GORRO)) {
    for (const i of ajuste.cachosOcultos ?? []) assert.ok(Number.isInteger(i) && i >= 0 && i < 32);
  }
});
