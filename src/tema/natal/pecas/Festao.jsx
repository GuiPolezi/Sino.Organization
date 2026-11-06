/*
 * Festão: tubo de pinheiro (ou ouropel) por uma curva suave, com bolinhas
 * penduradas e Luzinhas em cima. Várias curvas (`curvas`) viram uma geometria
 * só. Parado: só as lâmpadas piscam.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { clay } from '../../../pages/Suporte/boneco/geometrias.js';
import { novaTextura } from '../../../pages/Suporte/quadro/texturas.js';
import { materialNatal } from '../materiais.js';
import { corNatal } from '../paleta.js';
import { curvaDe, pontosAoLongo, tuboDoFestao } from './geometriaFestao.js';
import Luzinhas from './Luzinhas.jsx';

const LUZES_POR_METRO = 6;
const BOLINHAS_POR_METRO = 5;
const CORES_BOLINHAS = ['vermelho', 'ouro'];

// Agulhas: listras diagonais escuras sobre branco (o branco deixa a cor do material).
let texturaAgulhas = null;
const agulhas = () => {
  if (texturaAgulhas) return texturaAgulhas;
  texturaAgulhas = novaTextura(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = 5;
    for (let x = -w; x <= w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, h);
      ctx.stroke();
    }
  });
  texturaAgulhas.wrapS = THREE.RepeatWrapping;
  texturaAgulhas.wrapT = THREE.RepeatWrapping;
  return texturaAgulhas;
};

// Um material por cor, compartilhado e nunca descartado (como materialNatal).
const materiaisTubo = new Map();
const materialTubo = (cor) => {
  if (!materiaisTubo.has(cor)) materiaisTubo.set(cor, Object.assign(clay(corNatal(cor)), { map: agulhas() }));
  return materiaisTubo.get(cor);
};

function montarBolinhas(lista, raio, cores) {
  const malha = new THREE.InstancedMesh(new THREE.SphereGeometry(raio, 12, 8), materialNatal('#FFFFFF'), lista.length);
  const matriz = new THREE.Matrix4();
  const cor = new THREE.Color();
  lista.forEach(([x, y, z], i) => {
    malha.setMatrixAt(i, matriz.makeTranslation(x, y, z));
    malha.setColorAt(i, cor.set(corNatal(cores[i % cores.length])));
  });
  malha.instanceMatrix.needsUpdate = true;
  malha.instanceColor.needsUpdate = true;
  malha.computeBoundingSphere();
  return malha;
}

const contagem = (fixo, porMetro) => (comprimento) => fixo ?? comprimento * porMetro;
const chaveDe = (lista) => lista.map((p) => (Array.isArray(p) ? p : [p.x, p.y, p.z]).map((v) => v.toFixed(4))).join(';');

/**
 * @param {object} props
 * @param {Array<[number, number, number] | { x: number, y: number, z: number }>} [props.pontos] uma curva (pontos de apoio, local)
 * @param {Array<typeof props.pontos>} [props.curvas] várias curvas, mescladas numa geometria (no lugar de `pontos`)
 * @param {boolean} [props.fechado] curva fechada (volta ao 1º ponto)
 * @param {number} [props.raio] raio do tubo (m)
 * @param {string} [props.cor] chave da paleta ou hex do tubo (padrão 'pinheiro')
 * @param {number} [props.luzes] lâmpadas por curva (padrão 6 por metro; 0 = nenhuma)
 * @param {number} [props.raioLuz] raio das lâmpadas (padrão 0,7 × raio)
 * @param {string[]} [props.coresLuzes] cores das lâmpadas (padrão 70/15/15)
 * @param {number} [props.bolinhas] bolinhas por curva (padrão 5 por metro; 0 = nenhuma)
 * @param {string[]} [props.coresBolinhas] em rodízio (padrão vermelho e ouro)
 */
export default function Festao({
  pontos,
  curvas,
  fechado = false,
  raio = 0.035,
  cor = 'pinheiro',
  luzes,
  raioLuz = raio * 0.7,
  coresLuzes,
  bolinhas,
  coresBolinhas = CORES_BOLINHAS,
  ...props
}) {
  const listas = curvas ?? [pontos];
  const chave = `${listas.map(chaveDe).join('|')}|${fechado}|${raio}|${luzes}|${bolinhas}|${coresBolinhas}`;

  const pecas = useMemo(() => {
    const trilhos = listas.map((lista) => curvaDe(lista, fechado));
    const tubo = tuboDoFestao(trilhos, raio, fechado);
    // Lâmpadas por cima do fio e bolinhas penduradas, alternadas no comprimento.
    const pontosLuz = pontosAoLongo(trilhos, contagem(luzes, LUZES_POR_METRO), raio * 0.75, 0.5);
    const pontosBola = pontosAoLongo(trilhos, contagem(bolinhas, BOLINHAS_POR_METRO), -raio * 1.4, 0.25);
    const bolas = pontosBola.length ? montarBolinhas(pontosBola, raio * 1.15, coresBolinhas) : null;
    return { tubo, pontosLuz, bolas };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      pecas.tubo.dispose();
      pecas.bolas?.geometry.dispose();
      pecas.bolas?.dispose();
    },
    [pecas],
  );

  return (
    <group {...props}>
      <mesh geometry={pecas.tubo} material={materialTubo(cor)} />
      {pecas.bolas && <primitive object={pecas.bolas} />}
      {pecas.pontosLuz.length > 0 && <Luzinhas pontos={pecas.pontosLuz} cores={coresLuzes} raio={raioLuz} />}
    </group>
  );
}
