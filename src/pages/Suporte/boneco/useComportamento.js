import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AREA, MOVIMENTO, passoDoFrame, posicoes, useEquipe } from '../store.js';
import {
  ESTACOES,
  OBSTACULOS,
  aindaEDono,
  dentroDaArea,
  expulsarDosBlocos,
  foraDosBlocos,
  liberarEstacao,
  longeDosObstaculos,
  pontoLocal,
  reservarEstacao,
  rotaAte,
} from './estacoes.js';

const ACOES = ['acenar', 'pular', 'olhar', 'trabalhar', 'olhar', 'acenar'];
const RAIO_SEPARACAO = 0.95;
// Bolha em volta do selecionado: menor que o maior vão do layout (1,2 m), senão fecha a passagem.
const RAIO_SEPARACAO_SELECIONADO = 1.3;
// Firme o bastante para segurar quem vem andando (o protótipo usava 2.2 e os corpos se atravessavam).
const FORCA_SEPARACAO = 12;
// Teto (m/s) do empurrão de separação: sem ele, quem levanta perto de alguém sai catapultado.
const VEL_SEPARACAO_MAX = 1.6;
const VEL_SEPARACAO_SELECIONADO = 0.6;
// Parte tangencial da separação para quem anda: rodeia em vez de formar fila.
const TANGENTE_SEPARACAO = 0.6;
// Raio com que o selecionado entra no desvio de quem anda (contornam em vez de parar na bolha).
const RAIO_CONTORNO_SELECIONADO = 1.0;
// Estados em que o boneco está preso à cadeira de uma estação.
const SENTADO = new Set(['sentando', 'trabalhando', 'levantando']);
/*
 * Ritmo de sentar: chance de ir a uma estação quando decide o que fazer, quanto
 * tempo fica sentado, a pausa até querer sentar de novo e a do começo (em s).
 * Vale para /suporte e /desenvolvimento; a sala de reunião troca por um ritmo
 * em que quase todos sentam logo e ficam (configurarRitmo, antes de a cena nascer).
 */
export const RITMO = {
  chance: 0.35,
  duracao: [9, 18],
  descanso: [12, 28],
  inicial: [3, 16],
  // Passeio: não para a menos disto (m) do ponto de chegada de uma estação, para não
  // atrapalhar quem vem sentar. Numa sala com muitos lugares juntos, menos.
  longeDaChegada: 1.0,
};

/** @param {Partial<typeof RITMO>} config */
export function configurarRitmo(config) {
  Object.assign(RITMO, config);
}

// Altura do corpo sentado numa cadeira, quando a estação não diz a dela (estacoes.js).
const ELEVACAO_CADEIRA = 0.17;
// Altura do quadril (pivô das pernas) do boneco em pé, antes da escala (Boneco.jsx).
const QUADRIL = 0.42;
// Segundos para chegar ao computador reservado antes de desistir dele.
const PRAZO_ATE_ESTACAO = 14;
// Até onde, além do raio do obstáculo, o boneco já começa a desviar.
const ALCANCE_DESVIO = 0.8;
// Fração do passo com que ele sai de um obstáculo suave: menor que o passo, escapa pela
// tangente em vez de vibrar na borda.
const SAIDA_SUAVE = 0.8;
// Velocidade (m/s) com que sai do retângulo de um bloco de mesas (o vão entre as cadeiras).
const VEL_SAIDA_BLOCO = 1.5;
// Perto assim do ponto de chegada da estação já pode sentar (quem está parado por ali não bloqueia).
const CHEGADA_ESTACAO = 0.4;
const CHEGADA_PASSEIO = 0.12;
// Só troca o lado do contorno quando a direção cruza o obstáculo com folga (|n×v| acima disto).
const LIMIAR_LADO = 0.25;
// Janela (s) em que o avanço é medido; abaixo de PROGRESSO_MINIMO ele está encurralado.
const JANELA_PROGRESSO = 0.6;
const PROGRESSO_MINIMO = 0.1;
// Velocidade real abaixo da qual a pose é a de parado, mesmo no estado andando.
const VEL_POSE_PARADA = 0.2;
// Lado da cadeira (local) por onde entra e sai do assento, para não atravessar o encosto.
const LADO_CADEIRA = { x: 0.62, zAtras: 1.2, zFrente: 0.72 };
// Velocidade média (m/s) do deslize até o assento e de volta.
const VEL_SENTAR = 1.1;
const VEL_LEVANTAR = 1.3;

