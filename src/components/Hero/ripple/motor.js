import gsap from 'gsap';
import { criarFundo } from './fundo.js';
import {
  assinatura,
  centroDaGota,
  dentroDoPainel,
  escalaDoDispositivo,
  escalaQueCabe,
  passosFixos,
  raioDaGota,
  razaoDoPainel,
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
const PADRAO = { resolucao: null, raio: 20, perturbacao: 0.01, gotasOciosas: true };
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

// Painéis largos (desktop) pedem mais resolução, como no site de referência.
const resolucaoPara = (painel) => (Math.max(painel.clientWidth, painel.clientHeight) >= 1024 ? 512 : 256);

export function criarMotor({ painel, camada, opcoes }) {
  const config = { ...PADRAO, ...semIndefinidos(opcoes) };
  const resolucao = config.resolucao ?? resolucaoPara(painel);
  const canvas = document.createElement('canvas');
  camada.append(canvas);

  let sim = criarSimulacao(canvas, { resolucao });
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
    razao: [1, 1],
    acumulado: 0,
    assinatura: null,
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

  function dimensionar(largura, altura, escala) {
    if (largura === estado.largura && altura === estado.altura && escala === estado.escala) return;
    Object.assign(estado, { largura, altura, escala, razao: razaoDoPainel(largura, altura) });
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
  }

  // Redesenha e reenvia o fundo só se algum elemento marcado mudou.
  function atualizarFundo(base) {
    const medidas = fundo.medir(base);
    const atual = assinatura(medidas, estado.largura, estado.altura, estado.escala);
    if (atual === estado.assinatura && !fundo.sujo) return;
    fundo.desenhar(medidas, estado.largura, estado.altura, estado.escala);
    sim.enviarFundo(fundo.canvas);
    estado.assinatura = atual;
  }

  function aplicarGotas(base) {
    for (const gota of fila) {
      // Gotas do ponteiro chegam em coordenadas da janela; as ociosas, do painel.
      const x = gota.cliente ? gota.x - base.left : gota.x;
      const y = gota.cliente ? gota.y - base.top : gota.y;
      if (!dentroDoPainel(x, y, estado.largura, estado.altura)) continue;
      sim.gota(
        centroDaGota(x, y, estado.largura, estado.altura),
        raioDaGota(gota.raio, estado.largura, estado.altura),
        gota.forca,
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
      sim.desenhar({ razao: estado.razao, perturbacao: config.perturbacao, intensidade: estado.intensidade });
    } catch {
      // Fundo que não sobe (canvas "sujo", erro do WebGL) ou svg que não
      // rasterizou: desliga a água e fica o DOM puro.
      desativar();
      sim?.destruir();
      sim = null;
    }
  }

  const aoMover = (e) => {
    estado.ultimoPonteiro = performance.now();
    enfileirar({ cliente: true, x: e.clientX, y: e.clientY, raio: config.raio, forca: PONTEIRO.forca });
  };
  const aoPressionar = (e) => {
    estado.ultimoPonteiro = performance.now();
    enfileirar({ cliente: true, x: e.clientX, y: e.clientY, raio: config.raio * CLIQUE.raio, forca: CLIQUE.forca });
  };
  const aoPerderContexto = (e) => {
    e.preventDefault(); // permite o "webglcontextrestored"
    desativar();
    sim = null;
  };
  const aoRestaurarContexto = () => {
    sim = criarSimulacao(canvas, { resolucao });
    if (!sim) return;
    Object.assign(estado, { fase: 'esperando', assinatura: null, acumulado: 0, largura: 0 });
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
