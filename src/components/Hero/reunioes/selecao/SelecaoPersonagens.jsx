import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../../../utils/media.js';
import { EQUIPE, iniciais, matiz } from '../MembrosAvatares.jsx';
import { useRetratoReuniao } from '../RetratosReunioes.jsx';
import { adicionarMembro, chaveMembro } from '../reunioes.js';
import HologramaPersonagem, { precarregarHolograma } from '../holograma/HologramaPersonagem.jsx';
import { calcularFavo, empurrar } from './favo.js';
import styles from './SelecaoPersonagens.module.css';

// Pessoas das equipes (Suporte e Desenvolvimento), sem repetir, por nome.
const PESSOAS = [...new Map([...EQUIPE.values()].map((p) => [p.id, p])).values()].sort((a, b) =>
  a.name.localeCompare(b.name, 'pt-BR'),
);

const ESCALA_ESCOLHIDA = 1.42;
// Respiro entre o painel e a borda do cartão "Criar Reunião".
const INSET = 28;
const reduzido = () => matches(MEDIA.reducedMotion);

// O painel cobre o cartão do modal de trás (como no design), com respiro.
function retanguloDoPainel(ancora) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cartao = ancora?.getBoundingClientRect();
  if (!cartao || vw < 700) return { left: 12, top: 12, width: vw - 24, height: vh - 24 };
  return {
    left: cartao.left + INSET,
    top: cartao.top + INSET,
    width: cartao.width - INSET * 2,
    height: cartao.height - INSET * 2,
  };
}

// Uma badge do favo: o rosto do boneco, cinza até ser escolhido ou adicionado.
// Memo + callbacks estáveis (recebem o índice): trocar a escolhida só
// re-renderiza as badges que mudaram, não as 14.
const Badge = memo(function Badge({
  indice,
  pessoa,
  posicao,
  diametro,
  escolhida,
  adicionada,
  onEscolher,
  refBadge,
  tabIndex,
  onKeyDown,
}) {
  const url = useRetratoReuniao(pessoa.id);
  const [pronto, setPronto] = useState(false);
  const guardar = useCallback((el) => refBadge(indice, el), [refBadge, indice]);

  return (
    <button
      ref={guardar}
      type="button"
      className={styles.badge}
      style={{
        left: posicao.x - diametro / 2,
        top: posicao.y - diametro / 2,
        width: diametro,
        height: diametro,
      }}
      data-escolhida={escolhida || undefined}
      data-colorida={escolhida || adicionada || undefined}
      aria-pressed={escolhida}
      aria-label={`${pessoa.name}, ${pessoa.role}${adicionada ? ', já adicionado' : ''}`}
      tabIndex={tabIndex}
      onClick={() => onEscolher(indice)}
      onKeyDown={(event) => onKeyDown(event, indice)}
    >
      <span className={styles.rosto} style={{ '--matiz': matiz(pessoa.id) }} data-pronto={pronto || undefined}>
        <span className={styles.iniciais} aria-hidden="true">
          {iniciais(pessoa.name)}
        </span>
        {url && (
          <img src={url} alt="" draggable="false" decoding="async" onLoad={() => setPronto(true)} />
        )}
      </span>
      {adicionada && (
        <span className={styles.marca} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      )}
    </button>
  );
});

/**
 * Modal de seleção de personagens para a reunião (design "Adicionando membro").
 * Favo de badges à esquerda; à direita, o holograma do escolhido, nome, cargo
 * e o botão Adicionar. Clique fora, Esc ou o X fecham e voltam ao formulário.
 *
 * @param {object} props
 * @param {{ id: string, nome: string }[]} props.membros membros já na reunião
 * @param {(atualizar: (atuais: object[]) => object[]) => void} props.onChange
 * @param {() => void} props.onFechar
 * @param {{ current: HTMLElement | null }} props.ancora elemento dentro do cartão "Criar Reunião"
 */
