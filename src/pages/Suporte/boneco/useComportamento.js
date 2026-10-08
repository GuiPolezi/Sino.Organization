import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AREA, MOVIMENTO, posicoes, useEquipe } from '../store.js';
import {
  OBSTACULOS,
  aindaEDono,
  liberarEstacao,
  longeDosObstaculos,
  reservarEstacao,
  rotaAte,
} from './estacoes.js';

const ACOES = ['acenar', 'pular', 'olhar', 'trabalhar', 'olhar', 'acenar'];
const RAIO_SEPARACAO = 0.95;
const RAIO_SEPARACAO_SELECIONADO = 1.9;
// Firme o bastante para segurar quem vem andando (o protótipo usava 2.2 e os corpos se atravessavam).
const FORCA_SEPARACAO = 12;
// Estados em que o boneco está preso à cadeira de uma estação.
const SENTADO = new Set(['sentando', 'trabalhando', 'levantando']);
const CHANCE_DE_TRABALHAR = 0.35;
// Segundos para chegar ao computador reservado antes de desistir dele.
const PRAZO_ATE_ESTACAO = 14;
// Até onde, além do raio do obstáculo, o boneco já começa a desviar.
const ALCANCE_DESVIO = 0.8;
// Velocidade (m/s) com que o boneco sai de dentro de um obstáculo suave.
const VELOCIDADE_SAIDA = 2.2;

const rand = (min, max) => min + Math.random() * (max - min);
const { clamp, damp } = THREE.MathUtils;
const suave = (x) => x * x * (3 - 2 * x);

// Sorteia um ponto na elipse que não caia em cima de mesas e cadeiras.
function pontoAleatorio(vetor) {
  for (let tentativa = 0; tentativa < 25; tentativa++) {
    const angulo = Math.random() * Math.PI * 2;
    const raio = Math.sqrt(Math.random()) * 0.92;
    vetor.set(Math.cos(angulo) * AREA.rx * raio, 0, Math.sin(angulo) * AREA.rz * raio);
    if (longeDosObstaculos(vetor)) break;
  }
  return vetor;
}

function anguloMaisCurto(atual, alvo) {
  let diferenca = alvo - atual;
  while (diferenca > Math.PI) diferenca -= Math.PI * 2;
  while (diferenca < -Math.PI) diferenca += Math.PI * 2;
  return diferenca;
}

// Velocidade e fase variam por boneco, para dar personalidade.
const criarEstado = (id) => ({
  id,
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
  // Trabalho na estação.
  estacao: null,
  indo: false,
  tSent: 0,
  sentado: 0,
  descanso: rand(3, 16), // tempo mínimo até querer sentar de novo
  micro: 'digitar',
  tMicro: 0,
});

const velocidade = (s) => s.vel * (MOVIMENTO.reduzido ? 0.5 : 1);

const anguloPara = (pos, alvo) => Math.atan2(alvo.x - pos.x, alvo.z - pos.z);

// Direção ao alvo somada ao desvio das mesas: repulsão mais contorno lateral.
// A estação para onde o boneco vai não o repele, ou ele rodearia a cadeira sem chegar.
function desviar(pos, dirX, dirZ, idDestino) {
  let vx = dirX;
  let vz = dirZ;
  for (const o of OBSTACULOS) {
    if (o.r <= 0 || o.estacao === idDestino) continue;
    const ox = pos.x - o.x;
    const oz = pos.z - o.z;
    const dist = Math.hypot(ox, oz);
    const alcance = o.r + ALCANCE_DESVIO;
    if (dist >= alcance || dist < 1e-4) continue;
    const peso = (alcance - dist) / ALCANCE_DESVIO;
    const nx = ox / dist;
    const nz = oz / dist;
    // Contorna pelo lado que mais aproxima do alvo.
    const lado = -nz * vx + nx * vz < 0 ? -1 : 1;
    vx += (nx * 0.9 - nz * lado * 1.2) * peso;
    vz += (nz * 0.9 + nx * lado * 1.2) * peso;
  }
  const norma = Math.hypot(vx, vz) || 1;
  return { x: vx / norma, z: vz / norma };
}

