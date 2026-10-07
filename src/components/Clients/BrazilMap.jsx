import { MAP_VIEW, STATES } from './brazilMap.js';
import styles from './BrazilMap.module.css';

const SHAPE_ID = 'brazil-shape';
const ASPECT = MAP_VIEW.height / MAP_VIEW.width;
const FULL_VIEW = { x: 0, y: 0, width: MAP_VIEW.width, height: MAP_VIEW.height };
// Folga em volta do estado ampliado, para a sombra e os pinos não encostarem.
const STATE_PADDING = 1.1;
// Camadas empilhadas abaixo da superfície, que dão a espessura do mapa.
const DEPTH_LAYERS = [1, 2, 3, 4];
// Quantos clientes o balão lista antes de resumir o restante.
const TOOLTIP_LIMIT = 4;

// Recorte do mapa: o país inteiro ou a caixa do estado, na proporção do tabuleiro.
const viewFor = (state) => {
  if (!state) return FULL_VIEW;

  const [minX, minY, maxX, maxY] = state.bbox;
  const width = Math.max(maxX - minX, (maxY - minY) / ASPECT) * STATE_PADDING;
  const height = width * ASPECT;
  return {
    x: (minX + maxX) / 2 - width / 2,
    y: (minY + maxY) / 2 - height / 2,
    width,
    height,
  };
};

const pinLabel = ({ city, uf, clients }) =>
  `${city} – ${uf}: ${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`;

function Pin({ place, view, isActive, onActivate, onOpen }) {
  const { id, city, uf, x, y, clients } = place;
  const hidden = clients.length - TOOLTIP_LIMIT;

  return (
    <li
      className={styles.pin}
      data-cli="pin"
      data-active={isActive || undefined}
      style={{
        '--left': ((x - view.x) / view.width) * 100,
        '--top': ((y - view.y) / view.height) * 100,
        '--weight': Math.sqrt(clients.length),
      }}
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
            aria-haspopup="dialog"
            onPointerEnter={() => onActivate(id)}
            onPointerLeave={() => onActivate(null)}
            onFocus={() => onActivate(id)}
            onBlur={() => onActivate(null)}
            onClick={() => onOpen(place)}
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
 * ele. Com `viewUf`, o tabuleiro mostra só aquele estado, ampliado.
 * Os `data-cli` são os alvos das animações GSAP.
 */
export default function BrazilMap({
  places,
  viewUf,
  clientUfs,
  activeId,
  onActivate,
  onOpen,
  onSelectState,
}) {
  const focused = STATES.find(({ uf }) => uf === viewUf);
  const view = viewFor(focused);
  const viewBox = `${view.x} ${view.y} ${view.width} ${view.height}`;
  const states = focused ? [focused] : STATES;

  return (
    <div className={styles.scene} data-cli="map">
      <div className={styles.tilt} data-cli="tilt">
        <div className={styles.ground}>
          <div className={styles.shadowView} data-cli="shadow-view">
            <svg className={styles.shadow} data-cli="shadow" viewBox={viewBox} aria-hidden="true">
              <use href={`#${SHAPE_ID}`} />
            </svg>
          </div>

          <div className={styles.board} data-cli="board">
            {/* Invólucro da troca de recorte (país ↔ estado), animada por escala. */}
            <div className={styles.view} data-cli="view">
              {DEPTH_LAYERS.map((layer) => (
                <svg
                  key={layer}
                  className={styles.depth}
                  style={{ '--layer': layer }}
                  viewBox={viewBox}
                  aria-hidden="true"
                >
                  <use href={`#${SHAPE_ID}`} />
                </svg>
              ))}

              <svg
                className={styles.surface}
                viewBox={viewBox}
                role="img"
                aria-label={
                  focused
                    ? `Mapa de ${focused.name} com as cidades atendidas`
                    : 'Mapa do Brasil com as cidades atendidas'
                }
              >
                <g id={SHAPE_ID}>
                  {states.map(({ uf, name, d }) => {
                    const isClickable = !focused && clientUfs.has(uf);
                    return (
                      <path
                        key={uf}
                        d={d}
                        data-cli="state"
                        data-clickable={isClickable || undefined}
                        onClick={isClickable ? () => onSelectState(uf) : undefined}
                      >
                        {isClickable && <title>{`${name}: clique para ampliar`}</title>}
                      </path>
                    );
                  })}
                </g>
              </svg>

              <ul className={styles.pins}>
                {places.map((place) => (
                  <Pin
                    key={place.id}
                    place={place}
                    view={view}
                    isActive={place.id === activeId}
                    onActivate={onActivate}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