export default function SelecaoPersonagens({ membros, onChange, onFechar, ancora }) {
  const dialogo = useRef(null);
  const painel = useRef(null);
  const favo = useRef(null);
  const fechar = useRef(null);
  const badges = useRef([]);
  const info = useRef(null);
  const botao = useRef(null);
  const fechando = useRef(false);
  const entrou = useRef(false);

  const adicionados = useMemo(() => new Set(membros.map((m) => chaveMembro(m.nome))), [membros]);
  const estaNaReuniao = useCallback((p) => adicionados.has(chaveMembro(p.name)), [adicionados]);

  // Começa no primeiro que ainda não está na reunião.
  const [escolhidaId, setEscolhidaId] = useState(
    () => (PESSOAS.find((p) => !estaNaReuniao(p)) ?? PESSOAS[0])?.id ?? null,
  );
  // Quem acabou de ser adicionado por aqui (o botão mostra "Adicionado").
  const [recemId, setRecemId] = useState(null);
  const [retangulo, setRetangulo] = useState(() => retanguloDoPainel(cartaoDe(ancora)));
  const [area, setArea] = useState({ largura: 0, altura: 0 });

  const escolhida = PESSOAS.find((p) => p.id === escolhidaId) ?? null;
  const indiceEscolhida = PESSOAS.findIndex((p) => p.id === escolhidaId);
  const jaNaReuniao = escolhida ? estaNaReuniao(escolhida) : false;
  const estadoBotao = !escolhida ? 'vazio' : recemId === escolhida.id ? 'adicionado' : jaNaReuniao ? 'ja' : 'livre';

  const layout = useMemo(
    () => calcularFavo(PESSOAS.length, area.largura, area.altura, { maximo: 112, folga: 1.25 }),
    [area.largura, area.altura],
  );

  // 3D pronto antes da primeira escolha.
  useEffect(() => {
    precarregarHolograma?.();
  }, []);

  // Abre como modal de verdade (top layer, Esc, foco preso).
  useLayoutEffect(() => {
    const el = dialogo.current;
    if (el && !el.open) el.showModal();
  }, []);

  // Acompanha o cartão de trás (redimensionar a janela).
  useEffect(() => {
    const atualizar = () => setRetangulo(retanguloDoPainel(cartaoDe(ancora)));
    window.addEventListener('resize', atualizar);
    return () => window.removeEventListener('resize', atualizar);
  }, [ancora]);

  // Tamanho da área do favo.
  useLayoutEffect(() => {
    const el = favo.current;
    if (!el) return undefined;
    // Mesmo tamanho = mesmo objeto: não recalcula o favo nem refaz os 14 tweens.
    const medir = () =>
      setArea((atual) =>
        atual.largura === el.clientWidth && atual.altura === el.clientHeight
          ? atual
          : { largura: el.clientWidth, altura: el.clientHeight },
      );
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // A página não rola por baixo (o Lenis ignora; aqui barra o scroll nativo).
  useEffect(() => {
    const el = dialogo.current;
    const barrar = (event) => event.preventDefault();
    el.addEventListener('wheel', barrar, { passive: false });
    el.addEventListener('touchmove', barrar, { passive: false });
    return () => {
      el.removeEventListener('wheel', barrar);
      el.removeEventListener('touchmove', barrar);
    };
  }, []);

  const { contextSafe } = useGSAP({ scope: dialogo });

  // Entrada: vidro aparece, painel sobe, badges brotam em onda, coluna da direita desliza.
  useGSAP(
    () => {
      if (!layout.diametro || entrou.current) return;
      entrou.current = true;
      // O showModal focou o primeiro botão que existia (Adicionar); com o favo
      // pronto, o foco vai para a badge escolhida.
      badges.current[Math.max(0, indiceEscolhida)]?.focus({ preventScroll: true });
      const lista = badges.current.filter(Boolean);
      if (reduzido()) return;
      const rostos = lista.map((b) => b.firstElementChild);
      // A transition de transform do CSS (hover) brigaria com o GSAP a cada tick.
      gsap.set(rostos, { transition: 'none' });
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(dialogo.current, { opacity: 0, duration: 0.35 }, 0)
        .from(painel.current, { opacity: 0, scale: 0.96, y: 18, duration: 0.6 }, 0)
        .from(
          rostos,
          {
            scale: 0,
            opacity: 0,
            duration: 0.7,
            ease: 'back.out(1.8)',
            stagger: { each: 0.035, from: 'start', grid: 'auto' },
            // Devolve o transform e a transition ao CSS (hover do rosto).
            clearProps: 'transform,opacity,transition',
          },
          0.12,
        )
        .from('[data-entra="direita"]', { opacity: 0, x: 28, duration: 0.7, stagger: 0.08 }, 0.2);
    },
    { scope: dialogo, dependencies: [layout.diametro] },
  );

  // Escolhida cresce; as outras abrem espaço, empurradas e espremidas.
  useGSAP(
    () => {
      if (!layout.diametro) return;
      const movimentos = empurrar(layout.posicoes, indiceEscolhida, layout.diametro, {
        escala: ESCALA_ESCOLHIDA,
        largura: area.largura,
        altura: area.altura,
      });
      movimentos.forEach((m, i) => {
        const badge = badges.current[i];
        if (!badge) return;
        const escolhidaAgora = i === indiceEscolhida;
        // z-index de uma vez (interpolado, reordenava as camadas a cada tick).
        gsap.set(badge, { zIndex: escolhidaAgora ? 3 : 1 });
        if (reduzido()) {
          gsap.set(badge, { x: m.x, y: m.y, scale: m.escala });
          return;
        }
        gsap.to(badge, {
          x: m.x,
          y: m.y,
          scale: m.escala,
          duration: escolhidaAgora ? 0.7 : 0.9,
          ease: escolhidaAgora ? 'back.out(1.7)' : 'elastic.out(1, 0.7)',
          delay: escolhidaAgora ? 0 : 0.03,
          overwrite: 'auto',
        });
      });
    },
    { scope: dialogo, dependencies: [indiceEscolhida, layout] },
  );

  // Nome e cargo trocam com um deslize suave.
  useGSAP(
    () => {
      if (!info.current || reduzido() || !entrou.current) return;
      // Só opacity e y (o blur animado repintava o texto a cada quadro).
      gsap.fromTo(
        info.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 },
      );
    },
    { scope: dialogo, dependencies: [escolhidaId] },
  );

  // X: nítido só com o mouse perto; longe, apagado.
  useEffect(() => {
    const x = fechar.current;
    if (!x || !matches(MEDIA.hover)) return undefined;
    gsap.set(x, { opacity: 0.22 });
    const config = { duration: 0.35, ease: 'power2.out' };
    const opacidade = gsap.quickTo(x, 'opacity', config);
    // "scale" é atalho de scaleX + scaleY: o quickTo dele recriava o tween e
    // avisava "scale not eligible for reset" a cada movimento do mouse.
    const escalaX = gsap.quickTo(x, 'scaleX', config);
    const escalaY = gsap.quickTo(x, 'scaleY', config);
    // O centro do X é medido uma vez (e de novo ao redimensionar), não a cada
    // movimento: ler o layout no meio dos tweens forçava recálculo.
    let centro = null;
    const esquecer = () => {
      centro = null;
    };
    // A entrada do painel ainda o desloca: mede de novo quando ela termina.
    const remedir = setTimeout(esquecer, 900);
    const onMove = (event) => {
      if (!centro) {
        const r = x.getBoundingClientRect();
        centro = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      const d = Math.hypot(event.clientX - centro.x, event.clientY - centro.y);
      // 1 encostado (≤ 36 px), some até 0,22 a partir de 220 px.
      const t = Math.min(1, Math.max(0, (d - 36) / (220 - 36)));
      const escala = 1.08 - t * 0.08;
      opacidade(1 - t * 0.78);
      escalaX(escala);
      escalaY(escala);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', esquecer);
    return () => {
      clearTimeout(remedir);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', esquecer);
      gsap.killTweensOf(x);
    };
  }, []);

  // Fecha animando e devolve o controle ao formulário.
  const sair = contextSafe(() => {
    if (fechando.current) return;
    fechando.current = true;
    const terminar = () => {
      dialogo.current?.close();
      onFechar();
    };
    if (reduzido()) {
      terminar();
      return;
    }
    gsap
      .timeline({ defaults: { ease: 'power2.in' }, onComplete: terminar })
      .to(painel.current, { opacity: 0, scale: 0.97, y: 10, duration: 0.28 }, 0)
      .to(dialogo.current, { opacity: 0, duration: 0.3 }, 0.05);
  });

  // Trocar de personagem encerra o "Adicionado": voltar a quem já está na
  // reunião mostra "Já adicionado".
  const escolher = (pessoa) => {
    if (pessoa.id === escolhidaId) return;
    setRecemId(null);
    setEscolhidaId(pessoa.id);
  };

  // Adiciona o escolhido; o botão vira "Adicionado" escurecendo.
  const adicionar = contextSafe(() => {
    if (!escolhida || estadoBotao !== 'livre') return;
    onChange((atuais) => {
      const resultado = adicionarMembro(atuais, escolhida.name);
      return resultado.ok ? resultado.membros : atuais;
    });
    setRecemId(escolhida.id);
    if (reduzido() || !botao.current) return;
    // Sem a transition de transform do CSS durante o tween (ela atrasava cada tick).
    gsap.set(botao.current, { transition: 'none' });
    gsap
      .timeline()
      .to(botao.current, { scale: 0.96, duration: 0.12, ease: 'power2.out' })
      .to(botao.current, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'transform,transition' });
    // A badge comemora: um pulinho de cor.
    const badge = badges.current[indiceEscolhida]?.firstElementChild;
    if (badge) {
      gsap.set(badge, { transition: 'none' });
      gsap.fromTo(
        badge,
        { scale: 1 },
        { scale: 1.1, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform,transition' },
      );
    }
  });

  // Setas andam pelo favo (ordem de leitura); Enter/Espaço escolhem (clique).
  const onKeyBadge = (event, i) => {
    const passos = { ArrowRight: 1, ArrowDown: layout.colunas, ArrowLeft: -1, ArrowUp: -layout.colunas };
    if (!(event.key in passos)) return;
    event.preventDefault();
    const proximo = (i + passos[event.key] + PESSOAS.length) % PESSOAS.length;
    badges.current[proximo]?.focus();
    escolher(PESSOAS[proximo]);
  };

  // Versões estáveis para as badges (memo): sempre chamam a função mais recente.
  const atuais = useRef(null);
  atuais.current = { escolher, onKeyBadge };
  const escolherIndice = useCallback((i) => atuais.current.escolher(PESSOAS[i]), []);
  const teclaBadge = useCallback((event, i) => atuais.current.onKeyBadge(event, i), []);
  const guardarBadge = useCallback((i, el) => {
    badges.current[i] = el;
  }, []);

  const rotuloBotao = {
    vazio: 'Escolha um personagem',
    livre: 'Adicionar',
    adicionado: 'Adicionado',
    ja: 'Já adicionado',
  }[estadoBotao];

  return createPortal(
    <dialog
      ref={dialogo}
      className={styles.fundo}
      aria-labelledby="selecao-titulo"
      // Eventos de portal sobem pela árvore do React até o modal de Reuniões:
      // barrar aqui evita que o Esc, o clique ou o "close" daqui fechem aquele.
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        sair();
      }}
      onClose={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) sair();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={painel}
        className={styles.painel}
        style={{ left: retangulo.left, top: retangulo.top, width: retangulo.width, height: retangulo.height }}
      >
        <h2 id="selecao-titulo" className="sr-only">
          Escolher membros da reunião
        </h2>

        <div ref={favo} className={styles.favo} role="group" aria-label="Personagens">
          {layout.diametro > 0 &&
            PESSOAS.map((pessoa, i) => (
              <Badge
                key={pessoa.id}
                indice={i}
                pessoa={pessoa}
                posicao={layout.posicoes[i]}
                diametro={layout.diametro}
                escolhida={pessoa.id === escolhidaId}
                adicionada={estaNaReuniao(pessoa)}
                refBadge={guardarBadge}
                tabIndex={pessoa.id === escolhidaId || (indiceEscolhida < 0 && i === 0) ? 0 : -1}
                onEscolher={escolherIndice}
                onKeyDown={teclaBadge}
              />
            ))}
        </div>

        <div className={styles.detalhe}>
          <div className={styles.palco} data-entra="direita">
            <HologramaPersonagem
              pessoaId={escolhida?.id ?? null}
              rotulo={escolhida ? `Boneco de ${escolhida.name}` : undefined}
            />
          </div>

          <div ref={info} className={styles.info} data-entra="direita" aria-live="polite">
            <p className={styles.nome}>{escolhida?.name ?? 'Escolha um personagem'}</p>
            <p className={styles.cargo}>{escolhida?.role ?? ' '}</p>
          </div>

          <div data-entra="direita">
            <button
              ref={botao}
              type="button"
              className={styles.adicionar}
              data-estado={estadoBotao}
              aria-disabled={estadoBotao !== 'livre' || undefined}
              onClick={adicionar}
            >
              <span key={estadoBotao} className={styles.adicionarTexto}>
                {(estadoBotao === 'adicionado' || estadoBotao === 'ja') && (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
                {rotuloBotao}
              </span>
            </button>
          </div>
        </div>

        <button ref={fechar} type="button" className={styles.fechar} aria-label="Fechar" onClick={sair}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

// O cartão do modal "Criar Reunião" que contém a âncora.
function cartaoDe(ancora) {
  return ancora?.current?.closest('article') ?? null;
}
