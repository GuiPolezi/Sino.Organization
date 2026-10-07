import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import clientsData from '../../data/clients.json';
import { MEDIA } from '../../utils/media.js';
import BrazilMap from './BrazilMap.jsx';
import { playAmbient, playEntrance, setupTilt } from './clientsAnimations.js';
import styles from './Clients.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_ID = 'clients-title';
const { cities: PLACES, totals: TOTALS } = clientsData;

const STATS = [
  { id: 'clients', total: TOTALS.clients, label: 'clientes' },
  { id: 'cities', total: TOTALS.cities, label: 'cidades' },
  { id: 'states', total: TOTALS.states, label: 'estados' },
];

/*
 * Os dados vêm de src/data/clients.json, gerado por `npm run sync:clients`
 * a partir da API do Milldesk. Nada é buscado no navegador.
 */
export default function Clients() {
  const root = useRef(null);
  const [activeId, setActiveId] = useState(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MEDIA.motion, () => {
        playAmbient(root.current);
        return playEntrance(root.current);
      });
      mm.add(`${MEDIA.hover} and ${MEDIA.motion}`, () => setupTilt(root.current));
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.panel} aria-labelledby={TITLE_ID}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={TITLE_ID} className={styles.title}>
            <span className={styles.titleLine}>
              <span className={styles.titleLineInner} data-cli="title-line">
                Clientes
              </span>
            </span>
          </h2>
          <p className={styles.subtitle} data-cli="subtitle">
            Passe o mouse ou toque em um ponto para ver quem atendemos em cada cidade
          </p>
        </header>

        <div className={styles.map}>
          <BrazilMap places={PLACES} activeId={activeId} onActivate={setActiveId} />
        </div>

        <aside className={styles.aside} aria-label="Resumo dos clientes">
          <dl className={styles.stats}>
            {STATS.map(({ id, total, label }) => (
              <div key={id} className={styles.stat} data-cli="stat">
                <dt className={styles.statLabel}>{label}</dt>
                <dd className={styles.statValue} data-cli="count" data-total={total}>
                  {total}
                </dd>
              </div>
            ))}
          </dl>

          <ul className={styles.places} data-lenis-prevent>
            {PLACES.map(({ id, city, uf, clients }) => (
              <li key={id} data-cli="place">
                <button
                  type="button"
                  className={styles.place}
                  data-active={id === activeId || undefined}
                  onPointerEnter={() => setActiveId(id)}
                  onPointerLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => setActiveId(id)}
                >
                  <span className={styles.placeName}>
                    {city} <span className={styles.placeUf}>{uf}</span>
                  </span>
                  <span className={styles.placeCount}>{clients.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
