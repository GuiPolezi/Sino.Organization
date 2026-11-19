import gsap from 'gsap';
import { criarFundo } from './fundo.js';
import {
  centroDaGota,
  dentroDoPainel,
  escalaDoDispositivo,
  escalaQueCabe,
  faixaVisivel,
  passosFixos,
  proporcao,
  raioDaGota,
  resolucaoDaAgua,
  texelDaAgua,
} from './geometria.js';
import { criarSimulacao } from './simulacao.js';

/*
 * Liga a simulação ao painel: loop no gsap.ticker, gotas do ponteiro e gotas
 * "ociosas", e o ciclo de vida da camada:
 *
 *   esperando → (fontes e svgs prontos, 1º fundo enviado) → entrando (fade
 *   GSAP da camada, idêntica ao DOM por baixo) → ativo (esconde os originais
 *   marcados e liga a água aos poucos) → perdido (contexto WebGL caiu: os
 *   originais voltam na hora; se o contexto voltar, recomeça em "esperando").
 */

// Valores do site de referência: $('#ripple').ripples({ resolution: 512, dropRadius: 20, perturbance: 0.01 }).
const PADRAO = { raio: 20, perturbacao: 0.01, gotasOciosas: true };
// A perturbação do plugin é fração da largura; aqui vira px (no celular, como num painel de 1024).
const LARGURA_DA_PERTURBACAO = 1024;
// Resolução inicial, antes de conhecer o limite da GPU (corrigida no 1º quadro).
const LIMITE_INICIAL = 2048;
// Elementos (e o que há dentro deles) onde o ponteiro não faz ondas, como o computador de Sistemas.
const SEM_AGUA = '[data-ripple-bloqueio]';
const semAgua = (alvo) => alvo instanceof Element && alvo.closest(SEM_AGUA) !== null;

// Força das gotas do plugin: rastro do ponteiro e clique (raio 1,5×).
const PONTEIRO = { forca: 0.01 };
const CLIQUE = { raio: 1.5, forca: 0.14 };
// Gotas automáticas quando ninguém mexe o ponteiro (o site de referência não tem).
const OCIOSA = { intervalo: [1.4, 3.2], silencioMs: 2500, raio: [1, 1.8], forca: [0.02, 0.045], margem: 0.08 };
const PASSO_MS = 1000 / 60;
const MAX_PASSOS = 3;
const MAX_GOTAS = 32;
const ENTRADA = { duration: 0.7, ease: 'power1.out' };
const INTENSIDADE = { duration: 1.4, ease: 'power2.out' };

const semIndefinidos = (obj) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => v !== undefined));

const resolucaoInicial = (painel) =>
  resolucaoDaAgua(painel.clientWidth, painel.clientHeight, texelDaAgua(painel.clientWidth), LIMITE_INICIAL);

