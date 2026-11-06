/*
 * Montagem de um gorro como árvore de dados: cada nó tem posição, rotação e
 * escala e, se for malha, a geometria e a descrição do material ({ cor,
 * acabamento } ou { textura }). Gorro.jsx desenha a árvore; o teste monta os
 * mesmos nós em THREE e mede o envelope. JS puro: roda em Node.
 *
 * Espaço da cabeça (5.4): aba centrada em y 0,175, inclinada para trás
 * (rotation-x −0,22), corpo começando 1 cm acima do centro da aba.
 */
import * as THREE from 'three';
import { GORROS } from './catalogo.js';
import * as geo from './geometriasGorro.js';

// y 0,175 (o plano pedia 0,19): 1,5 cm mais baixa na testa, o gorro cabe no envelope (5.3) sem ficar baixinho.
export const BASE = Object.freeze({ y: 0.175, inclinacao: -0.16, raioAba: 0.32, inicioCorpo: 0.01 });

// Amplitudes do balanço (2.4): o teste mede o envelope nos extremos.
export const BALANCO = Object.freeze({ pompom: 0.08, rabo: 0.06 });

// Geometrias criadas no 1º uso, uma vez por chave, e compartilhadas por todos os bonecos.
const cache = new Map();
const guardado = (chave, criar) => {
  if (!cache.has(chave)) cache.set(chave, criar());
  return cache.get(chave);
};

const no = (props) => ({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], filhos: [], ...props });
const malha = (geometria, material, props = {}) => no({ geometria, material, ...props });

// Pompom pendurado na ponta: o pivô fica na ponta e o pompom um pouco além dela, puxado para baixo.
function pivoPompom(estilo, ponta, tangente, raio, material) {
  const centro = tangente.clone().multiplyScalar(raio * 0.55).add(new THREE.Vector3(0, -raio * 0.3, 0));
  return no({
    position: ponta.toArray(),
    balanco: 'pompom',
    filhos: [malha(guardado(`pompom:${raio}`, () => geo.pompom(raio)), material, { position: centro.toArray() })],
  });
}

const escalarPonta = (p, k) => new THREE.Vector3(p.x * k, p.y, p.z * k);

/*
 * A cabeça (com uma casca de cabelo curto) no espaço do corpo do gorro: o
 * centro dela visto da aba inclinada, 1 cm abaixo do início do corpo. O pano
 * que cai se apoia nela. O encaixe alarga isso na horizontal, junto com o corpo.
 */
const CABECA = Object.freeze({
  centro: [0, -BASE.y * Math.cos(BASE.inclinacao) - BASE.inicioCorpo, BASE.y * Math.sin(BASE.inclinacao)],
  raio: 0.382,
  desde: 0.02,
});

// Corpo em cone (clássico, caído, elfo, bengala, luxo, mini, casa). O mini não cai sobre a cabeça.
function corpoCone(estilo, g, k) {
  const cone = guardado(`cone:${estilo}`, () => geo.coneCurvo({ ...g.cone, cabeca: g.mini ? null : CABECA }));
  const y0 = BASE.inicioCorpo;
  const ponta = escalarPonta(cone.ponta, k).add(new THREE.Vector3(0, y0, 0));
  const nos = [malha(cone.geometria, g.cores.corpo, { position: [0, y0, 0], scale: [k, 1, k] })];
  if (g.aba) {
    const aba = guardado(`aba:${g.aba.tubo}`, () => geo.abaFofa(BASE.raioAba, g.aba.tubo));
    nos.push(malha(aba, g.cores.aba, { scale: [k, k, k] }));
  }
  if (g.petalas) nos.push(...golaDePetalas(g, k));
  if (g.pompom && !g.rabo) nos.push(pivoPompom(estilo, ponta, cone.tangente, g.pompom.raio, g.cores.pompom));
  if (g.rabo) nos.push(raboPendurado(g, ponta));
  if (g.sino) nos.push(sinoNaPonta(g, ponta));
  if (g.marca) nos.push(marcaNaAba(g, k));
  return nos;
}

// Gola recortada do elfo: uma faixa e, presas nela, pontas em gota que se
// encostam, caem sobre o cabelo e abrem um pouco para fora.
function golaDePetalas(g, k) {
  const { quantas, largura, altura, espessura, faixa } = g.petalas;
  const geometria = guardado('petala', geo.petala);
  const pontas = Array.from({ length: quantas }, (_, i) =>
    no({
      rotation: [0, ((i + 0.5) / quantas) * Math.PI * 2, 0],
      filhos: [
        malha(geometria, g.cores.petalas[i % 2], {
          position: [0, 0.008, (BASE.raioAba + 0.008) * k],
          rotation: [-0.32, 0, 0],
          scale: [largura * k, altura, espessura],
        }),
      ],
    }),
  );
  const aba = guardado(`aba:${faixa}`, () => geo.abaFofa(BASE.raioAba, faixa));
  return [malha(aba, g.cores.faixa, { position: [0, 0.03, 0], scale: [k, k, k] }), ...pontas];
}