const rand = (min, max) => min + Math.random() * (max - min);
const { clamp, damp } = THREE.MathUtils;
const suave = (x) => x * x * (3 - 2 * x);

// O selecionado como obstáculo virtual: atualizado a cada frame a partir de `posicoes`.
const BOLHA = { x: 0, z: 0, r: 0, estacao: 'selecionado' };

function atualizarBolha(idSelecionado) {
  const pos = idSelecionado ? posicoes.get(idSelecionado) : null;
  BOLHA.r = pos ? RAIO_CONTORNO_SELECIONADO : 0;
  if (pos) {
    BOLHA.x = pos.x;
    BOLHA.z = pos.z;
  }
}

const naBolha = (p, raio = RAIO_SEPARACAO_SELECIONADO) => BOLHA.r > 0 && Math.hypot(p.x - BOLHA.x, p.z - BOLHA.z) < raio;
const pertoDeAprox = (p) => ESTACOES.some((e) => Math.hypot(p.x - e.aprox.x, p.z - e.aprox.z) < RITMO.longeDaChegada);
// Um ponto onde dá para ficar: fora de mesas, cadeiras, do corredor do quadro e da bolha do selecionado.
const pontoLivre = (p, margem) => longeDosObstaculos(p, margem) && foraDosBlocos(p) && !naBolha(p);

// Sorteia um ponto na elipse longe de mesas, cadeiras, chegadas de estação e do selecionado.
// Se nada servir em 25 tentativas, usa a reserva (último ponto válido) em vez de um ponto ruim.
function pontoAleatorio(vetor, reserva) {
  for (let tentativa = 0; tentativa < 25; tentativa++) {
    const angulo = Math.random() * Math.PI * 2;
    const raio = Math.sqrt(Math.random());
    vetor.set(Math.cos(angulo) * AREA.rx * raio, 0, Math.sin(angulo) * AREA.rz * raio);
    if (dentroDaArea(AREA, vetor, 0.15) && pontoLivre(vetor, 0.3) && !pertoDeAprox(vetor)) {
      if (reserva) reserva.copy(vetor);
      return vetor;
    }
  }
  if (reserva) vetor.copy(reserva);
  return vetor;
}

function anguloMaisCurto(atual, alvo) {
  let diferenca = alvo - atual;
  while (diferenca > Math.PI) diferenca -= Math.PI * 2;
  while (diferenca < -Math.PI) diferenca += Math.PI * 2;
  return diferenca;
}

// Número estável a partir do id, para espalhar os bonecos pelos cantos.
function hash(texto) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Velocidade e fase variam por boneco, para dar personalidade.
function criarEstado(id) {
  const pos = pontoAleatorio(new THREE.Vector3());
  return {
    id,
    pos,
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
    // Contorno: lado escolhido por obstáculo (histerese) e canto do bloco que está mirando.
    lados: new Map(),
    canto: null,
    offsetCanto: ((hash(id) % 5) - 2) * 0.15,
    // Avanço real: posição marcada no início da janela e janelas seguidas sem avançar.
    marca: pos.clone(),
    tProgresso: 0,
    janelasParadas: 0,
    ultimoLivre: pos.clone(),
    posAnterior: pos.clone(),
    velReal: 0,
    // Trabalho na estação.
    estacao: null,
    indo: false,
    tSent: 0,
    sentado: 0,
    // Altura do assento atual; guardada para não dar um tranco se o lugar sumir com ele sentado.
    elevacao: ELEVACAO_CADEIRA,
    descanso: rand(...RITMO.inicial), // tempo mínimo até querer sentar de novo
    micro: 'digitar',
    tMicro: 0,
    // Caminho da chegada até o assento (pelo lado da cadeira) e de volta.
    origem: new THREE.Vector3(),
    trajeto: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }],
    trechos: [0, 0, 0],
    trajetoTotal: 0,
    duracaoSentar: 0.7,
    duracaoLevantar: 0.6,
  };
}

const velocidade = (s) => s.vel * (MOVIMENTO.reduzido ? 0.5 : 1);

const anguloPara = (pos, alvo) => Math.atan2(alvo.x - pos.x, alvo.z - pos.z);

