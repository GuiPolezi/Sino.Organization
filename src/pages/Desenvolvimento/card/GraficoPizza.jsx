import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useId, useMemo, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Dica from './Dica.jsx';
import { ALTURA_LINHA, fatiar, montarPizza, rabisco, textoPercentual } from './geometriaPizza.js';
import { useLargura, useMedirTexto, useRevelar } from './medidas.js';
import styles from './GraficoPizza.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

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
 * Entrada do desenho: o círculo aparece, os cortes e os rabiscos são traçados
 * como a pincel e os rótulos chegam por último. Ao trocar de período, o quadro
 * é "redesenhado" mais depressa, sem o círculo.
 */
function animarDesenho(svg, primeira) {
  const q = gsap.utils.selector(svg);
  const linha = gsap.timeline({ delay: primeira ? 0.15 : 0 });
  if (primeira) {
    linha.from(q(`.${styles.fundo}`), {
      scale: 0.86,
      autoAlpha: 0,
      transformOrigin: '50% 50%',
      duration: 0.6,
      ease: 'power3.out',
    });
  }
  linha
    .from(q(`.${styles.corte}`), { drawSVG: 0, duration: 0.4, ease: 'power2.out', stagger: 0.03 }, primeira ? 0.25 : 0)
    .from(
      q(`.${styles.rabisco}`),
      { drawSVG: 0, duration: primeira ? 1 : 0.7, ease: 'power1.inOut', stagger: primeira ? 0.09 : 0.05 },
      '<0.05',
    )
    .from(q(`.${styles.guia}`), { drawSVG: 0, duration: 0.3, ease: 'power2.out', stagger: 0.05 }, primeira ? 0.55 : 0.15)
    .from(
      q(`.${styles.rotulo}`),
      {
        autoAlpha: 0,
        x: (_, texto) => (texto.getAttribute('text-anchor') === 'start' ? -6 : 6),
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.05,
      },
      '<0.1',
    );
}

/**
 * Pizza rabiscada do painel do quadro: cada fatia é preenchida por um rabisco
 * de pincel e tem o rótulo do lado de fora, ligado por uma linha da cor dela.
 * O desenho é feito para a largura medida (geometriaPizza.js), então os
 * rótulos nunca colam nem saem da área, com quantas fatias forem. Desenha-se
 * quando aparece na tela e de novo a cada troca de período.
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
  const recorte = useId().replace(/[^\w-]/g, '');
  const largura = useLargura(area);
  const medir = useMedirTexto(area);
  const visto = useRevelar(area);
  const [ativa, setAtiva] = useState(null);

  const fatias = useMemo(() => fatiar(itens), [itens]);
  const desenho = useMemo(
    () => (largura > 0 && medir && fatias.length > 0 ? montarPizza({ itens, largura, medir }) : null),
    [itens, fatias, largura, medir],
  );
  const rabiscos = useMemo(() => desenho?.fatias.map((fatia, i) => rabisco(fatia, desenho, i)) ?? [], [desenho]);

  useGSAP(
    () => {
      if (!desenho || !visto) return;
      const primeira = !desenhou.current;
      desenhou.current = true;
      gsap.matchMedia().add(MEDIA.motion, () => animarDesenho(svg.current, primeira));
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
            <defs>
              {desenho.fatias.map((fatia, i) => (
                <clipPath key={fatia.chave} id={`${recorte}-${i}`}>
                  <path d={fatia.caminho} />
                </clipPath>
              ))}
            </defs>
            <circle className={styles.fundo} cx={desenho.cx} cy={desenho.cy} r={desenho.raio} />
            {desenho.fatias.map((fatia, i) => (
              <g
                key={fatia.chave}
                className={styles.fatia}
                data-ativa={ativa?.fatia.chave === fatia.chave || undefined}
                style={{ '--cor': fatia.cor }}
              >
                <path className={styles.rabisco} d={rabiscos[i]} clipPath={`url(#${recorte}-${i})`} />
                <path className={styles.guia} d={fatia.guia} />
                <Rotulo etiqueta={fatia.etiqueta} />
                <path
                  className={styles.alvo}
                  d={fatia.caminho}
                  onPointerMove={mover(fatia)}
                  onPointerLeave={() => setAtiva(null)}
                />
              </g>
            ))}
            {desenho.fatias.length > 1 &&
              desenho.fatias.map((fatia) => (
                <line
                  key={fatia.chave}
                  className={styles.corte}
                  x1={desenho.cx}
                  y1={desenho.cy}
                  x2={desenho.cx + desenho.raio * Math.sin(fatia.inicio)}
                  y2={desenho.cy - desenho.raio * Math.cos(fatia.inicio)}
                />
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
