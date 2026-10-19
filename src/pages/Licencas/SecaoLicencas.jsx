import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import { LIMITE_INICIAL } from './mappers/licencas.js';
import { animarEntradaCards, animarSaidaCards, animarSecao } from './animacoes.js';
import CardLicenca from './CardLicenca.jsx';
import styles from './Licencas.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Mantém o botão no mesmo ponto da tela enquanto a lista encolhe acima dele.
function encolherSemPular(botao, encolher) {
  const antes = botao.getBoundingClientRect().top;
  flushSync(encolher);
  window.scrollBy(0, botao.getBoundingClientRect().top - antes);
}

// Uma seção da página ("Vencidas" ou "Vencimento Próximo").
// `tom` escolhe as cores no CSS: "vencida" ou "proxima".
export default function SecaoLicencas({ id, titulo, tom, licencas }) {
  const raiz = useRef(null);
  const numeroSelo = useRef(null);
  const botaoMais = useRef(null);
  const [expandido, setExpandido] = useState(false);

  const temMais = licencas.length > LIMITE_INICIAL;
  const visiveis = expandido ? licencas : licencas.slice(0, LIMITE_INICIAL);
  const tituloId = `${id}-titulo`;
  const listaId = `${id}-lista`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        const numero = numeroSelo.current;
        animarSecao(gsap.utils.selector(raiz), raiz.current, numero, licencas.length);
        // Se a animação for desfeita no meio da contagem, volta ao valor final.
        return () => {
          numero.textContent = licencas.length;
        };
      });
    },
    { scope: raiz },
  );

  const { contextSafe } = useGSAP({ scope: raiz });

  const alternar = contextSafe(() => {
    if (!expandido) {
      setExpandido(true);
      return;
    }
    const recolher = () => encolherSemPular(botaoMais.current, () => setExpandido(false));
    if (!matches(MEDIA.motion)) {
      recolher();
      return;
    }
    animarSaidaCards(raiz.current.querySelectorAll('[data-extra]'), recolher);
  });

  // Cards novos entram animados; o tamanho da página mudou, então os
  // gatilhos de scroll das seções abaixo precisam ser recalculados.
  useEffect(() => {
    if (expandido && matches(MEDIA.motion)) {
      animarEntradaCards(raiz.current.querySelectorAll('[data-extra]'));
    }
    ScrollTrigger.refresh();
  }, [expandido]);

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
          <span ref={numeroSelo}>{licencas.length}</span>
          <span className="sr-only"> licenças</span>
        </p>
      </header>

      {licencas.length === 0 ? (
        <p className={styles.vazio}>Nenhuma licença nesta situação.</p>
      ) : (
        <>
          <div className={styles.colunas} aria-hidden="true">
            <span data-anim="coluna">Cliente</span>
            <span data-anim="coluna">Sistema</span>
            <span data-anim="coluna">Data Vencimento</span>
          </div>

          <ul id={listaId} className={styles.lista}>
            {visiveis.map((licenca, i) => (
              <CardLicenca key={licenca.slug} licenca={licenca} extra={i >= LIMITE_INICIAL} />
            ))}
          </ul>
        </>
      )}

      {temMais && (
        <div className={styles.maisArea} data-anim="mais">
          <button
            ref={botaoMais}
            type="button"
            className={styles.mais}
            aria-expanded={expandido}
            aria-controls={listaId}
            onClick={alternar}
          >
            {expandido ? 'Mostrar menos' : `Mostrar mais (${licencas.length - LIMITE_INICIAL})`}
            <span className={styles.maisSeta} data-aberto={expandido} aria-hidden="true">
              ↓
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