// Lado (±1) por onde contornar `chave`, com histerese: mantém o anterior enquanto a
// direção não cruzar o obstáculo com folga para o outro lado. Sem isso o lado era
// reescolhido a cada frame e o boneco vibrava na borda.
function escolherLado(s, chave, cruz) {
  const anterior = s.lados.get(chave);
  if (anterior !== undefined && (Math.abs(cruz) <= LIMIAR_LADO || Math.sign(cruz) === anterior)) return anterior;
  const lado = cruz < 0 ? -1 : 1;
  s.lados.set(chave, lado);
  return lado;
}

// Direção acumulada pelo desvio (um só objeto, mutado a cada frame).
const V = { x: 0, z: 0 };

function contornar(s, o) {
  if (o.r <= 0) return;
  const ox = s.pos.x - o.x;
  const oz = s.pos.z - o.z;
  const dist = Math.hypot(ox, oz);
  const alcance = o.r + ALCANCE_DESVIO;
  if (dist >= alcance || dist < 1e-4) return;
  const peso = (alcance - dist) / ALCANCE_DESVIO;
  const nx = ox / dist;
  const nz = oz / dist;
  // Contorna pelo lado que mais aproxima do alvo.
  const norma = Math.hypot(V.x, V.z) || 1;
  const lado = escolherLado(s, o, (-nz * V.x + nx * V.z) / norma);
  V.x += (nx * 0.9 - nz * lado * 1.2) * peso;
  V.z += (nz * 0.9 + nx * lado * 1.2) * peso;
}

// Direção ao alvo somada ao desvio das mesas e do selecionado: repulsão mais contorno lateral.
// A estação para onde o boneco vai não o repele, ou ele rodearia a cadeira sem chegar.
function desviar(s, dirX, dirZ, idDestino) {
  V.x = dirX;
  V.z = dirZ;
  for (const o of OBSTACULOS) if (o.estacao !== idDestino) contornar(s, o);
  contornar(s, BOLHA);
  const norma = Math.hypot(V.x, V.z) || 1;
  V.x /= norma;
  V.z /= norma;
  return V;
}

// Começa (ou recomeça) uma caminhada: zera a memória do contorno e a medida de avanço.
function iniciarCaminhada(s) {
  s.lados.clear();
  s.canto = null;
  s.marca.copy(s.pos);
  s.tProgresso = 0;
  s.janelasParadas = 0;
}

// Mede o avanço por janelas de 0,6 s. Devolve true quando está encurralado: uma janela
// parada no passeio, duas a caminho de uma estação (dá tempo de alguém sair da frente).
function encurralado(s, dt) {
  s.tProgresso += dt;
  if (s.tProgresso < JANELA_PROGRESSO) return false;
  s.tProgresso = 0;
  const avancou = Math.hypot(s.pos.x - s.marca.x, s.pos.z - s.marca.z);
  s.marca.copy(s.pos);
  s.janelasParadas = avancou < PROGRESSO_MINIMO ? s.janelasParadas + 1 : 0;
  return s.janelasParadas >= (s.indo ? 2 : 1);
}

// A chegada da estação ainda dá para alcançar? Não se o corredor do quadro ou a bolha do
// selecionado cobriram o ponto: melhor desistir já do que esperar o prazo.
function chegadaAlcancavel(estacao) {
  const { aprox } = estacao;
  if (naBolha(aprox, RAIO_SEPARACAO_SELECIONADO - CHEGADA_ESTACAO)) return false;
  return OBSTACULOS.every((o) => !o.suave || o.r <= 0 || Math.hypot(aprox.x - o.x, aprox.z - o.z) >= o.r);
}

function desistir(s) {
  liberarEstacao(s);
  s.descanso = rand(5, 10);
  s.estado = 'parado';
  s.timer = rand(0.8, 3.2);
  return { yawAlvo: s.yaw, andando: false };
}

// Prazo do passeio: o bastante para cruzar a distância com folga (num tapete grande, 9 s não chegam à borda).
const PRAZO_PASSEIO = 9;

function novoPasseio(s) {
  pontoAleatorio(s.alvo, s.ultimoLivre);
  s.timer = Math.max(PRAZO_PASSEIO, (1.6 * rotaAte(s.pos, s.alvo, AREA).comprimento) / velocidade(s));
  iniciarCaminhada(s);
}

/*
 * Caminho da chegada até o assento sem atravessar o encosto: da posição real, pelo
 * lado da cadeira mais perto (atrás e depois ao lado do assento) até o assento. As
 * pernas só dobram no último trecho. O levantar faz o caminho inverso.
 */
