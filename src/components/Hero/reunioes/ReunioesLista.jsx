import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../../utils/media.js';
import { contarPorFiltro, filtrarReunioes, paginar } from './periodos.js';
import FiltrosPeriodo from './FiltrosPeriodo.jsx';
import Paginacao from './Paginacao.jsx';
import ReuniaoCard from './ReuniaoCard.jsx';
import styles from './ReunioesLista.module.css';

const VAZIO = {
  todas: 'Nenhuma Reunião no histórico',
  'em-breve': 'Nenhuma reunião em breve',
  hoje: 'Nenhuma reunião hoje',
  encerradas: 'Nenhuma reunião encerrada',
};

// Deslocamento de saída/entrada conforme a origem da troca.
const SAIDA = { seguinte: { x: -28 }, anterior: { x: 28 }, filtro: { y: -10 } };
const ENTRADA = { seguinte: { x: 36 }, anterior: { x: -36 }, filtro: { y: 18 } };

/*
 * Quantos cards cabem na área da lista sem rolagem. A altura do card é a
 * maior já vista nesta largura (os cards têm altura fixa por layout); assim
 * o número não oscila entre páginas.
 */
function medirPorPagina(caixa, maiorCard) {
  const estilo = getComputedStyle(caixa);
  const util = caixa.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  const lista = caixa.querySelector('ul');
  const vao = lista ? parseFloat(getComputedStyle(lista).rowGap) || 0 : 0;
  if (!maiorCard || util <= 0) return null;
  return Math.max(1, Math.floor((util + vao) / (maiorCard + vao)));
}

/*
 * Histórico: barra fixa (filtros + paginação) e os cards rolando por dentro.
 * Filtro e página vivem no modal; aqui só se anima a troca: os cards atuais
 * saem, o estado muda e os novos entram em sequência.
 */
