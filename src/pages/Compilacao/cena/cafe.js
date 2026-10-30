/*
 * O comportamento a mais da equipe de compilação (os ganchos de EXTRA em
 * Suporte/boneco/useComportamento.js): a pausa para o café e os pufes.
 *
 *   buscar café   anda até a mesa do café, mexe na cafeteira e sai com a xícara
 *   tomar café    com a xícara na mão: dá goles parado, passeia com ela ou vai
 *                 sentar num pufe e toma lá
 *   devolver      com a xícara vazia, volta à mesa e a deixa lá
 *   pufe          também dá para descansar no pufe sem café
 *
 * Sem xícara, o resto é o de sempre (mesas, acenos, passeios). Com a xícara na
 * mão ninguém vai para o computador: primeiro termina o café e devolve a xícara.
 * Tudo aqui é mutado no estado do boneco (`s`), sem React nem three.js.
 */

const rand = (min, max) => min + Math.random() * (max - min);
const sortearInteiro = (min, max) => Math.floor(rand(min, max + 1));
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

// Duração (s) de um gole: o braço sobe, a xícara inclina e o braço desce.
export const DURACAO_GOLE = 1.5;
// Goles numa xícara cheia.
const GOLES = [4, 7];
// Pausa (s) entre um gole e outro: parado "tomando café" é mais seguido.
const ENTRE_GOLES = [2.5, 5];
const ENTRE_GOLES_BEBENDO = [0.5, 1.1];
// Chance de, parado e sem xícara, ir buscar café ou descansar no pufe (quando já pode).
const CHANCE_CAFE = 0.35;
const CHANCE_PUFE = 0.15;
// Com a xícara: chance de ir sentar no pufe e de ficar parado tomando (o resto é passeio).
const CHANCE_PUFE_COM_CAFE = 0.4;
const CHANCE_BEBER_PARADO = 0.4;
// Em que parte do tempo na cafeteira a xícara aparece (buscar) ou fica na mesa (devolver).
const XICARA_NA_MAO = 0.5;
const XICARA_NA_MESA = 0.45;

const ehCafe = (e) => e.tipo === 'cafe';
const ehPufe = (e) => e.tipo === 'pufe';
// Onde o boneco está agora, se está usando um lugar (sentado no pufe, de pé no café).
const usando = (s, tipo) => s.estado === 'trabalhando' && s.estacao?.tipo === tipo;

/** Campos a mais no estado de cada boneco. */
export function criar(s) {
  Object.assign(s, {
    xicara: false,
    goles: 0,
    // Segundos até o próximo gole e quanto falta do gole atual (0 = sem gole).
    tGole: 0,
    bebendo: 0,
    // Segundos até querer café (ou pufe) de novo; começam curtos, para a cena ganhar vida logo.
    descansoCafe: rand(4, 24),
    descansoPufe: rand(8, 30),
    // 'buscar' ou 'devolver' enquanto está na mesa do café.
    missaoCafe: null,
    duracaoLugar: 1,
  });
}

/**
 * Parado, decide o que fazer. Devolve true quando decidiu; false deixa a escolha
 * para o comportamento padrão (mesas de trabalho, ações e passeios).
 * @param {object} s estado do boneco
 * @param {{ irPara: (s: object, aceita: (e: object) => boolean) => boolean,
 *   fazerAcao: (s: object, acao: string, duracao: number) => void, passear: (s: object) => void }} acoes
 */
export function decidir(s, acoes) {
  if (s.xicara) {
    // Vazia: devolve. Se os dois lugares do café estão ocupados, dá uma volta e tenta de novo.
    if (s.goles <= 0) {
      if (!acoes.irPara(s, ehCafe)) acoes.passear(s);
      return true;
    }
    const sorteio = Math.random();
    if (sorteio < CHANCE_PUFE_COM_CAFE && acoes.irPara(s, ehPufe)) return true;
    if (sorteio < CHANCE_PUFE_COM_CAFE + CHANCE_BEBER_PARADO) {
      acoes.fazerAcao(s, 'beber', rand(3.5, 6));
      return true;
    }
    acoes.passear(s);
    return true;
  }

  if (s.descansoCafe <= 0 && Math.random() < CHANCE_CAFE && acoes.irPara(s, ehCafe)) return true;
  if (s.descansoPufe <= 0 && Math.random() < CHANCE_PUFE && acoes.irPara(s, ehPufe)) return true;
  return false;
}

