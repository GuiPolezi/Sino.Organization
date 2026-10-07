import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AREA, MOVIMENTO, posicoes, useEquipe } from '../store.js';

const ACOES = ['acenar', 'pular', 'olhar', 'trabalhar', 'olhar', 'acenar'];
const RAIO_SEPARACAO = 0.95;
const RAIO_SEPARACAO_SELECIONADO = 1.9;
// Firme o bastante para segurar quem vem andando (o protótipo usava 2.2 e os corpos se atravessavam).
const FORCA_SEPARACAO = 12;

const rand = (min, max) => min + Math.random() * (max - min);
const { damp } = THREE.MathUtils;

function pontoAleatorio(vetor) {
  const angulo = Math.random() * Math.PI * 2;
  const raio = Math.sqrt(Math.random()) * 0.92;
  return vetor.set(Math.cos(angulo) * AREA.rx * raio, 0, Math.sin(angulo) * AREA.rz * raio);
}

function anguloMaisCurto(atual, alvo) {
  let diferenca = alvo - atual;
  while (diferenca > Math.PI) diferenca -= Math.PI * 2;
  while (diferenca < -Math.PI) diferenca += Math.PI * 2;
  return diferenca;
}

// Velocidade e fase variam por boneco, para dar personalidade.
const criarEstado = () => ({
  pos: pontoAleatorio(new THREE.Vector3()),
  estado: 'parado',
  timer: rand(0.2, 2.5),
  alvo: new THREE.Vector3(),
  vel: rand(0.75, 1.25),
  yaw: rand(-Math.PI, Math.PI),
  passo: rand(0, 10),
  acao: null,
  tAcao: 0,
  pulo: 0,
  escala: 1,
});

const anguloPara = (pos, alvo) => Math.atan2(alvo.x - pos.x, alvo.z - pos.z);

// Avança a máquina de estados e devolve para onde o boneco deve virar e se está andando.
function atualizarEstado(s, selecionado, camera, dt) {
  const { pos } = s;

  if (selecionado) s.estado = 'selecionado';
  else if (s.estado === 'selecionado') {
    s.estado = 'parado';
    s.timer = rand(0.6, 1.5);
  }

  if (s.estado === 'selecionado') return { yawAlvo: anguloPara(pos, camera.position), andando: false };

  s.timer -= dt;

  if (s.estado === 'andando') {
    const dx = s.alvo.x - pos.x;
    const dz = s.alvo.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12 || s.timer <= 0) {
      s.estado = 'parado';
      s.timer = rand(0.8, 3.2);
      return { yawAlvo: s.yaw, andando: false };
    }
    const v = s.vel * (MOVIMENTO.reduzido ? 0.5 : 1);
    pos.x += (dx / dist) * v * dt;
    pos.z += (dz / dist) * v * dt;
    return { yawAlvo: Math.atan2(dx, dz), andando: true };
  }

  if (s.estado === 'parado' && s.timer <= 0) {
    if (Math.random() < 0.4) {
      s.estado = 'acao';
      s.acao = ACOES[Math.floor(Math.random() * ACOES.length)];
      if (MOVIMENTO.reduzido && s.acao === 'pular') s.acao = 'olhar';
      s.timer = s.acao === 'trabalhar' ? rand(2.5, 4) : rand(1.6, 2.6);
      s.tAcao = 0;
    } else {
      s.estado = 'andando';
      pontoAleatorio(s.alvo);
      s.timer = 9;
    }
    return { yawAlvo: s.yaw, andando: false };
  }

  if (s.estado === 'acao') {
    s.tAcao += dt;
    if (s.timer <= 0) {
      s.estado = 'parado';
      s.timer = rand(0.4, 1.2);
    } else if (s.acao === 'acenar') {
      return { yawAlvo: anguloPara(pos, camera.position), andando: false };
    }
  }

  return { yawAlvo: s.yaw, andando: false };
}

// Empurra para longe de quem está perto demais e mantém dentro da elipse.
function aplicarLimites(id, pos, idSelecionado, dt) {
  if (id !== idSelecionado) {
    for (const [outroId, outra] of posicoes) {
      if (outroId === id) continue;
      const dx = pos.x - outra.x;
      const dz = pos.z - outra.z;
      const dist = Math.hypot(dx, dz);
      const raio = outroId === idSelecionado ? RAIO_SEPARACAO_SELECIONADO : RAIO_SEPARACAO;
      if (dist > 0.0001 && dist < raio) {
        const forca = (raio - dist) * FORCA_SEPARACAO * dt;
        pos.x += (dx / dist) * forca;
        pos.z += (dz / dist) * forca;
      }
    }
  }

  const e = (pos.x / AREA.rx) ** 2 + (pos.z / AREA.rz) ** 2;
  if (e > 1) {
    const k = 1 / Math.sqrt(e);
    pos.x *= k;
    pos.z *= k;
  }
}

