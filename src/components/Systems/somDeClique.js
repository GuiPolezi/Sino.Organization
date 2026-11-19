/*
 * "Tic" de clique no estilo do Windows antigo, sintetizado com Web Audio
 * (nenhum arquivo de som para baixar). São dois estalos curtos — o aperto e,
 * logo depois, a soltura mais fraca — de ruído filtrado com um tom agudo por
 * cima, como o clique de navegação do Windows XP.
 *
 * O AudioContext só nasce no primeiro clique (gesto do usuário), para o
 * navegador não bloquear o áudio.
 */

const VOLUME = 0.32;
const DURACAO = 0.06; // s
// [início (s), força] de cada estalo.
const ESTALOS = [
  [0, 1],
  [0.022, 0.45],
];
const TOM_HZ = 1850;
const FILTRO = { frequencia: 2600, q: 0.8, corteGrave: 350 };

let contexto = null;
let amostra = null;

function criarAmostra(ctx) {
  const taxa = ctx.sampleRate;
  const total = Math.floor(taxa * DURACAO);
  const buffer = ctx.createBuffer(1, total, taxa);
  const dados = buffer.getChannelData(0);

  for (let i = 0; i < total; i++) {
    const t = i / taxa;
    dados[i] = ESTALOS.reduce((soma, [inicio, forca]) => {
      const dt = t - inicio;
      if (dt < 0) return soma;
      const ruido = (Math.random() * 2 - 1) * Math.exp(-dt * 190) * 0.65;
      const tom = Math.sin(2 * Math.PI * TOM_HZ * dt) * Math.exp(-dt * 280) * 0.45;
      return soma + (ruido + tom) * forca;
    }, 0);
  }
  return buffer;
}

function preparar() {
  if (contexto) return contexto;
  const Contexto = window.AudioContext ?? window.webkitAudioContext;
  if (!Contexto) return null;
  contexto = new Contexto();
  amostra = criarAmostra(contexto);
  return contexto;
}

export function tocarClique() {
  try {
    const ctx = preparar();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const fonte = ctx.createBufferSource();
    fonte.buffer = amostra;

    const banda = ctx.createBiquadFilter();
    banda.type = 'bandpass';
    banda.frequency.value = FILTRO.frequencia;
    banda.Q.value = FILTRO.q;

    const grave = ctx.createBiquadFilter();
    grave.type = 'highpass';
    grave.frequency.value = FILTRO.corteGrave;

    const ganho = ctx.createGain();
    ganho.gain.value = VOLUME;

    fonte.connect(banda).connect(grave).connect(ganho).connect(ctx.destination);
    fonte.start();
  } catch {
    // Sem áudio (navegador antigo ou bloqueado): o clique segue funcionando, só sem som.
  }
}