/** Chegou ao lugar: quanto tempo fica nele. */
export function aoSentar(s) {
  if (usando(s, 'cafe')) {
    s.missaoCafe = s.xicara ? 'devolver' : 'buscar';
    s.timer = s.missaoCafe === 'buscar' ? rand(3.4, 4.4) : rand(1.8, 2.4);
    s.duracaoLugar = s.timer;
  } else if (usando(s, 'pufe')) {
    // Com café, fica até tomar boa parte dele.
    s.timer = s.xicara ? rand(14, 22) : rand(9, 16);
  }
}

/** Saiu do lugar `estacao`. */
export function aoLevantar(s, estacao) {
  if (estacao.tipo === 'cafe') {
    if (s.missaoCafe === 'buscar') {
      // Se levantou antes de a xícara aparecer (não deveria), sai com ela do mesmo jeito.
      if (!s.xicara) pegarXicara(s);
      s.descansoCafe = rand(40, 80);
    } else if (s.missaoCafe === 'devolver') {
      s.xicara = false;
      s.goles = 0;
    }
    s.missaoCafe = null;
  } else if (estacao.tipo === 'pufe') {
    s.descansoPufe = rand(18, 35);
  }
}

function pegarXicara(s) {
  s.xicara = true;
  s.goles = sortearInteiro(...GOLES);
  s.tGole = rand(1.2, 2.4);
  s.bebendo = 0;
}

// Dá para dar um gole agora? Parado, numa ação calma ou sentado no pufe; andando ou acenando, não.
const podeBeber = (s) =>
  s.estado === 'parado' || usando(s, 'pufe') || (s.estado === 'acao' && s.acao !== 'acenar' && s.acao !== 'pular');

/** Fração (0 a 1) do tempo na mesa do café que já passou. */
export const progressoNoCafe = (s) => clamp(1 - s.timer / s.duracaoLugar, 0, 1);

/** A cada frame: os tempos de espera, a xícara aparecendo e sumindo na mesa e os goles. */
export function atualizar(s, dt) {
  s.descansoCafe -= dt;
  s.descansoPufe -= dt;

  if (usando(s, 'cafe')) {
    const progresso = progressoNoCafe(s);
    if (s.missaoCafe === 'buscar' && !s.xicara && progresso >= XICARA_NA_MAO) pegarXicara(s);
    if (s.missaoCafe === 'devolver' && s.xicara && progresso >= XICARA_NA_MESA) {
      s.xicara = false;
      s.goles = 0;
    }
  } else if (s.missaoCafe && s.estacao?.tipo !== 'cafe') {
    // O lugar do café sumiu com ele lá (a tela girou): esquece o que ia fazer.
    s.missaoCafe = null;
  }

  if (!s.xicara || s.goles <= 0) {
    s.bebendo = 0;
    return;
  }
  if (!podeBeber(s)) {
    // Interrompido no meio (começou a andar): baixa o braço, sem contar o gole.
    s.bebendo = 0;
    return;
  }
  if (s.bebendo > 0) {
    s.bebendo -= dt;
    if (s.bebendo <= 0) {
      s.bebendo = 0;
      s.goles -= 1;
      s.tGole = rand(...(s.estado === 'acao' ? ENTRE_GOLES_BEBENDO : ENTRE_GOLES));
    }
    return;
  }
  s.tGole -= dt;
  if (s.tGole <= 0) s.bebendo = DURACAO_GOLE;
}

// ── Poses ──

const ACENO = 2.55;
const aceno = (t) => ACENO + Math.sin(t * 11) * 0.35;