function prepararTrajeto(s) {
  const { pos, estacao, trajeto, trechos } = s;
  s.origem.copy(pos);
  trajeto[0].x = pos.x;
  trajeto[0].z = pos.z;
  if (estacao.trajetoDireto) {
    // Sem encosto (um pufe): da chegada direto ao assento, já dobrando as pernas.
    Object.assign(trajeto[1], trajeto[0]);
    Object.assign(trajeto[2], trajeto[0]);
  } else {
    pelaLateralDaCadeira(s);
  }
  trajeto[3].x = estacao.assento.x;
  trajeto[3].z = estacao.assento.z;
  let total = 0;
  for (let i = 0; i < 3; i++) {
    trechos[i] = Math.hypot(trajeto[i + 1].x - trajeto[i].x, trajeto[i + 1].z - trajeto[i].z);
    total += trechos[i];
  }
  s.trajetoTotal = total;
  s.duracaoSentar = Math.max(0.7, total / VEL_SENTAR);
  s.duracaoLevantar = Math.max(0.6, total / VEL_LEVANTAR);
}

// Os dois pontos ao lado da cadeira (atrás e ao lado do assento) do lado por onde ele chegou.
function pelaLateralDaCadeira(s) {
  const { pos, estacao, trajeto } = s;
  const c = Math.cos(estacao.rot);
  const sen = Math.sin(estacao.rot);
  // x local da origem: de que lado da cadeira ele chegou.
  const lx = (pos.x - estacao.x) * c - (pos.z - estacao.z) * sen;
  const lado = lx < 0 ? -1 : 1;
  Object.assign(trajeto[1], pontoLocal(estacao, lado * LADO_CADEIRA.x, LADO_CADEIRA.zAtras));
  Object.assign(trajeto[2], pontoLocal(estacao, lado * LADO_CADEIRA.x, LADO_CADEIRA.zFrente));
}

// Põe o boneco na fração k (0 = chegada, 1 = assento) do caminho até o assento.
function posicaoNoTrajeto(s, k) {
  const { trajeto, trechos, pos } = s;
  let d = k * s.trajetoTotal;
  let i = 0;
  while (i < 2 && d > trechos[i]) {
    d -= trechos[i];
    i += 1;
  }
  const f = trechos[i] > 1e-6 ? Math.min(d / trechos[i], 1) : 1;
  pos.x = trajeto[i].x + (trajeto[i + 1].x - trajeto[i].x) * f;
  pos.z = trajeto[i].z + (trajeto[i + 1].z - trajeto[i].z) * f;
  // As pernas dobram e o quadril sobe só no último trecho, já ao lado do assento.
  s.sentado = i === 2 ? f : 0;
}

function andar(s, dt) {
  const { pos } = s;
  const dx = s.alvo.x - pos.x;
  const dz = s.alvo.z - pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist < (s.indo ? CHEGADA_ESTACAO : CHEGADA_PASSEIO)) {
    if (s.indo) {
      s.estado = 'sentando';
      s.tSent = 0;
      s.indo = false;
      prepararTrajeto(s);
    } else {
      s.estado = 'parado';
      s.timer = rand(0.8, 3.2);
    }
    return { yawAlvo: s.yaw, andando: false };
  }

  const parou = encurralado(s, dt);
  if (s.indo) {
    // Prazo vencido, encurralado, chegada coberta ou a estação saiu do cenário: desiste da reserva.
    if (s.timer <= 0 || parou || !aindaEDono(s) || !chegadaAlcancavel(s.estacao)) return desistir(s);
  } else if (s.timer <= 0) {
    s.estado = 'parado';
    s.timer = rand(0.8, 3.2);
    return { yawAlvo: s.yaw, andando: false };
  } else if (parou || !pontoLivre(s.alvo, 0.1)) {
    // Encurralado, ou o ponto deixou de ser livre (o corredor abriu em cima): outro ponto.
    novoPasseio(s);
  }

  // Com o bloco de estações no caminho, mira primeiro o canto que dá a volta.
  const rota = rotaAte(pos, s.alvo, AREA, s.canto, s.offsetCanto);
  s.canto = rota.canto ?? null;
  const rx = rota.ponto.x - pos.x;
  const rz = rota.ponto.z - pos.z;
  const distPonto = Math.hypot(rx, rz) || 1;
  const direcao = desviar(s, rx / distPonto, rz / distPonto, s.indo ? s.estacao.id : null);
  const v = velocidade(s);
  pos.x += direcao.x * v * dt;
  pos.z += direcao.z * v * dt;
  return { yawAlvo: Math.atan2(direcao.x, direcao.z), andando: true };
}

