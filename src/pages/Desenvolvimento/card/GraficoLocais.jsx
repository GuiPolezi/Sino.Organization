import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Dica from './Dica.jsx';
import { RAIO, montarLinha, tamanhoDaFonte, textoDoValor } from './geometriaLinha.js';
import { useLargura, useMedirTexto, useRevelar } from './medidas.js';
import styles from './GraficoLocais.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

// Entrada, quando o gráfico aparece: os eixos se traçam, a linha se desenha da esquerda e os pontos e números chegam em cascata.
function animarEntrada(raiz) {
  const q = gsap.utils.selector(raiz);
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q(`.${styles.eixoY}`), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.5 })
    .from(q(`.${styles.eixoX}`), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6 }, '<0.15')
    .from(q(`.${styles.nome}`), { autoAlpha: 0, duration: 0.4, stagger: 0.04 }, 0.1)
    .from(q(`.${styles.linha}`), { drawSVG: '0%', duration: 1, ease: 'power2.inOut' }, 0.2)
    .from(q(`.${styles.area}`), { autoAlpha: 0, duration: 0.8 }, 0.5)
    .from(q(`.${styles.ponto} circle`), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.07, ease: 'back.out(2)' }, 0.25)
    .from(q(`.${styles.valor}`), { autoAlpha: 0, duration: 0.4, stagger: 0.07 }, 0.45);
}

/**
 * "Carga por Local": os locais (campo Local do ticket) com mais tickets no
 * período, do maior para o menor, num gráfico de linha. Cada ponto é um local,
 * com o número de tickets escrito; o nome vai embaixo, deitado ou inclinado
 * conforme a largura do painel (as contas estão em geometriaLinha.js). A dica
 * (com o mouse em cima, ou com um toque no celular) mostra o nome inteiro.
 * Ao trocar de período, os pontos deslizam até o lugar novo.
 *
 * @param {object} props
 * @param {{ local: string, rotulo: string, total: number }[]} props.locais visaoGeral().porLocal
 */