// Na mesa do café: mexe na cafeteira com as duas mãos, sai com a xícara; ou a deixa na mesa.
function poseNoCafe(pose, s, { t, selecionado, olharCamera }) {
  const progresso = progressoNoCafe(s);
  Object.assign(pose, { bracoEz: -0.15, bracoDz: 0.15, bracoEx: -0.1, bracoDx: -0.1, cabecaX: 0.28, cabecaY: 0 });

  if (s.missaoCafe === 'buscar') {
    if (progresso < XICARA_NA_MAO) {
      // As duas mãos na cafeteira: põe a xícara e aperta o botão.
      Object.assign(pose, { bracoEx: -1.3 + Math.sin(t * 6) * 0.08, bracoDx: -1.45, bracoEz: 0.2, bracoDz: -0.2 });
    } else if (progresso < 0.78) {
      // A xícara enchendo embaixo do bico.
      Object.assign(pose, { bracoDx: -1.4, bracoDz: -0.2 });
    }
    // No fim, a xícara já vem para perto do peito (segurarXicara).
  } else if (progresso < XICARA_NA_MESA) {
    // Devolvendo: estica o braço e deixa a xícara na mesa.
    Object.assign(pose, { bracoDx: -1.45, bracoDz: -0.2, bracoEx: -0.3 });
  }

  if (selecionado) Object.assign(pose, { bracoEx: 0, bracoEz: -aceno(t), cabecaX: -0.08, cabecaY: olharCamera });
}

// Sentado no pufe: braços soltos no colo, olhando em volta devagar; às vezes se espreguiça.
function posePufe(pose, s, { t, selecionado, olharCamera }) {
  Object.assign(pose, {
    bracoEx: -0.5,
    bracoDx: -0.5,
    bracoEz: 0.18,
    bracoDz: -0.18,
    cabecaX: -0.05,
    cabecaY: Math.sin(t * 0.4 + s.passo) * 0.5,
  });
  if (s.micro === 'esticar' && !s.xicara) {
    Object.assign(pose, { bracoEx: 0, bracoDx: 0, bracoEz: -2.75, bracoDz: 2.75, cabecaX: -0.25, cabecaY: 0 });
  } else if (s.micro === 'pensar' && !s.xicara) {
    Object.assign(pose, { bracoDx: -2.1, bracoDz: -0.55, cabecaY: 0.3 });
  } else if (s.micro === 'olharCamera') {
    pose.cabecaY = olharCamera;
  }
  if (selecionado) Object.assign(pose, { bracoDx: 0, bracoDz: aceno(t), cabecaX: -0.08, cabecaY: olharCamera });
}

// Com a xícara: o braço direito a segura na frente do peito e sobe até a boca nos goles.
// O aceno, que é do braço direito, passa para o esquerdo.
function segurarXicara(pose, s) {
  if (pose.bracoDz > 1.5) {
    pose.bracoEz = -pose.bracoDz;
    pose.bracoEx = 0;
  }
  if (s.bebendo > 0) {
    Object.assign(pose, { bracoDx: -2.25, bracoDz: -0.5, cabecaX: -0.18, cabecaY: 0 });
  } else {
    pose.bracoDx = -1.1;
    pose.bracoDz = -0.15;
  }
}

/**
 * Ajusta a pose que o comportamento padrão calculou.
 * @param {object} pose ângulos-alvo (useComportamento.js)
 * @param {object} s estado do boneco
 * @param {{ t: number, selecionado: boolean, olharCamera: number }} info
 */
export function pose(pose, s, info) {
  if (usando(s, 'cafe')) {
    poseNoCafe(pose, s, info);
    // Antes de a xícara aparecer (ou depois de ela ficar na mesa), as mãos são da cafeteira.
    const comXicaraNaMao = s.xicara && (s.missaoCafe !== 'buscar' || progressoNoCafe(s) >= 0.78);
    if (comXicaraNaMao && s.missaoCafe !== 'devolver') segurarXicara(pose, s);
    return;
  }
  if (usando(s, 'pufe')) posePufe(pose, s, info);
  if (s.xicara) segurarXicara(pose, s);
}