function andar(s, dt) {
  const { pos } = s;
  const dx = s.alvo.x - pos.x;
  const dz = s.alvo.z - pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist < (s.indo ? 0.18 : 0.12)) {
    if (s.indo) {
      s.estado = 'sentando';
      s.tSent = 0;
      s.indo = false;
    } else {
      s.estado = 'parado';
      s.timer = rand(0.8, 3.2);
    }
    return { yawAlvo: s.yaw, andando: false };
  }

  if (s.timer <= 0) {
    // Não conseguiu chegar ao computador: desiste da reserva.
    if (s.indo) {
      liberarEstacao(s);
      s.descanso = rand(5, 10);
    }
    s.estado = 'parado';
    s.timer = rand(0.8, 3.2);
    return { yawAlvo: s.yaw, andando: false };
  }

  // Com o bloco de estações no caminho, mira primeiro o canto que dá a volta.
  const { ponto } = rotaAte(pos, s.alvo);
  const rx = ponto.x - pos.x;
  const rz = ponto.z - pos.z;
  const distPonto = Math.hypot(rx, rz) || 1;
  const direcao = desviar(pos, rx / distPonto, rz / distPonto, s.indo ? s.estacao.id : null);
  const v = velocidade(s);
  pos.x += direcao.x * v * dt;
  pos.z += direcao.z * v * dt;
  return { yawAlvo: Math.atan2(direcao.x, direcao.z), andando: true };
}

