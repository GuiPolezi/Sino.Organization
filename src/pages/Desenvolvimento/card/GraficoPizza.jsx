import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMemo, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Dica from './Dica.jsx';
import { ALTURA_LINHA, fatiar, montarPizza, textoPercentual } from './geometriaPizza.js';
import { useLargura, useMedirTexto, useRevelar } from './medidas.js';
import styles from './GraficoPizza.module.css';

gsap.registerPlugin(useGSAP);

const formato = new Intl.NumberFormat('pt-BR');
const tickets = (valor) => `${formato.format(valor)} ${valor === 1 ? 'ticket' : 'tickets'}`;

// O bloco de linhas fica centrado na altura do rótulo; o +4 leva a linha de base ao meio das letras.
const primeiraLinha = (etiqueta) => etiqueta.y + 4 - ((etiqueta.linhas.length - 1) * ALTURA_LINHA) / 2;

function Rotulo({ etiqueta }) {
  return (
    <text
      className={styles.rotulo}
      x={etiqueta.x}
      y={primeiraLinha(etiqueta)}
      textAnchor={etiqueta.lado === 'direita' ? 'start' : 'end'}
    >
      {etiqueta.linhas.map((linha, i) => (
        <tspan key={i} x={etiqueta.x} dy={i === 0 ? 0 : ALTURA_LINHA}>
          {linha}
        </tspan>
      ))}
    </text>
  );
}

/*
 * Entrada: as fatias crescem do centro, uma atrás da outra, e os rótulos chegam
 * em seguida pelas linhas. Ao trocar de período, a pizza se refaz mais depressa.
 * Só transform e opacity: nada é medido nem redesenhado a cada quadro.
 */
function animarEntrada(svg, { cx, cy }, primeira) {
  const q = gsap.utils.selector(svg);
  const origem = `${cx} ${cy}`;
  gsap
    .timeline({ delay: primeira ? 0.1 : 0, defaults: { ease: 'power3.out' } })
    .from(q(`.${styles.fundo}`), { scale: 0.7, autoAlpha: 0, svgOrigin: origem, duration: primeira ? 0.5 : 0.3 })
    .from(
      q(`.${styles.corpo}`),
      {
        scale: 0,
        autoAlpha: 0,
        svgOrigin: origem,
        duration: primeira ? 0.6 : 0.45,
        ease: 'back.out(1.4)',
        stagger: primeira ? 0.06 : 0.035,
      },
      primeira ? 0.15 : 0.05,
    )
    // A linha "sai" da fatia: cresce a partir da ponta que encosta no círculo.
    .from(
      q(`.${styles.guia}`),
      {
        scaleX: 0,
        autoAlpha: 0,
        transformOrigin: (_, linha) => (linha.parentNode.dataset.lado === 'direita' ? '0% 50%' : '100% 50%'),
        duration: 0.35,
        stagger: 0.04,
      },
      '<0.3',
    )
    .from(
      q(`.${styles.rotulo}`),
      {
        autoAlpha: 0,
        x: (_, texto) => (texto.getAttribute('text-anchor') === 'start' ? -6 : 6),
        duration: 0.4,
        stagger: 0.04,
      },
      '<0.08',
    );
}

/**
 * Pizza do painel do quadro: cada fatia é um setor de cor cheia (a cor fixa do
 * desenvolvedor ou da categoria), com o rótulo do lado de fora ligado por uma
 * linha da mesma cor. O desenho é feito para a largura medida
 * (geometriaPizza.js), então os rótulos nunca colam nem saem da área, com
 * quantas fatias forem. Entra quando aparece na tela e se refaz a cada troca
 * de período.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} props.cabecalho nome da primeira coluna da tabela para leitores de tela
 * @param {import('./geometriaPizza.js').ItemPizza[]} props.itens
 */
export default function GraficoPizza({ titulo, cabecalho, itens }) {
  const area = useRef(null);
  const svg = useRef(null);
  const desenhou = useRef(false);
  const largura = useLargura(area);
  const medir = useMedirTexto(area);
  const visto = useRevelar(area);
  const [ativa, setAtiva] = useState(null);

  const fatias = useMemo(() => fatiar(itens), [itens]);
  const desenho = useMemo(
    () => (largura > 0 && medir && fatias.length > 0 ? montarPizza({ itens, largura, medir }) : null),
    [itens, fatias, largura, medir],
  );

  useGSAP(
    () => {
      if (!desenho || !visto) return;
      const primeira = !desenhou.current;
      desenhou.current = true;
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(svg.current, desenho, primeira));
    },
    { dependencies: [desenho, visto], scope: svg, revertOnUpdate: true },
  );

  const mover = (fatia) => (event) => {
    const caixa = area.current.getBoundingClientRect();
    setAtiva({ fatia, x: event.clientX - caixa.left, y: event.clientY - caixa.top });
  };

  return (
    <figure className={styles.pizza}>
      <figcaption className={styles.titulo}>{titulo}</figcaption>
      <div ref={area} className={styles.area} data-esperando={!visto || undefined}>
        {fatias.length === 0 && <p className={styles.vazio}>Nenhum ticket neste período.</p>}
        {desenho && (
          <svg
            ref={svg}
            className={styles.svg}
            width={desenho.largura}
            height={desenho.altura}
            viewBox={`0 0 ${desenho.largura} ${desenho.altura}`}
            data-destaque={ativa ? true : undefined}
            aria-hidden="true"
            focusable="false"
          >
            <circle className={styles.fundo} cx={desenho.cx} cy={desenho.cy} r={desenho.raio} />
            {desenho.fatias.map((fatia) => (
              <g
                key={fatia.chave}
                className={styles.fatia}
                data-ativa={ativa?.fatia.chave === fatia.chave || undefined}
                data-lado={fatia.etiqueta.lado}
                style={{ '--cor': fatia.cor, '--salto-x': `${fatia.salto[0]}px`, '--salto-y': `${fatia.salto[1]}px` }}
              >
                <path
                  className={styles.corpo}
                  d={fatia.caminho}
                  onPointerMove={mover(fatia)}
                  onPointerLeave={() => setAtiva(null)}
                />
                <path className={styles.guia} d={fatia.guia} />
                <Rotulo etiqueta={fatia.etiqueta} />
              </g>
            ))}
          </svg>
        )}
        {ativa && desenho && (
          <Dica x={ativa.x} y={ativa.y} largura={desenho.largura}>
            <strong>{ativa.fatia.rotulo}</strong>
            {tickets(ativa.fatia.valor)} · {textoPercentual(ativa.fatia.valor, ativa.fatia.percentual)}
          </Dica>
        )}
      </div>

      {/* sr-only no invólucro: numa tabela, a largura e o overflow dele não valem. */}
      <div className="sr-only">
        <table>
          <thead>
            <tr>
              <th scope="col">{cabecalho}</th>
              <th scope="col">Tickets</th>
              <th scope="col">Parte do total</th>
            </tr>
          </thead>
          <tbody>
            {fatias.map(({ chave, rotulo, valor, percentual }) => (
              <tr key={chave}>
                <th scope="row">{rotulo}</th>
                <td>{formato.format(valor)}</td>
                <td>{textoPercentual(valor, percentual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