// Ângulos-alvo de pernas, braços e cabeça para o estado atual.
function calcularPose(s, andando, t, dt) {
  const pose = { pernaE: 0, pernaD: 0, bracoEz: -0.1, bracoDz: 0.1, bracoEx: 0, bracoDx: 0, cabecaY: 0, cabecaX: 0, pulo: 0 };
  const acao = s.estado === 'acao' ? s.acao : null;

  if (andando) {
    s.passo += dt * s.vel * 9;
    const balanco = Math.sin(s.passo);
    pose.pernaE = balanco * 0.65;
    pose.pernaD = -balanco * 0.65;
    pose.bracoEx = -balanco * 0.55;
    pose.bracoDx = balanco * 0.55;
    pose.pulo = Math.abs(Math.cos(s.passo)) * 0.06;
  } else if (acao === 'acenar' || s.estado === 'selecionado') {
    pose.bracoDz = 2.55 + Math.sin(t * 11) * 0.35;
    pose.cabecaX = -0.08;
  } else if (acao === 'pular') {
    pose.pulo = Math.max(0, Math.sin(s.tAcao * 7)) * 0.42;
    pose.bracoEz = -0.9;
    pose.bracoDz = 0.9;
  } else if (acao === 'olhar') {
    pose.cabecaY = Math.sin(s.tAcao * 2.4) * 0.75;
  } else if (acao === 'trabalhar') {
    pose.bracoEx = -1.15 + Math.sin(t * 18) * 0.12;
    pose.bracoDx = -1.15 + Math.sin(t * 18 + 1.6) * 0.12;
    pose.bracoEz = 0.25;
    pose.bracoDz = -0.25;
    pose.cabecaX = 0.28;
  }

  return pose;
}

/*
 * Movimento do boneco: máquina de estados (andando, parado, ação, selecionado),
 * separação e limites. Tudo é mutado em refs dentro de useFrame, sem re-render.
 * Devolve as refs que o visual prende às suas partes; trocar o visual (primitivas
 * por GLB) não muda este hook.
 */
export function useComportamento({ id, altura = 1 }) {
  const partes = {
    raiz: useRef(null),
    corpo: useRef(null),
    cabeca: useRef(null),
    pernaE: useRef(null),
    pernaD: useRef(null),
    bracoE: useRef(null),
    bracoD: useRef(null),
    anel: useRef(null),
  };

  const ia = useRef(null);
  if (!ia.current) ia.current = criarEstado();

  // No efeito (e não no render), para sobreviver à montagem dupla do StrictMode.
  useEffect(() => {
    posicoes.set(id, ia.current.pos);
    return () => posicoes.delete(id);
  }, [id]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = ia.current;
    const t = state.clock.elapsedTime;
    const { selecionado: idSelecionado, hover } = useEquipe.getState();
    const selecionado = idSelecionado === id;
    const emHover = hover === id;

    const { yawAlvo, andando } = atualizarEstado(s, selecionado, state.camera, dt);
    aplicarLimites(id, s.pos, idSelecionado, dt);

    s.yaw += anguloMaisCurto(s.yaw, yawAlvo) * (1 - Math.exp(-8 * dt));
    s.escala = damp(s.escala, emHover || selecionado ? 1.08 : 1, 10, dt);

    const raiz = partes.raiz.current;
    raiz.position.set(s.pos.x, 0, s.pos.z);
    raiz.rotation.y = s.yaw;
    raiz.scale.setScalar(s.escala * altura);

    const pose = calcularPose(s, andando, t, dt);
    const k = 14;
    const pernaE = partes.pernaE.current.rotation;
    const pernaD = partes.pernaD.current.rotation;
    const bracoE = partes.bracoE.current.rotation;
    const bracoD = partes.bracoD.current.rotation;
    const cabeca = partes.cabeca.current.rotation;
    pernaE.x = damp(pernaE.x, pose.pernaE, k, dt);
    pernaD.x = damp(pernaD.x, pose.pernaD, k, dt);
    bracoE.x = damp(bracoE.x, pose.bracoEx, k, dt);
    bracoD.x = damp(bracoD.x, pose.bracoDx, k, dt);
    bracoE.z = damp(bracoE.z, pose.bracoEz, k, dt);
    bracoD.z = damp(bracoD.z, pose.bracoDz, k, dt);
    cabeca.y = damp(cabeca.y, pose.cabecaY, 8, dt);
    cabeca.x = damp(cabeca.x, pose.cabecaX, 8, dt);

    // Respiração (leve escala em Y) e pulo.
    s.pulo = damp(s.pulo, pose.pulo, 18, dt);
    const corpo = partes.corpo.current;
    corpo.position.y = s.pulo;
    corpo.scale.y = 1 + Math.sin(t * 2.2 + s.passo) * 0.018;

    // Anel de seleção no chão.
    const anel = partes.anel.current;
    const escalaAnel = selecionado ? 1 : emHover ? 0.85 : 0.001;
    anel.rotation.z += dt * 0.8;
    anel.scale.setScalar(damp(anel.scale.x, escalaAnel, 12, dt));
  });

  return partes;
}