// Rabo do caído: pende da ponta (desfazendo a inclinação da aba), um pouco aberto para fora.
function raboPendurado(g, ponta) {
  const { raio } = g.pompom;
  const r = g.rabo;
  const geometria = guardado('rabo', () => geo.rabo(r));
  const fora = Math.atan2(ponta.x, ponta.z);
  const noBico = malha(guardado(`pompom:${r.raioTopo}`, () => geo.pompom(r.raioTopo * 1.08)), g.cores.rabo);
  const pompomNaBase = no({
    position: [0, -r.comprimento - r.raioBase, 0],
    balanco: 'pompom',
    filhos: [malha(guardado(`pompom:${raio}`, () => geo.pompom(raio)), g.cores.pompom, { position: [0, -raio * 0.7, 0] })],
  });
  return no({
    position: ponta.toArray(),
    filhos: [
      noBico,
      no({
        rotation: [-BASE.inclinacao, 0, 0],
        filhos: [
          no({
            rotation: [0, fora, 0],
            filhos: [
              no({
                rotation: [-r.abertura, 0, 0],
                balanco: 'rabo',
                filhos: [malha(geometria, g.cores.rabo), pompomNaBase],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Sino do elfo: pende da ponta, com a boca para baixo.
function sinoNaPonta(g, ponta) {
  const s = guardado(`sino:${g.sino.raio}`, () => geo.sino(g.sino.raio));
  const ouro = g.cores.sino;
  return no({
    position: ponta.toArray(),
    rotation: [-BASE.inclinacao, 0, 0],
    balanco: 'pompom',
    filhos: [
      no({
        position: [0, -s.altura - g.sino.raio * 0.2, 0],
        filhos: [malha(s.corpo, ouro), malha(s.badalo, ouro), malha(s.alca, ouro)],
      }),
    ],
  });
}

// Disquinho com a marca na frente da aba (gorro da casa).
function marcaNaAba(g, k) {
  const m = guardado(`marca:${g.marca.raio}`, () => geo.marca(g.marca.raio));
  const z = (BASE.raioAba + g.aba.tubo) * k + 0.004;
  return no({
    position: [0, 0.005, z],
    filhos: [malha(m.disco, g.cores.marca), malha(m.logo, { logo: true }, { position: [0, 0, 0.0095] })],
  });
}

// Tricô: barra dobrada, cúpula e o pompom grande, sentado no alto da cúpula.
function corpoCupula(g, k) {
  const { raio, achatar } = g.cupula;
  // O pompom afunda um pouco na cúpula, como se estivesse costurado nela.
  const topo = raio * achatar + 0.012 - g.pompom.raio * 0.15;
  const ponta = new THREE.Vector3(0, topo, 0);
  const pompom = guardado(`pompom:${g.pompom.raio}`, () => geo.pompom(g.pompom.raio));
  return [
    malha(guardado('barra', () => geo.barra(g.barra.raio, g.barra.altura)), g.cores.barra, { scale: [k, 1, k] }),
    malha(guardado('cupula', () => geo.cupula(raio, achatar)), g.cores.corpo, {
      position: [0, 0.012, 0],
      scale: [k, 1, k],
    }),
    no({
      position: ponta.toArray(),
      balanco: 'pompom',
      filhos: [malha(pompom, g.cores.pompom, { position: [0, g.pompom.raio * 0.12, 0] })],
    }),
  ];
}

// Onde o mini assenta: na direção pedida, à distância da casca do cabelo.
function posicaoMini(g, encaixe) {
  const direcao = new THREE.Vector3(...g.mini.direcao).normalize();
  return direcao.multiplyScalar(0.35 + (encaixe.escala - 1) * 0.15 + encaixe.dy).toArray();
}

/**
 * Árvore de nós de um gorro, no espaço da cabeça.
 * @param {keyof typeof GORROS} estilo
 * @param {{ escala: number, dy: number }} encaixe de encaixe.js
 */
export function montarGorro(estilo, encaixe) {
  const g = GORROS[estilo];
  if (!g) throw new Error(`Gorro desconhecido: ${estilo}`);
  const k = g.mini ? 1 : encaixe.escala;
  const filhos = g.tipo === 'cupula' ? corpoCupula(g, k) : corpoCone(estilo, g, k);
  if (g.mini) {
    return no({ position: posicaoMini(g, encaixe), rotation: g.mini.rotacao, scale: Array(3).fill(g.mini.escala), filhos });
  }
  return no({ position: [0, BASE.y + encaixe.dy, 0], rotation: [BASE.inclinacao, 0, 0], filhos });
}

/**
 * Os mesmos nós em objetos THREE (para medir nos testes). Os pivôs de balanço
 * recebem o giro dado (rad, em x e z).
 */
export function paraObjeto3D(raiz, giro = [0, 0]) {
  const montar = (n) => {
    const objeto = n.geometria ? new THREE.Mesh(n.geometria) : new THREE.Group();
    objeto.position.fromArray(n.position);
    objeto.rotation.fromArray(n.rotation);
    objeto.scale.fromArray(n.scale);
    if (n.balanco) {
      const amplitude = BALANCO[n.balanco] / BALANCO.pompom;
      objeto.rotation.x += giro[0] * amplitude;
      objeto.rotation.z += giro[1] * amplitude;
    }
    n.filhos.forEach((filho) => objeto.add(montar(filho)));
    return objeto;
  };
  return montar(raiz);
}
