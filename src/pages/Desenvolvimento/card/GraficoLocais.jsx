import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { TIPOS } from '../mappers/chamados.js';
import { OUTROS } from '../mappers/visaoGeral.js';
import { CORES_TIPOS } from './cores.js';
import Dica from './Dica.jsx';
import { useRevelar } from './medidas.js';
import styles from './GraficoLocais.module.css';

gsap.registerPlugin(useGSAP);

const formato = new Intl.NumberFormat('pt-BR');
// "Melhoria/Função" pode quebrar depois da barra, para caber na legenda.
const quebravel = (tipo) => tipo.replace('/', '/​');

// Entrada, quando o gráfico aparece: os eixos se traçam, as barras crescem do eixo e os valores chegam depois.
function animarEntrada(raiz) {
  const q = gsap.utils.selector(raiz);
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q(`.${styles.eixoY}`), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.5 })
    .from(q(`.${styles.eixoX}`), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6 }, '<0.15')
    .from(q(`.${styles.local}`), { autoAlpha: 0, x: -6, duration: 0.4, stagger: 0.04 }, 0.1)
    .from(q(`.${styles.barra}`), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.9, stagger: 0.06 }, 0.2)
    .from(q(`.${styles.valor}`), { autoAlpha: 0, x: -6, duration: 0.4, stagger: 0.06 }, 0.55)
    .from(q(`.${styles.legenda} li`), { autoAlpha: 0, y: 6, duration: 0.4, stagger: 0.05 }, 0.5);
}

/**
 * "Carga por Local": os locais com mais tickets no período, numa barra por
 * local, dividida pelos tipos de solicitação. Ao trocar de período, as barras
 * deslizam até o tamanho novo e as linhas trocam de lugar sem saltos.
 *
 * @param {object} props
 * @param {{ local: string, total: number, tipos: { tipo: string, total: number }[] }[]} props.locais
 */
export default function GraficoLocais({ locais }) {
  const raiz = useRef(null);
  const area = useRef(null);
  const visto = useRevelar(raiz);
  const [ativo, setAtivo] = useState(null);

  const maximo = Math.max(1, ...locais.map(({ total }) => total));
  const temOutros = locais.some(({ tipos }) => tipos.some(({ tipo }) => tipo === OUTROS));
  const legenda = temOutros ? [...TIPOS, OUTROS] : TIPOS;
  const linhaAtiva = locais.find(({ local }) => local === ativo?.local);

  useGSAP(
    () => {
      if (!visto) return;
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(raiz.current));
    },
    { dependencies: [visto], scope: raiz },
  );

  const mover = (local) => (event) => {
    const caixa = area.current.getBoundingClientRect();
    setAtivo({ local, x: event.clientX - caixa.left, y: event.clientY - caixa.top });
  };

  return (
    <div ref={raiz} className={styles.grafico} data-esperando={!visto || undefined}>
      {locais.length === 0 && <p className={styles.vazio}>Nenhum ticket neste período.</p>}
      <div ref={area} className={styles.area} aria-hidden="true" onPointerLeave={() => setAtivo(null)}>
        <i className={styles.eixoY} />
        <ol className={styles.linhas} style={{ '--linhas': locais.length }} data-destaque={ativo ? true : undefined}>
          {locais.map(({ local, total, tipos }, i) => (
            <li
              key={local}
              style={{ '--posicao': i }}
              data-ativa={ativo?.local === local || undefined}
              onPointerMove={mover(local)}
            >
              <span className={styles.local}>{local}</span>
              <span className={styles.trilho}>
                <span className={styles.barra} style={{ '--fracao': total / maximo }}>
                  {tipos.map(({ tipo, total: doTipo }) => (
                    <i
                      key={tipo}
                      style={{ flexGrow: doTipo, background: CORES_TIPOS[tipo] }}
                      data-vazio={doTipo === 0 || undefined}
                    />
                  ))}
                </span>
                <b className={styles.valor}>
                  <Contagem valor={total} />
                </b>
              </span>
            </li>
          ))}
        </ol>
        <i className={styles.eixoX} />
        {linhaAtiva && (
          <Dica x={ativo.x} y={ativo.y} largura={area.current?.clientWidth ?? 0}>
            <strong>{linhaAtiva.local}</strong>
            <ul>
              {linhaAtiva.tipos
                .filter(({ total }) => total > 0)
                .map(({ tipo, total }) => (
                  <li key={tipo}>
                    <i style={{ background: CORES_TIPOS[tipo] }} />
                    {tipo}
                    <b>{formato.format(total)}</b>
                  </li>
                ))}
            </ul>
            <small>
              {formato.format(linhaAtiva.total)} {linhaAtiva.total === 1 ? 'ticket' : 'tickets'} no total
            </small>
          </Dica>
        )}
      </div>

      <ul className={styles.legenda} hidden={locais.length === 0} aria-hidden="true">
        {legenda.map((tipo) => (
          <li key={tipo}>
            <i style={{ background: CORES_TIPOS[tipo] }} />
            {quebravel(tipo)}
          </li>
        ))}
      </ul>

      {/* sr-only no invólucro: numa tabela, a largura e o overflow dele não valem. */}
      <div className="sr-only">
        <table>
          <caption>Tickets dos {locais.length} locais com mais tickets no período, por tipo de solicitação</caption>
          <thead>
            <tr>
              <th scope="col">Local</th>
              {legenda.map((tipo) => (
                <th key={tipo} scope="col">
                  {tipo}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {locais.map(({ local, total, tipos }) => (
              <tr key={local}>
                <th scope="row">{local}</th>
                {legenda.map((tipo) => (
                  <td key={tipo}>{formato.format(tipos.find((item) => item.tipo === tipo)?.total ?? 0)}</td>
                ))}
                <td>{formato.format(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