export default function ReunioesLista({
  reunioes,
  agora,
  filtro,
  pagina,
  porPagina,
  destaqueId,
  onFiltro,
  onPagina,
  onAjustarPagina,
  onPorPagina,
  onRemover,
}) {
  const raiz = useRef(null);
  const rolagem = useRef(null);
  const saida = useRef(null);
  const direcao = useRef('filtro');
  const primeira = useRef(true);
  const historicoId = useId();
  // A pílula responde ao clique na hora, antes de os cards trocarem.
  const [pressionado, setPressionado] = useState(filtro);

  useEffect(() => setPressionado(filtro), [filtro]);

  const lista = useMemo(() => filtrarReunioes(reunioes, filtro, agora), [reunioes, filtro, agora]);
  const pag = useMemo(() => paginar(lista, pagina, porPagina), [lista, pagina, porPagina]);
  const contagens = useMemo(() => contarPorFiltro(reunioes, agora), [reunioes, agora]);
  const chave = `${filtro}:${pag.pagina}`;

  // Mede de novo quando a área muda de tamanho ou entram cards novos.
  const maiorCard = useRef({ largura: 0, altura: 0 });
  useEffect(() => {
    const caixa = rolagem.current;
    if (!caixa) return undefined;

    const medir = () => {
      const largura = caixa.clientWidth;
      // Outra largura, outro layout de card: esquece a medida antiga.
      if (largura !== maiorCard.current.largura) maiorCard.current = { largura, altura: 0 };
      caixa.querySelectorAll('[data-card] > *').forEach((card) => {
        maiorCard.current.altura = Math.max(maiorCard.current.altura, card.offsetHeight);
      });
      const n = medirPorPagina(caixa, maiorCard.current.altura);
      if (n && n !== porPagina) onPorPagina(n);
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [chave, porPagina, onPorPagina]);

  // Página fora do intervalo (ex.: removeu o último card dela): volta uma.
  useEffect(() => {
    if (pag.pagina !== pagina) onAjustarPagina(pag.pagina);
  }, [pag.pagina, pagina, onAjustarPagina]);

  // Entrada dos cards a cada filtro/página (e na abertura).
  useGSAP(
    () => {
      const caixa = rolagem.current;
      const novo = destaqueId && caixa.querySelector(`[data-id="${CSS.escape(destaqueId)}"]`);
      if (novo) {
        caixa.scrollTop = Math.max(0, novo.offsetTop - caixa.clientHeight / 2 + novo.offsetHeight / 2);
      } else {
        caixa.scrollTop = 0;
      }

      const eraPrimeira = primeira.current;
      primeira.current = false;
      if (matches(MEDIA.reducedMotion)) return;

      gsap.fromTo(
        caixa.querySelectorAll('[data-card]'),
        { opacity: 0, ...ENTRADA[direcao.current] },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.06,
          delay: eraPrimeira ? 0.18 : 0,
          clearProps: 'opacity,transform',
        },
      );
    },
    { scope: raiz, dependencies: [chave] },
  );

  const { contextSafe } = useGSAP({ scope: raiz });

  // Anima a saída dos cards atuais e só então aplica a troca.
  const trocar = contextSafe((acao, dir) => {
    const aplicar = () => {
      direcao.current = dir;
      flushSync(acao);
    };

    // Troca no meio de outra saída: conclui a anterior e aplica já.
    if (saida.current) {
      const pendente = saida.current;
      saida.current = null;
      pendente.progress(1);
      aplicar();
      return;
    }

    const cards = rolagem.current?.querySelectorAll('[data-card]') ?? [];
    if (!cards.length || matches(MEDIA.reducedMotion)) {
      aplicar();
      return;
    }

    saida.current = gsap.to(cards, {
      opacity: 0,
      ...SAIDA[dir],
      duration: 0.2,
      ease: 'power2.in',
      stagger: 0.025,
      overwrite: true,
      onComplete: () => {
        saida.current = null;
        aplicar();
        // Se nada mudou, os cards não podem ficar invisíveis.
        const restantes = [...cards].filter((card) => card.isConnected);
        if (restantes.length) gsap.set(restantes, { clearProps: 'opacity,transform' });
      },
    });
  });

  const escolherFiltro = (id) => {
    setPressionado(id);
    trocar(() => onFiltro(id), 'filtro');
  };

  const mudarPagina = (delta) => {
    trocar(() => onPagina(delta), delta > 0 ? 'seguinte' : 'anterior');
  };

  // O que o gesto de rolar precisa ler sem recriar os ouvintes.
  const gesto = useRef({});
  gesto.current.pagina = pag.pagina;
  gesto.current.totalPaginas = pag.totalPaginas;
  gesto.current.mudarPagina = mudarPagina;

  /*
   * Rolar (roda do mouse, touchpad ou dedo) troca de página. Um gesto troca
   * uma página só: depois de trocar, espera o gesto parar (inércia do
   * touchpad incluída) antes de aceitar outro. Se a lista estiver rolando por
   * dentro (reserva de telas muito baixas), só troca ao chegar na ponta.
   */
  useEffect(() => {
    const area = raiz.current;
    const caixa = rolagem.current;
    if (!area || !caixa) return undefined;

    const LIMIAR_RODA = 40; // px acumulados para valer como intenção
    const LIMIAR_DEDO = 50; // px de arrasto vertical
    const PAUSA = 220; // ms sem eventos = fim do gesto
    const MINIMO = 650; // ms entre trocas (duração da animação)
    let acumulado = 0;
    let travadoAte = 0;
    let fimDoGesto = null;
    // Depois de uma troca, só libera quando o gesto atual parar.
    let esperandoFim = false;
    let dedo = null;

    const naPonta = (direcao) => {
      const sobra = caixa.scrollHeight - caixa.clientHeight;
      if (sobra <= 1 || getComputedStyle(caixa).overflowY === 'visible') return true;
      return direcao > 0 ? caixa.scrollTop >= sobra - 1 : caixa.scrollTop <= 0;
    };

    // Troca se houver página nessa direção; devolve se trocou.
    const virar = (direcao) => {
      const { pagina, totalPaginas, mudarPagina: mudar } = gesto.current;
      if (direcao > 0 ? pagina >= totalPaginas : pagina <= 1) return false;
      mudar(direcao);
      return true;
    };

    const travar = () => {
      travadoAte = performance.now() + MINIMO;
      acumulado = 0;
      esperandoFim = true;
    };

    const onWheel = (event) => {
      // Ctrl + roda é zoom do navegador; rolagem lateral não conta.
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const direcao = Math.sign(delta);
      if (!direcao || !naPonta(direcao)) return;
      event.preventDefault();

      // Enquanto o gesto continua (ou a animação roda), nada de nova troca.
      clearTimeout(fimDoGesto);
      fimDoGesto = setTimeout(() => {
        esperandoFim = false;
        acumulado = 0;
      }, PAUSA);
      if (esperandoFim || performance.now() < travadoAte) return;

      if (Math.sign(acumulado) !== direcao) acumulado = 0;
      acumulado += delta;
      if (Math.abs(acumulado) < LIMIAR_RODA) return;

      if (virar(direcao)) travar();
      else acumulado = 0;
    };

    const onTouchStart = (event) => {
      const toque = event.touches[0];
      dedo = event.touches.length === 1 ? { x: toque.clientX, y: toque.clientY } : null;
    };

    const onTouchEnd = (event) => {
      if (!dedo) return;
      const toque = event.changedTouches[0];
      const dy = dedo.y - toque.clientY;
      const dx = dedo.x - toque.clientX;
      dedo = null;
      // Só arrasto vertical; a barra de filtros rola na horizontal.
      if (Math.abs(dy) < LIMIAR_DEDO || Math.abs(dx) > Math.abs(dy)) return;
      const direcao = Math.sign(dy);
      if (!naPonta(direcao) || performance.now() < travadoAte) return;
      if (virar(direcao)) travar();
    };

    area.addEventListener('wheel', onWheel, { passive: false });
    area.addEventListener('touchstart', onTouchStart, { passive: true });
    area.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      clearTimeout(fimDoGesto);
      area.removeEventListener('wheel', onWheel);
      area.removeEventListener('touchstart', onTouchStart);
      area.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div ref={raiz} className={styles.raiz}>
      <div className={styles.barra}>
        <h4 id={historicoId} className={styles.historico}>
          Histórico
        </h4>
        <span className={styles.traco} aria-hidden="true" />
        <div className={styles.filtros}>
          <FiltrosPeriodo ativo={pressionado} contagens={contagens} onEscolher={escolherFiltro} />
        </div>
        <div className={styles.paginacao}>
          <Paginacao
            inicio={pag.inicio}
            fim={pag.fim}
            total={pag.total}
            pagina={pag.pagina}
            totalPaginas={pag.totalPaginas}
            onMudar={mudarPagina}
          />
        </div>
      </div>

      <div
        ref={rolagem}
        className={porPagina > 1 ? `${styles.rolagem} ${styles.semRolagem}` : styles.rolagem}
        data-modal-scroll
        tabIndex={0}
        aria-labelledby={historicoId}
      >
        {pag.itens.length === 0 ? (
          <p key={chave} className={styles.vazio} data-card>
            {reunioes.length === 0 ? VAZIO.todas : VAZIO[filtro] ?? VAZIO.todas}
          </p>
        ) : (
          <ul key={chave} className={styles.lista}>
            {pag.itens.map((reuniao) => (
              <li key={reuniao.id} className={styles.item} data-card data-id={reuniao.id}>
                <ReuniaoCard
                  reuniao={reuniao}
                  agora={agora}
                  destaque={reuniao.id === destaqueId}
                  onRemover={onRemover}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
