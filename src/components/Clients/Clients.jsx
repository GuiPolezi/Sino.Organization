import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import clientsData from '../../data/clients.json';
import { MEDIA, matches } from '../../utils/media.js';
import BrazilMap from './BrazilMap.jsx';
import { STATES } from './brazilMap.js';
import PlaceModal from './PlaceModal.jsx';
import {
  playAmbient,
  playEntrance,
  playPins,
  playViewEnter,
  playViewExit,
  setupTilt,
} from './clientsAnimations.js';
import styles from './Clients.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_ID = 'clients-title';
const { cities: PLACES, totals: TOTALS } = clientsData;
const STATE_NAMES = new Map(STATES.map(({ uf, name }) => [uf, name]));

const STATS = [
  { id: 'clients', total: TOTALS.clients, label: 'clientes' },
  { id: 'cities', total: TOTALS.cities, label: 'cidades' },
  { id: 'states', total: TOTALS.states, label: 'estados' },
];

// Estados com clientes, do que tem mais para o que tem menos.
const TOTAL_BY_UF = PLACES.reduce(
  (totals, { uf, clients }) => totals.set(uf, (totals.get(uf) ?? 0) + clients.length),
  new Map(),
);
const CLIENT_STATES = [...TOTAL_BY_UF]
  .map(([uf, total]) => ({ uf, total }))
  .sort((a, b) => b.total - a.total);
const CLIENT_UFS = new Set(CLIENT_STATES.map(({ uf }) => uf));

/*
 * Os dados vêm de src/data/clients.json, gerado por `npm run sync:clients`
 * a partir da API do Milldesk. Nada é buscado no navegador.
 */
export default function Clients() {
  const root = useRef(null);
  const isSwitching = useRef(false);
  const hasSwitched = useRef(false);
  const [activeId, setActiveId] = useState(null);
  const [openPlace, setOpenPlace] = useState(null);
  // UF ampliada no mapa; `null` mostra o Brasil inteiro.
  const [viewUf, setViewUf] = useState(null);

  const places = viewUf ? PLACES.filter(({ uf }) => uf === viewUf) : PLACES;

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

  // Refeito a cada troca de recorte: os pinos mudam e o mapa "nasce" de novo.
  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MEDIA.motion, () => {
        playPins(root.current);
        if (hasSwitched.current) playViewEnter(root.current);
      });
      isSwitching.current = false;
    },
    { scope: root, dependencies: [viewUf], revertOnUpdate: true },
  );

  const changeView = contextSafe((uf) => {
    if (uf === viewUf || isSwitching.current) return;

    hasSwitched.current = true;
    setActiveId(null);

    if (matches(MEDIA.reducedMotion)) {
      setViewUf(uf);
      return;
    }

    isSwitching.current = true;
    playViewExit(root.current, () => setViewUf(uf));
  });

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
            Clique em um estado para ampliar e em um ponto para ver quem atendemos na cidade
          </p>
        </header>

        <div className={styles.map}>
          <BrazilMap
            places={places}
            viewUf={viewUf}
            clientUfs={CLIENT_UFS}
            activeId={activeId}
            onActivate={setActiveId}
            onOpen={setOpenPlace}
            onSelectState={changeView}
          />
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

          <div className={styles.filters} role="group" aria-label="Recorte do mapa" data-cli="stat">
            <button
              type="button"
              className={styles.filter}
              aria-pressed={viewUf === null}
              onClick={() => changeView(null)}
            >
              Brasil
            </button>
            {CLIENT_STATES.map(({ uf, total }) => (
              <button
                key={uf}
                type="button"
                className={styles.filter}
                aria-pressed={viewUf === uf}
                aria-label={`${STATE_NAMES.get(uf)}: ${total} clientes`}
                onClick={() => changeView(uf)}
              >
                {uf} <span className={styles.filterCount}>{total}</span>
              </button>
            ))}
          </div>

          <ul className={styles.places} data-lenis-prevent>
            {places.map((place) => (
              <li key={place.id} data-cli="place">
                <button
                  type="button"
                  className={styles.place}
                  data-active={place.id === activeId || undefined}
                  aria-haspopup="dialog"
                  onPointerEnter={() => setActiveId(place.id)}
                  onPointerLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(place.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => setOpenPlace(place)}
                >
                  <span className={styles.placeName}>
                    {place.city} <span className={styles.placeUf}>{place.uf}</span>
                  </span>
                  <span className={styles.placeCount}>{place.clients.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {openPlace && (
        <PlaceModal
          place={openPlace}
          stateName={STATE_NAMES.get(openPlace.uf)}
          onClose={() => setOpenPlace(null)}
        />
      )}
    </section>
  );
}
