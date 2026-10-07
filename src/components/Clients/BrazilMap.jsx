import { MAP_VIEW, STATES } from './brazilMap.js';
import styles from './BrazilMap.module.css';

const SHAPE_ID = 'brazil-shape';
const VIEW_BOX = `0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`;
// Camadas empilhadas abaixo da superfície, que dão a espessura do mapa.
const DEPTH_LAYERS = [1, 2, 3, 4];
// Quantos clientes o balão lista antes de resumir o restante.
const TOOLTIP_LIMIT = 4;

const pinLabel = ({ city, uf, clients }) =>
  `${city} – ${uf}: ${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`;

function Pin({ place, isActive, onActivate }) {
  const { id, city, uf, x, y, clients } = place;
  const hidden = clients.length - TOOLTIP_LIMIT;

  return (
    <li
      className={styles.pin}
      data-cli="pin"
      data-active={isActive || undefined}
      style={{ '--x': x, '--y': y, '--weight': Math.sqrt(clients.length) }}
    >
      <span className={styles.ring} data-cli="ring" />
      <span className={styles.beam}>
        <span className={styles.beamLight} data-cli="beam" />
      </span>

      <div className={styles.billboard}>
        {/* O GSAP anima este invólucro; o botão fica livre para os estados em CSS. */}
        <span className={styles.dotAnchor} data-cli="dot">
          <button
            type="button"
            className={styles.dot}
            aria-label={pinLabel(place)}
            onPointerEnter={() => onActivate(id)}
            onPointerLeave={() => onActivate(null)}
            onFocus={() => onActivate(id)}
            onBlur={() => onActivate(null)}
            onClick={() => onActivate(id)}
          />
        </span>

        <div className={styles.tooltip} aria-hidden="true">
          <p className={styles.tooltipCity}>
            {city} · {uf}
          </p>
          <ul className={styles.tooltipClients}>
            {clients.slice(0, TOOLTIP_LIMIT).map((client) => (
              <li key={client}>{client}</li>
            ))}
            {hidden > 0 && <li className={styles.tooltipMore}>+ {hidden} outros</li>}
          </ul>
        </div>
      </div>
    </li>
  );
}

/*
 * Mapa do Brasil em CSS 3D, no mesmo espírito do notebook da seção Sistemas:
 * o tabuleiro fica inclinado no "chão" (.ground) e os pontos ficam em pé sobre
 * ele. Os `data-cli` são os alvos das animações GSAP.
 */
export default function BrazilMap({ places, activeId, onActivate }) {
  return (
    <div className={styles.scene} data-cli="map">
      <div className={styles.tilt} data-cli="tilt">
        <div className={styles.ground}>
          <svg className={styles.shadow} data-cli="shadow" viewBox={VIEW_BOX} aria-hidden="true">
            <use href={`#${SHAPE_ID}`} />
          </svg>

          <div className={styles.board} data-cli="board">
            {DEPTH_LAYERS.map((layer) => (
              <svg
                key={layer}
                className={styles.depth}
                style={{ '--layer': layer }}
                viewBox={VIEW_BOX}
                aria-hidden="true"
              >
                <use href={`#${SHAPE_ID}`} />
              </svg>
            ))}

            <svg
              className={styles.surface}
              viewBox={VIEW_BOX}
              role="img"
              aria-label="Mapa do Brasil com as cidades atendidas"
            >
              <g id={SHAPE_ID}>
                {STATES.map(({ uf, d }) => (
                  <path key={uf} d={d} data-cli="state" />
                ))}
              </g>
            </svg>

            <ul className={styles.pins}>
              {places.map((place) => (
                <Pin
                  key={place.id}
                  place={place}
                  isActive={place.id === activeId}
                  onActivate={onActivate}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
