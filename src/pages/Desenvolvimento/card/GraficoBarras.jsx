import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMemo, useRef } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { OUTROS } from '../mappers/visaoGeral.js';
import { fatiar, textoPercentual } from './geometriaPizza.js';
import { useRevelar } from './medidas.js';
import styles from './GraficoBarras.module.css';

gsap.registerPlugin(useGSAP);

const formato = new Intl.NumberFormat('pt-BR');

// Do maior para o menor, para comparar de cima para baixo; "Outros" sempre por último.
const emOrdem = (barras) =>
  barras.toSorted((a, b) => (a.chave === OUTROS) - (b.chave === OUTROS) || b.valor - a.valor);

// Entrada, quando o gráfico aparece: o eixo se traça, as barras crescem dele e os valores chegam depois.
function animarEntrada(raiz) {
  const q = gsap.utils.selector(raiz);
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q(`.${styles.eixo}`), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.5 })
    .from(q(`.${styles.rotulo}`), { autoAlpha: 0, x: -6, duration: 0.4, stagger: 0.04 }, 0.1)
    .from(q(`.${styles.barra}`), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, stagger: 0.05 }, 0.2)
    .from(q(`.${styles.valor}`), { autoAlpha: 0, x: -6, duration: 0.4, stagger: 0.05 }, 0.5);
}

/**
 * Barras do painel do quadro ("Carga por Dev", "Carga por Categoria"): uma
 * barra deitada por item, na cor fixa dele, com o nome à esquerda e o número
 * de tickets e a parte do total escritos ao lado. Ao trocar de período, as
 * barras deslizam até o tamanho novo e as linhas trocam de lugar sem saltos.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} props.cabecalho nome da primeira coluna da tabela para leitores de tela
 * @param {import('./geometriaPizza.js').ItemPizza[]} props.itens
 */
export default function GraficoBarras({ titulo, cabecalho, itens }) {
  const raiz = useRef(null);
  const visto = useRevelar(raiz);
  const barras = useMemo(() => emOrdem(fatiar(itens)), [itens]);
  const maximo = Math.max(1, ...barras.map(({ valor }) => valor));
  const vazio = barras.length === 0;

  useGSAP(
    () => {
      if (!visto || vazio) return;
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(raiz.current));
    },
    { dependencies: [visto, vazio], scope: raiz },
  );

  return (
    <figure ref={raiz} className={styles.grafico} data-esperando={!visto || undefined}>
      <figcaption className={styles.titulo}>{titulo}</figcaption>
      {vazio && <p className={styles.vazio}>Nenhum ticket neste período.</p>}
      {!vazio && (
        <div className={styles.area} aria-hidden="true">
          <i className={styles.eixo} />
          <ol className={styles.linhas} style={{ '--linhas': barras.length }}>
            {barras.map(({ chave, rotulo, valor, percentual, cor }, i) => (
              <li key={chave} style={{ '--posicao': i, '--cor': cor }}>
                {/* O title mostra o nome inteiro quando ele termina em reticências. */}
                <span className={styles.rotulo} title={rotulo}>
                  {rotulo}
                </span>
                <span className={styles.trilho}>
                  <span className={styles.barra} style={{ '--fracao': valor / maximo }} />
                  <span className={styles.valor}>
                    <b>
                      <Contagem valor={valor} />
                    </b>
                    <small>{textoPercentual(valor, percentual)}</small>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

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
            {barras.map(({ chave, rotulo, valor, percentual }) => (
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
