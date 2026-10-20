import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { MEDIA, matches } from '../../../utils/media.js';
import { FILTROS } from './periodos.js';
import styles from './FiltrosPeriodo.module.css';

/*
 * Pílulas de filtro com um indicador único ("magic pill") que desliza até a
 * ativa, animando só x e largura. `contagens` vai para leitores de tela.
 */
export default function FiltrosPeriodo({ ativo, contagens, onEscolher }) {
  const trilho = useRef(null);
  const indicador = useRef(null);
  const botoes = useRef({});
  const primeira = useRef(true);

  useLayoutEffect(() => {
    const alvo = botoes.current[ativo];
    const pilula = indicador.current;
    if (!alvo || !pilula) return undefined;

    const medidas = () => ({ x: alvo.offsetLeft, width: alvo.offsetWidth });

    if (primeira.current || matches(MEDIA.reducedMotion)) {
      gsap.set(pilula, medidas());
    } else {
      gsap.to(pilula, { ...medidas(), duration: 0.5, ease: 'power3.out', overwrite: true });
    }
    primeira.current = false;

    // Tela estreita: rola o trilho na horizontal até a pílula ativa.
    const rolagem = trilho.current.parentElement;
    if (rolagem.scrollWidth > rolagem.clientWidth) {
      const esquerda = alvo.offsetLeft - (rolagem.clientWidth - alvo.offsetWidth) / 2;
      rolagem.scrollTo({
        left: Math.max(0, esquerda),
        behavior: matches(MEDIA.reducedMotion) ? 'auto' : 'smooth',
      });
    }

    // Mantém a pílula no lugar caso as larguras mudem (fonte, resize).
    const observador = new ResizeObserver(() => {
      if (!gsap.isTweening(pilula)) gsap.set(pilula, medidas());
    });
    observador.observe(trilho.current);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [ativo]);

  // Setas esquerda/direita andam entre as pílulas.
  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const indice = FILTROS.findIndex((f) => f.id === ativo);
    const passo = event.key === 'ArrowRight' ? 1 : -1;
    const proximo = FILTROS[(indice + passo + FILTROS.length) % FILTROS.length];
    event.preventDefault();
    botoes.current[proximo.id]?.focus();
    onEscolher(proximo.id);
  };

  return (
    <div className={styles.rolagem} data-modal-scroll>
      <div
        ref={trilho}
        className={styles.trilho}
        role="group"
        aria-label="Filtrar reuniões por período"
        onKeyDown={onKeyDown}
      >
        <span ref={indicador} className={styles.indicador} aria-hidden="true" />
        {FILTROS.map((filtro) => {
          const marcado = filtro.id === ativo;
          return (
            <button
              key={filtro.id}
              ref={(el) => {
                botoes.current[filtro.id] = el;
              }}
              type="button"
              className={marcado ? `${styles.pilula} ${styles.ativa}` : styles.pilula}
              aria-pressed={marcado}
              onClick={() => {
                if (!marcado) onEscolher(filtro.id);
              }}
            >
              <span className={styles.rotulo}>{filtro.rotulo}</span>
              {contagens && (
                <span className="sr-only"> ({contagens[filtro.id] ?? 0})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
