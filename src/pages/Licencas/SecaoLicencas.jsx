import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import { LIMITE_INICIAL, POR_PAGINA } from './mappers/licencas.js';
import {
  animarEntradaCards,
  animarEntradaPagina,
  animarSaidaCards,
  animarSaidaPagina,
  animarSecao,
} from './animacoes.js';
import CardLicenca from './CardLicenca.jsx';
import Paginacao from './Paginacao.jsx';
import styles from './Licencas.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Folga entre o topo da tela e o topo da seção quando a página rola até ela.
const FOLGA_TOPO = 24;

// Mantém o botão no mesmo ponto da tela enquanto a lista encolhe acima dele.
function encolherSemPular(botao, encolher) {
  const antes = botao.getBoundingClientRect().top;
  flushSync(encolher);
  window.scrollBy(0, botao.getBoundingClientRect().top - antes);
}

// Se o topo da seção ficou acima da tela, rola até ele: a página nova começa
// pelo primeiro card, e não pelo fim da lista onde está a paginação.
function rolarAteSecao(secao, suave) {
  const topo = secao.getBoundingClientRect().top;
  if (topo >= 0) return;
  window.scrollTo({ top: window.scrollY + topo - FOLGA_TOPO, behavior: suave ? 'smooth' : 'auto' });
}

/*
 * Uma seção da página ("Vencidas" ou "Vencimento Próximo"). `tom` escolhe as
 * cores no CSS: "vencida" ou "proxima".
 *
 * Começa com LIMITE_INICIAL cards; "Mostrar mais" abre a primeira página, com
 * POR_PAGINA cards. Se houver mais que isso, aparece a paginação.
 */
export default function SecaoLicencas({ id, titulo, tom, licencas }) {
  const raiz = useRef(null);
  const lista = useRef(null);
  const numeroSelo = useRef(null);
  const botaoMais = useRef(null);
  const paginacao = useRef(null);
  // Enquanto uma troca anima, novos cliques esperam.
  const ocupado = useRef(false);
  const [expandido, setExpandido] = useState(false);
  const [pagina, setPagina] = useState(1);

  const total = licencas.length;
  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const temMais = total > LIMITE_INICIAL;
  const paginado = expandido && totalPaginas > 1;
  const inicio = expandido ? (pagina - 1) * POR_PAGINA : 0;
  const visiveis = licencas.slice(inicio, inicio + (expandido ? POR_PAGINA : LIMITE_INICIAL));
  const tituloId = `${id}-titulo`;
  const listaId = `${id}-lista`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        const numero = numeroSelo.current;
        animarSecao(gsap.utils.selector(raiz), raiz.current, numero, total);
        // Se a animação for desfeita no meio da contagem, volta ao valor final.
        return () => {
          numero.textContent = total;
        };
      });
    },
    { scope: raiz },
  );

  const { contextSafe } = useGSAP({ scope: raiz });

  const cards = () => lista.current.querySelectorAll('[data-anim="card"]');
  const extras = () => lista.current.querySelectorAll('[data-extra]');

  // Tira os cards atuais, troca o estado e traz os novos, do lado `direcao`.
  const trocarCards = (direcao, trocar) => {
    if (!matches(MEDIA.motion)) {
      flushSync(trocar);
      rolarAteSecao(raiz.current, false);
      return;
    }
    ocupado.current = true;
    rolarAteSecao(raiz.current, true);
    animarSaidaPagina(cards(), direcao, () => {
      flushSync(trocar);
      animarEntradaPagina(cards(), direcao, () => {
        ocupado.current = false;
      });
    });
  };

  const irParaPagina = contextSafe((nova) => {
    if (ocupado.current || nova === pagina) return;
    trocarCards(nova > pagina ? 1 : -1, () => setPagina(nova));
  });

  const abrir = () => {
    flushSync(() => setExpandido(true));
    if (!matches(MEDIA.motion)) return;
    animarEntradaCards(extras());
    if (paginacao.current) {
      gsap.from(paginacao.current, { autoAlpha: 0, y: 12, duration: 0.6, delay: 0.15, ease: 'power3.out' });
    }
  };

  const fechar = () => {
    const recolher = () => setExpandido(false);

    // Fora da primeira página, os cards trocam de vez pelos três primeiros.
    if (pagina !== 1) {
      trocarCards(-1, () => {
        setPagina(1);
        recolher();
      });
      return;
    }

    if (!matches(MEDIA.motion)) {
      encolherSemPular(botaoMais.current, recolher);
      return;
    }
    ocupado.current = true;
    const saem = [...extras(), ...(paginacao.current ? [paginacao.current] : [])];
    animarSaidaCards(saem, () => {
      encolherSemPular(botaoMais.current, recolher);
      ocupado.current = false;
    });
  };

  const alternar = contextSafe(() => {
    if (ocupado.current) return;
    if (expandido) fechar();
    else abrir();
  });

  // O tamanho da página mudou: os gatilhos de scroll das seções abaixo
  // precisam ser recalculados.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [expandido, pagina]);

  const restantes = Math.min(POR_PAGINA - LIMITE_INICIAL, total - LIMITE_INICIAL);

  return (
    <section ref={raiz} className={styles.secao} data-tom={tom} aria-labelledby={tituloId}>
      <header className={styles.secaoTopo}>
        <h2 id={tituloId} className={styles.secaoTitulo}>
          {titulo.split(' ').map((palavra) => (
            <span key={palavra} className={styles.mascara}>
              <span className={styles.palavra} data-anim="titulo-palavra">
                {palavra}
              </span>
            </span>
          ))}
        </h2>
        <p className={styles.selo} data-anim="selo">
          <span ref={numeroSelo}>{total}</span>
          <span className="sr-only"> licenças</span>
        </p>
      </header>

      {total === 0 ? (
        <p className={styles.vazio}>Nenhuma licença nesta situação.</p>
      ) : (
        <>
          <div className={styles.colunas} aria-hidden="true">
            <span data-anim="coluna">Cliente</span>
            <span data-anim="coluna">Sistema</span>
            <span data-anim="coluna">Data Vencimento</span>
          </div>

          <ul ref={lista} id={listaId} className={styles.lista}>
            {visiveis.map((licenca, i) => (
              <CardLicenca
                key={licenca.chave}
                licenca={licenca}
                extra={expandido && pagina === 1 && i >= LIMITE_INICIAL}
              />
            ))}
          </ul>
        </>
      )}

      {temMais && (
        <div className={styles.maisArea} data-anim="mais">
          {paginado && (
            <Paginacao
              ref={paginacao}
              pagina={pagina}
              totalPaginas={totalPaginas}
              inicio={inicio + 1}
              fim={inicio + visiveis.length}
              total={total}
              rotulo={`Páginas de ${titulo}`}
              onIr={irParaPagina}
            />
          )}

          <button
            ref={botaoMais}
            type="button"
            className={styles.mais}
            aria-expanded={expandido}
            aria-controls={listaId}
            onClick={alternar}
          >
            {expandido ? 'Mostrar menos' : `Mostrar mais (+${restantes})`}
            <span className={styles.maisSeta} data-aberto={expandido} aria-hidden="true">
              ↓
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
