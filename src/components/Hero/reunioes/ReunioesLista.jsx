import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../../utils/media.js';
import { POR_PAGINA, contarPorFiltro, filtrarReunioes, paginar } from './periodos.js';
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
 * Histórico: barra fixa (filtros + paginação) e os cards rolando por dentro.
 * Filtro e página vivem no modal; aqui só se anima a troca: os cards atuais
 * saem, o estado muda e os novos entram em sequência.
 */
export default function ReunioesLista({
  reunioes,
  agora,
  filtro,
  pagina,
  destaqueId,
  onFiltro,
  onPagina,
  onAjustarPagina,
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
  const pag = useMemo(() => paginar(lista, pagina, POR_PAGINA), [lista, pagina]);
  const contagens = useMemo(() => contarPorFiltro(reunioes, agora), [reunioes, agora]);
  const chave = `${filtro}:${pag.pagina}`;

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
        className={styles.rolagem}
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