// Parado, escolhe o que fazer em seguida: trabalhar num computador, uma ação ou andar.
function decidir(s) {
  // A reserva é feita agora, antes de andar: 1 técnico por computador.
  const querTrabalhar = s.descanso <= 0 && Math.random() < CHANCE_DE_TRABALHAR;
  const estacao = querTrabalhar ? reservarEstacao(s.id, AREA) : null;

  if (estacao) {
    s.estacao = estacao;
    s.indo = true;
    s.estado = 'andando';
    s.alvo.set(estacao.aprox.x, 0, estacao.aprox.z);
    // Prazo para chegar: 14 s, ou mais quando a volta pelo bloco é longa para o passo dele.
    s.timer = Math.max(PRAZO_ATE_ESTACAO, (2 * rotaAte(s.pos, s.alvo).comprimento) / velocidade(s));
  } else if (Math.random() < 0.4) {
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
}

// Sorteia o que o técnico faz na cadeira pelos próximos segundos.
function sortearMicro(s) {
  const sorteio = Math.random();
  s.micro = sorteio < 0.55 ? 'digitar' : sorteio < 0.7 ? 'esticar' : sorteio < 0.85 ? 'pensar' : 'olharCamera';
  s.tMicro = s.micro === 'digitar' ? rand(2.5, 5) : rand(1.2, 2.2);
}

// Sentar, trabalhar e levantar: o boneco fica preso à estação que reservou.
function atualizarSentado(s, selecionado, dt) {
  const { pos, estacao } = s;

  // Proteção: sem a reserva (não deveria acontecer), volta a andar.
  if (!aindaEDono(s)) {
    liberarEstacao(s);
    s.estado = 'parado';
    s.timer = rand(0.4, 1.2);
    return { yawAlvo: s.yaw, andando: false };
  }

  if (s.estado === 'trabalhando') {
    pos.x = estacao.assento.x;
    pos.z = estacao.assento.z;
    s.sentado = 1;
    s.tMicro -= dt;
    if (s.tMicro <= 0) sortearMicro(s);
    s.timer -= dt;
    // Selecionado, não levanta: continua sentado e acena.
    if (s.timer <= 0 && !selecionado) {
      s.estado = 'levantando';
      s.tSent = 1;
    }
    return { yawAlvo: estacao.yaw, andando: false };
  }

  // Sentando (0,7 s) ou levantando (0,6 s): desliza entre a chegada e o assento.
  s.tSent += (s.estado === 'sentando' ? 1 / 0.7 : -1 / 0.6) * dt;
  const k = suave(clamp(s.tSent, 0, 1));
  pos.x = estacao.aprox.x + (estacao.assento.x - estacao.aprox.x) * k;
  pos.z = estacao.aprox.z + (estacao.assento.z - estacao.aprox.z) * k;
  s.sentado = k;

  if (s.estado === 'sentando' && s.tSent >= 1) {
    s.estado = 'trabalhando';
    s.timer = rand(9, 18);
    s.micro = 'digitar';
    s.tMicro = rand(2, 4);
  } else if (s.estado === 'levantando' && s.tSent <= 0) {
    liberarEstacao(s);
    s.sentado = 0;
    s.estado = 'parado';
    s.timer = rand(0.4, 1.2);
    s.descanso = rand(12, 28);
  }
  return { yawAlvo: estacao.yaw, andando: false };
}

// Avança a máquina de estados e devolve para onde o boneco deve virar e se está andando.
function atualizarEstado(s, selecionado, camera, dt) {
  const { pos } = s;

  // Em pé, o selecionado para e acena (e solta o computador para onde ia); sentado, fica na cadeira.
  if (selecionado && !SENTADO.has(s.estado) && s.estado !== 'selecionado') {
    liberarEstacao(s);
    s.estado = 'selecionado';
  } else if (!selecionado && s.estado === 'selecionado') {
    s.estado = 'parado';
    s.timer = rand(0.6, 1.5);
  }

  s.descanso -= dt;

  if (s.estado === 'selecionado') return { yawAlvo: anguloPara(pos, camera.position), andando: false };
  if (SENTADO.has(s.estado)) return atualizarSentado(s, selecionado, dt);

  s.timer -= dt;

  if (s.estado === 'andando') return andar(s, dt);

  if (s.estado === 'parado' && s.timer <= 0) {
    decidir(s);
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

// Empurra para longe de quem está perto demais, para fora de mesas e cadeiras e
// mantém dentro da elipse.
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

  // Nunca atravessa mesas e cadeiras: quem entrou no círculo volta para a borda.
  // De um obstáculo suave (o corredor do quadro) ele sai aos poucos, sem salto.
  for (const o of OBSTACULOS) {
    const ox = pos.x - o.x;
    const oz = pos.z - o.z;
    const dist = Math.hypot(ox, oz);
    if (dist < o.r && dist > 1e-4) {
      const recuo = o.suave ? Math.min(o.r - dist, VELOCIDADE_SAIDA * dt) : o.r - dist;
      pos.x += (ox / dist) * recuo;
      pos.z += (oz / dist) * recuo;
    }
  }

  const e = (pos.x / AREA.rx) ** 2 + (pos.z / AREA.rz) ** 2;
  if (e > 1) {
    const k = 1 / Math.sqrt(e);
    pos.x *= k;
    pos.z *= k;
  }
}

// Pose na cadeira: digitando, com micro-ações; selecionado, acena para a câmera.
function poseTrabalhando(pose, s, selecionado, camera, t) {
  const olharCamera = clamp(anguloMaisCurto(s.yaw, anguloPara(s.pos, camera.position)), -1.1, 1.1);

  pose.bracoEx = -1.0 + Math.sin(t * 17) * 0.1;
  pose.bracoDx = -1.0 + Math.sin(t * 17 + 1.7) * 0.1;
  pose.bracoEz = 0.22;
  pose.bracoDz = -0.22;
  pose.cabecaX = 0.2;
  pose.cabecaY = Math.sin(t * 0.7 + s.passo) * 0.12;

  if (s.micro === 'esticar') {
    Object.assign(pose, { bracoEx: 0, bracoDx: 0, bracoEz: -2.75, bracoDz: 2.75, cabecaX: -0.25, cabecaY: 0 });
  } else if (s.micro === 'pensar') {
    Object.assign(pose, { bracoDx: -2.1, bracoDz: -0.55, cabecaX: 0.05, cabecaY: 0.3 });
  } else if (s.micro === 'olharCamera') {
    Object.assign(pose, { bracoEx: -0.9, bracoDx: -0.9, cabecaX: -0.05, cabecaY: olharCamera });
  }

  if (selecionado) {
    Object.assign(pose, { bracoDx: 0, bracoDz: 2.55 + Math.sin(t * 11) * 0.35, cabecaX: -0.08, cabecaY: olharCamera });
  }
}

// Ângulos-alvo de pernas, braços e cabeça para o estado atual.
function calcularPose(s, andando, selecionado, camera, t, dt) {
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
  } else if (s.estado === 'trabalhando') {
    poseTrabalhando(pose, s, selecionado, camera, t);
  } else if (s.estado === 'sentando' || s.estado === 'levantando') {
    pose.bracoEz = -0.35;
    pose.bracoDz = 0.35;
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

  // Sentado, as pernas dobram para a frente.
  if (s.sentado > 0.001) {
    pose.pernaE = pose.pernaE * (1 - s.sentado) - 1.5 * s.sentado;
    pose.pernaD = pose.pernaD * (1 - s.sentado) - 1.5 * s.sentado;
  }

  return pose;
}

/*
 * Movimento do boneco: máquina de estados (andando, parado, ação, selecionado e
 * o trabalho numa estação: sentando, trabalhando, levantando), separação e limites.
 * Tudo é mutado em refs dentro de useFrame, sem re-render.
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
  if (!ia.current) ia.current = criarEstado(id);

  // No efeito (e não no render), para sobreviver à montagem dupla do StrictMode.
  useEffect(() => {
    posicoes.set(id, ia.current.pos);
    return () => {
      posicoes.delete(id);
      liberarEstacao(ia.current);
    };
  }, [id]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = ia.current;
    const t = state.clock.elapsedTime;
    const { selecionado: idSelecionado, hover } = useEquipe.getState();
    const selecionado = idSelecionado === id;
    const emHover = hover === id;

    const { yawAlvo, andando } = atualizarEstado(s, selecionado, state.camera, dt);
    // Sentado, fica fixo na cadeira: sem separação, desvio nem limite da elipse.
    if (!SENTADO.has(s.estado)) {
      aplicarLimites(id, s.pos, idSelecionado, dt);
      s.sentado = damp(s.sentado, 0, 10, dt);
    }

    s.yaw += anguloMaisCurto(s.yaw, yawAlvo) * (1 - Math.exp(-8 * dt));
    s.escala = damp(s.escala, emHover || selecionado ? 1.08 : 1, 10, dt);

    const raiz = partes.raiz.current;
    raiz.position.set(s.pos.x, 0, s.pos.z);
    raiz.rotation.y = s.yaw;
    raiz.scale.setScalar(s.escala * altura);

    const pose = calcularPose(s, andando, selecionado, state.camera, t, dt);
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

    // Respiração (leve escala em Y), pulo e a subida do quadril até o assento.
    s.pulo = damp(s.pulo, pose.pulo, 18, dt);
    const corpo = partes.corpo.current;
    corpo.position.y = s.pulo + s.sentado * 0.17;
    corpo.scale.y = 1 + Math.sin(t * 2.2 + s.passo) * 0.018 * (1 - s.sentado * 0.5);

    // Anel de seleção no chão.
    const anel = partes.anel.current;
    const escalaAnel = selecionado ? 1 : emHover ? 0.85 : 0.001;
    anel.rotation.z += dt * 0.8;
    anel.scale.setScalar(damp(anel.scale.x, escalaAnel, 12, dt));
  });

  return partes;
}