// Parado, escolhe o que fazer em seguida: trabalhar num computador, uma ação ou andar.
function decidir(s) {
  // A reserva é feita agora, antes de andar: 1 técnico por computador.
  const querTrabalhar = s.descanso <= 0 && Math.random() < RITMO.chance;
  const estacao = querTrabalhar ? reservarEstacao(s.id, AREA) : null;

  if (estacao) {
    s.estacao = estacao;
    s.indo = true;
    s.estado = 'andando';
    s.alvo.set(estacao.aprox.x, 0, estacao.aprox.z);
    // Prazo para chegar: 14 s, ou mais quando a volta pelo bloco é longa para o passo dele.
    s.timer = Math.max(PRAZO_ATE_ESTACAO, (2 * rotaAte(s.pos, s.alvo, AREA).comprimento) / velocidade(s));
    iniciarCaminhada(s);
  } else if (Math.random() < 0.4) {
    s.estado = 'acao';
    s.acao = ACOES[Math.floor(Math.random() * ACOES.length)];
    if (MOVIMENTO.reduzido && s.acao === 'pular') s.acao = 'olhar';
    s.timer = s.acao === 'trabalhar' ? rand(2.5, 4) : rand(1.6, 2.6);
    s.tAcao = 0;
  } else {
    s.estado = 'andando';
    novoPasseio(s);
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

  // Sentando ou levantando: desliza entre a posição em que chegou e o assento, pelo lado da cadeira.
  s.tSent += (s.estado === 'sentando' ? 1 / s.duracaoSentar : -1 / s.duracaoLevantar) * dt;
  posicaoNoTrajeto(s, suave(clamp(s.tSent, 0, 1)));

  if (s.estado === 'sentando' && s.tSent >= 1) {
    s.estado = 'trabalhando';
    s.timer = rand(...RITMO.duracao);
    s.micro = 'digitar';
    s.tMicro = rand(2, 4);
  } else if (s.estado === 'levantando' && s.tSent <= 0) {
    liberarEstacao(s);
    s.sentado = 0;
    s.estado = 'parado';
    s.timer = rand(0.4, 1.2);
    s.descanso = rand(...RITMO.descanso);
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

// Tira o ponto de dentro do círculo, no máximo `maximo` de uma vez.
function empurrarParaFora(pos, o, maximo) {
  const ox = pos.x - o.x;
  const oz = pos.z - o.z;
  const dist = Math.hypot(ox, oz);
  if (dist < o.r && dist > 1e-4) {
    const recuo = Math.min(o.r - dist, maximo);
    pos.x += (ox / dist) * recuo;
    pos.z += (oz / dist) * recuo;
  }
}

// Empurra para longe de quem está perto demais, para fora de mesas e cadeiras e
// mantém dentro da elipse.
function aplicarLimites(s, idSelecionado, dt) {
  const { id, pos } = s;
  const andando = s.estado === 'andando';

  if (id !== idSelecionado) {
    for (const [outroId, outra] of posicoes) {
      if (outroId === id) continue;
      const dx = pos.x - outra.x;
      const dz = pos.z - outra.z;
      const dist = Math.hypot(dx, dz);
      const doSelecionado = outroId === idSelecionado;
      const raio = doSelecionado ? RAIO_SEPARACAO_SELECIONADO : RAIO_SEPARACAO;
      if (dist > 0.0001 && dist < raio) {
        const teto = doSelecionado ? VEL_SEPARACAO_SELECIONADO : VEL_SEPARACAO_MAX;
        const forca = Math.min((raio - dist) * FORCA_SEPARACAO, teto) * dt;
        const nx = dx / dist;
        const nz = dz / dist;
        pos.x += nx * forca;
        pos.z += nz * forca;
        if (andando) {
          // Quem anda também escorrega pela tangente, para o lado do alvo: rodeia em vez de fazer fila.
          const ax = s.alvo.x - pos.x;
          const az = s.alvo.z - pos.z;
          const norma = Math.hypot(ax, az) || 1;
          const lado = escolherLado(s, outroId, (-nz * ax + nx * az) / norma);
          pos.x += -nz * lado * forca * TANGENTE_SEPARACAO;
          pos.z += nx * lado * forca * TANGENTE_SEPARACAO;
        }
      }
    }
  }

  // Obstáculos em duas passadas: primeiro os suaves (o corredor do quadro), de onde sai
  // mais devagar que o passo; depois o retângulo dos blocos (fecha o vão entre as
  // cadeiras), salvo para quem vai sentar nele; e por último os duros, para ninguém
  // terminar o frame dentro de mesa ou cadeira.
  const saidaSuave = SAIDA_SUAVE * velocidade(s) * dt;
  for (const o of OBSTACULOS) if (o.suave) empurrarParaFora(pos, o, saidaSuave);
  expulsarDosBlocos(pos, s.indo ? s.estacao.id : null, VEL_SAIDA_BLOCO * dt);
  for (const o of OBSTACULOS) if (!o.suave) empurrarParaFora(pos, o, Infinity);

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

// Estados em que o deslocamento real vira passos (e não um escorregão).
const PODE_PASSEAR = new Set(['andando', 'parado', 'sentando', 'levantando']);

// Ângulos-alvo de pernas, braços e cabeça para o estado atual.
function calcularPose(s, selecionado, camera, t, dt) {
  const pose = { pernaE: 0, pernaD: 0, bracoEz: -0.1, bracoDz: 0.1, bracoEx: 0, bracoDx: 0, cabecaY: 0, cabecaX: 0, pulo: 0 };
  const acao = s.estado === 'acao' ? s.acao : null;
  // Os passos seguem o deslocamento real: segurado no lugar, ele não marca passo;
  // empurrado ou deslizando até a cadeira, anda.
  const andando = s.velReal > VEL_POSE_PARADA && s.sentado < 0.15 && PODE_PASSEAR.has(s.estado);

  if (andando) {
    s.passo += dt * s.velReal * 9;
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
    const dt = passoDoFrame(delta);
    const s = ia.current;
    const t = state.clock.elapsedTime;
    const { selecionado: idSelecionado, hover } = useEquipe.getState();
    const selecionado = idSelecionado === id;
    const emHover = hover === id;

    atualizarBolha(idSelecionado);
    const { yawAlvo } = atualizarEstado(s, selecionado, state.camera, dt);
    // Sentado, fica fixo na cadeira: sem separação, desvio nem limite da elipse.
    if (!SENTADO.has(s.estado)) {
      aplicarLimites(s, idSelecionado, dt);
      s.sentado = damp(s.sentado, 0, 10, dt);
    }

    // Velocidade real (depois de empurrões e limites): dirige os passos.
    const deslocamento = Math.hypot(s.pos.x - s.posAnterior.x, s.pos.z - s.posAnterior.z);
    s.velReal = damp(s.velReal, deslocamento / dt, 12, dt);
    s.posAnterior.copy(s.pos);

    s.yaw += anguloMaisCurto(s.yaw, yawAlvo) * (1 - Math.exp(-8 * dt));
    s.escala = damp(s.escala, emHover || selecionado ? 1.08 : 1, 10, dt);

    const raiz = partes.raiz.current;
    raiz.position.set(s.pos.x, 0, s.pos.z);
    raiz.rotation.y = s.yaw;
    raiz.scale.setScalar(s.escala * altura);

    const pose = calcularPose(s, selecionado, state.camera, t, dt);
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
    if (s.estacao) {
      const { alturaQuadril, elevacao } = s.estacao;
      // A escala (altura) também multiplica a subida: com a altura do quadril no mundo,
      // baixos e altos sentam no mesmo lugar do estofado.
      s.elevacao = alturaQuadril != null ? alturaQuadril / altura - QUADRIL : (elevacao ?? ELEVACAO_CADEIRA);
    }
    corpo.position.y = s.pulo + s.sentado * s.elevacao;
    corpo.scale.y = 1 + Math.sin(t * 2.2 + s.passo) * 0.018 * (1 - s.sentado * 0.5);

    // Anel de seleção no chão.
    const anel = partes.anel.current;
    const escalaAnel = selecionado ? 1 : emHover ? 0.85 : 0.001;
    anel.rotation.z += dt * 0.8;
    anel.scale.setScalar(damp(anel.scale.x, escalaAnel, 12, dt));
  });

  return partes;
}