export function criarMotor({ painel, camada, opcoes }) {
  const config = { ...PADRAO, ...semIndefinidos(opcoes) };
  const canvas = document.createElement('canvas');
  camada.append(canvas);

  let sim = criarSimulacao(canvas, { resolucao: resolucaoInicial(painel) });
  if (!sim) {
    canvas.remove();
    return null;
  }

  // Isola o empilhamento do painel: a camada (z-index -1) fica acima do fundo
  // dele e abaixo de todo o conteúdo.
  painel.setAttribute('data-ripple-painel', '');
  const fundo = criarFundo(painel);
  const estado = {
    fase: 'esperando',
    intensidade: 0,
    fontes: !document.fonts,
    visivel: true,
    largura: 0,
    altura: 0,
    escala: 1,
    acumulado: 0,
    ultimoPonteiro: -Infinity,
  };
  const fila = [];
  let ociosa = null;

  const enfileirar = (gota) => {
    if (fila.length >= MAX_GOTAS) fila.shift();
    fila.push(gota);
  };

  function agendarOciosa() {
    if (!config.gotasOciosas) return;
    ociosa = gsap.delayedCall(gsap.utils.random(...OCIOSA.intervalo), () => {
      const calmo = performance.now() - estado.ultimoPonteiro > OCIOSA.silencioMs;
      if (estado.fase === 'ativo' && calmo) {
        const [min, max] = [OCIOSA.margem, 1 - OCIOSA.margem];
        enfileirar({
          x: gsap.utils.random(min, max) * estado.largura,
          y: gsap.utils.random(min, max) * estado.altura,
          raio: config.raio * gsap.utils.random(...OCIOSA.raio),
          forca: gsap.utils.random(...OCIOSA.forca),
        });
      }
      agendarOciosa();
    });
  }

  function ativar() {
    painel.setAttribute('data-ripple-ativo', '');
    estado.fase = 'ativo';
    gsap.to(estado, { intensidade: 1, ...INTENSIDADE });
    agendarOciosa();
  }

  function entrar() {
    estado.fase = 'entrando';
    gsap.to(camada, { autoAlpha: 1, ...ENTRADA, onComplete: ativar });
  }

  // Volta ao DOM puro imediatamente (sem esperar fade): nada pode sumir.
  function desativar() {
    painel.removeAttribute('data-ripple-ativo');
    ociosa?.kill();
    ociosa = null;
    gsap.killTweensOf([camada, estado]);
    gsap.set(camada, { autoAlpha: 0 });
    estado.intensidade = 0;
    estado.fase = 'perdido';
    fila.length = 0;
  }

  // Painel mudou de tamanho: canvas e simulação acompanham (texels quadrados).
  function dimensionar(largura, altura, escala) {
    if (largura === estado.largura && altura === estado.altura && escala === estado.escala) return;
    Object.assign(estado, { largura, altura, escala });
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    sim.redimensionar(resolucaoDaAgua(largura, altura, texelDaAgua(largura), sim.maximo));
  }

  // Redesenha e reenvia só o que mudou no fundo (tudo, uma região ou nada).
  function atualizarFundo(base) {
    const medidas = fundo.medir(base);
    const mudanca = fundo.atualizar(medidas, estado.largura, estado.altura, estado.escala);
    if (mudanca === 'tudo') sim.enviarFundo(fundo.canvas);
    else if (mudanca) sim.enviarRegiao(fundo.pedacoDe(mudanca), mudanca.x, mudanca.y, fundo.canvas.height);
  }

  // Desvio da refração em px, convertido para uv em cada eixo.
  function perturbacaoEmUv() {
    const px = config.perturbacao * Math.max(estado.largura, LARGURA_DA_PERTURBACAO);
    return [px / Math.max(estado.largura, 1), px / Math.max(estado.altura, 1)];
  }

  // Faixa visível (com margem) em px do canvas; null com o painel fora da tela.
  function faixaNoCanvas(base) {
    const faixa = faixaVisivel(base.top, estado.altura, window.innerHeight);
    if (!faixa) return null;
    return {
      inicio: Math.max(0, Math.floor(faixa.inicio * estado.escala)),
      fim: Math.min(canvas.height, Math.ceil(faixa.fim * estado.escala)),
    };
  }

  function aplicarGotas(base) {
    for (const gota of fila) {
      // Gotas do ponteiro chegam em coordenadas da janela; as ociosas, do painel.
      const x = gota.cliente ? gota.x - base.left : gota.x;
      const y = gota.cliente ? gota.y - base.top : gota.y;
      if (!dentroDoPainel(x, y, estado.largura, estado.altura)) continue;
      sim.gota(
        centroDaGota(x, y, estado.largura, estado.altura),
        raioDaGota(gota.raio, estado.altura),
        gota.forca,
        proporcao(estado.largura, estado.altura),
      );
    }
    fila.length = 0;
  }

  function simular(delta) {
    const { passos, resto } = passosFixos(estado.acumulado + delta, PASSO_MS, MAX_PASSOS);
    estado.acumulado = resto;
    for (let i = 0; i < passos; i++) sim.avancar();
  }

  function quadro(_tempo, delta) {
    if (!sim || estado.fase === 'perdido' || !estado.fontes || !estado.visivel || document.hidden) {
      fila.length = 0;
      return;
    }
    const base = painel.getBoundingClientRect();
    if (base.width < 1 || base.height < 1) return;
    try {
      const escala = escalaQueCabe(base.width, base.height, escalaDoDispositivo(window.devicePixelRatio), sim.maximo);
      dimensionar(base.width, base.height, escala);
      atualizarFundo(base);
      if (fundo.falhou) throw new Error('Um <svg> marcado não rasterizou');
      if (estado.fase === 'esperando' && fundo.pronto && !fundo.sujo) entrar();
      if (estado.fase === 'ativo') {
        aplicarGotas(base);
        simular(delta);
      } else {
        fila.length = 0;
      }
      const faixa = faixaNoCanvas(base);
      if (faixa) sim.desenhar({ perturbacao: perturbacaoEmUv(), intensidade: estado.intensidade, faixa });
    } catch {
      // Fundo que não sobe (canvas "sujo", erro do WebGL) ou svg que não
      // rasterizou: desliga a água e fica o DOM puro.
      desativar();
      sim?.destruir();
      sim = null;
    }
  }

  // O ponteiro conta como atividade (sem gotas ociosas) mesmo sobre áreas sem água.
  const aoMover = (e) => {
    estado.ultimoPonteiro = performance.now();
    if (semAgua(e.target)) return;
    enfileirar({ cliente: true, x: e.clientX, y: e.clientY, raio: config.raio, forca: PONTEIRO.forca });
  };
  const aoPressionar = (e) => {
    estado.ultimoPonteiro = performance.now();
    if (semAgua(e.target)) return;
    enfileirar({ cliente: true, x: e.clientX, y: e.clientY, raio: config.raio * CLIQUE.raio, forca: CLIQUE.forca });
  };
  const aoPerderContexto = (e) => {
    e.preventDefault(); // permite o "webglcontextrestored"
    desativar();
    sim = null;
  };
  const aoRestaurarContexto = () => {
    sim = criarSimulacao(canvas, { resolucao: resolucaoInicial(painel) });
    if (!sim) return;
    fundo.invalidar();
    Object.assign(estado, { fase: 'esperando', acumulado: 0, largura: 0 });
  };
  const aoCarregarFontes = () => fundo.invalidar();
  const observador = new IntersectionObserver(([entrada]) => {
    estado.visivel = entrada.isIntersecting;
  });

  const opcoesEvento = { passive: true };
  painel.addEventListener('pointermove', aoMover, opcoesEvento);
  painel.addEventListener('pointerdown', aoPressionar, opcoesEvento);
  canvas.addEventListener('webglcontextlost', aoPerderContexto);
  canvas.addEventListener('webglcontextrestored', aoRestaurarContexto);
  document.fonts?.addEventListener('loadingdone', aoCarregarFontes);
  document.fonts?.ready.then(() => {
    estado.fontes = true;
    fundo.invalidar();
  });
  observador.observe(painel);
  gsap.ticker.add(quadro);

  return {
    destruir() {
      gsap.ticker.remove(quadro);
      desativar();
      painel.removeEventListener('pointermove', aoMover, opcoesEvento);
      painel.removeEventListener('pointerdown', aoPressionar, opcoesEvento);
      canvas.removeEventListener('webglcontextlost', aoPerderContexto);
      canvas.removeEventListener('webglcontextrestored', aoRestaurarContexto);
      document.fonts?.removeEventListener('loadingdone', aoCarregarFontes);
      observador.disconnect();
      painel.removeAttribute('data-ripple-painel');
      gsap.set(camada, { clearProps: 'opacity,visibility' });
      fundo.destruir();
      sim?.destruir();
      sim = null;
      canvas.remove();
    },
  };
}