export default function GraficoLocais({ locais }) {
  const raiz = useRef(null);
  const area = useRef(null);
  const gradiente = useId();
  const visto = useRevelar(raiz);
  const largura = useLargura(area);
  const fonte = tamanhoDaFonte(largura);
  const medir = useMedirTexto(area, { peso: 700, tamanho: fonte });
  const [ativo, setAtivo] = useState(null);

  const geo = useMemo(() => (medir ? montarLinha(locais, largura, medir, fonte) : null), [locais, largura, medir, fonte]);
  const pontoAtivo = geo?.pontos.find(({ local }) => local === ativo?.local);
  const pronto = geo !== null;

  useGSAP(
    () => {
      if (!visto || !pronto) return;
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(raiz.current));
    },
    // Só a primeira vez que aparece: trocar de período não refaz a entrada.
    { dependencies: [visto, pronto], scope: raiz },
  );

  // Aberta pelo toque, a dica fecha com um toque fora do gráfico.
  const abertaNoToque = ativo?.toque === true;
  useEffect(() => {
    if (!abertaNoToque) return undefined;
    const fecharFora = (event) => {
      if (!area.current?.contains(event.target)) setAtivo(null);
    };
    document.addEventListener('pointerdown', fecharFora);
    return () => document.removeEventListener('pointerdown', fecharFora);
  }, [abertaNoToque]);

  const ondeEsta = (event) => {
    const caixa = area.current.getBoundingClientRect();
    return { x: event.clientX - caixa.left, y: event.clientY - caixa.top };
  };
  // Mouse (e caneta): a dica acompanha o ponteiro.
  const mover = (local) => (event) => {
    if (event.pointerType === 'touch') return;
    setAtivo({ local, ...ondeEsta(event) });
  };
  // Toque: um toque abre a dica do local e outro no mesmo local a fecha. Rolar a tela não abre (o navegador cancela o ponteiro).
  const tocar = (local) => (event) => {
    if (event.pointerType !== 'touch') return;
    const ponto = ondeEsta(event);
    setAtivo((atual) => (atual?.local === local ? null : { local, ...ponto, toque: true }));
  };
  // No toque, o ponteiro "sai" logo depois de soltar: só o mouse fecha a dica ao sair.
  const sair = (event) => {
    if (event.pointerType !== 'touch') setAtivo(null);
  };

  return (
    <div ref={raiz} className={styles.grafico} data-esperando={!visto || undefined}>
      {locais.length === 0 && <p className={styles.vazio}>Nenhum ticket neste período.</p>}
      <div ref={area} className={styles.areaDoGrafico} aria-hidden="true" onPointerLeave={sair}>
        {geo && (
          <svg
            className={styles.svg}
            width={largura}
            height={geo.altura}
            viewBox={`0 0 ${largura} ${geo.altura}`}
            style={{ '--fonte': `${fonte}px` }}
            data-destaque={pontoAtivo ? true : undefined}
            focusable="false"
          >
            <defs>
              <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-olive)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--color-olive)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Uma faixa por local, da altura toda: o alvo do mouse e do toque, maior que o ponto. */}
            {geo.pontos.map(({ local, x }) => (
              <rect
                key={`alvo-${local}`}
                className={styles.alvo}
                x={x - geo.coluna / 2}
                y={0}
                width={geo.coluna}
                height={geo.altura}
                onPointerMove={mover(local)}
                onPointerUp={tocar(local)}
              />
            ))}

            {pontoAtivo && (
              <line className={styles.guia} x1={pontoAtivo.x} x2={pontoAtivo.x} y1={pontoAtivo.y + RAIO} y2={geo.eixo} />
            )}

            <path className={styles.area} d={geo.area} style={{ d: `path('${geo.area}')` }} fill={`url(#${gradiente})`} />
            <path className={styles.linha} d={geo.linha} style={{ d: `path('${geo.linha}')` }} />

            <line className={styles.eixoY} x1={geo.esquerda} x2={geo.esquerda} y1={0} y2={geo.eixo} />
            <line className={styles.eixoX} x1={geo.esquerda} x2={largura} y1={geo.eixo} y2={geo.eixo} />

            {geo.pontos.map(({ local, total, x, y, xValor, yValor }) => (
              <g
                key={local}
                className={styles.ponto}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                data-ativa={ativo?.local === local || undefined}
              >
                {/* O aumento do hover fica no <g>: o GSAP da entrada grava "scale: none" no próprio círculo. */}
                <g className={styles.marca}>
                  <circle r={RAIO} />
                </g>
                <text className={styles.valor} x={xValor - x} y={yValor - y} textAnchor="middle">
                  {textoDoValor(total)}
                </text>
              </g>
            ))}

            {geo.pontos.map(({ local, texto, x }) => (
              <text
                key={`nome-${local}`}
                className={styles.nome}
                style={{
                  transform: geo.deitados
                    ? `translate(${x}px, ${geo.yNomes}px)`
                    : `translate(${x}px, ${geo.yNomes}px) rotate(-45deg)`,
                }}
                textAnchor={geo.deitados ? 'middle' : 'end'}
                dominantBaseline={geo.deitados ? 'hanging' : 'central'}
                data-ativa={ativo?.local === local || undefined}
              >
                {texto}
              </text>
            ))}
          </svg>
        )}

        {pontoAtivo && (
          <Dica x={ativo.x} y={ativo.y} largura={largura} className={styles.dica} cabeNaTela>
            <strong>{pontoAtivo.local}</strong>
            <small>
              {textoDoValor(pontoAtivo.total)} {pontoAtivo.total === 1 ? 'ticket' : 'tickets'}
            </small>
          </Dica>
        )}
      </div>

      {/* sr-only no invólucro: numa tabela, a largura e o overflow dele não valem. */}
      <div className="sr-only">
        <table>
          <caption>Tickets dos {locais.length} locais com mais tickets no período</caption>
          <thead>
            <tr>
              <th scope="col">Local</th>
              <th scope="col">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {locais.map(({ local, total }) => (
              <tr key={local}>
                <th scope="row">{local}</th>
                <td>{textoDoValor(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
