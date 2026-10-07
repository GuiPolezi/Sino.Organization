import { useEffect } from 'react';
import { aparenciaDe } from '../boneco/aparencia.js';
import { useEquipe } from '../store.js';
import styles from './CardTecnico.module.css';

const META_SLA = 95;
const NOTAS = [1, 2, 3, 4, 5];

const FUSO = 'America/Sao_Paulo';
const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
const formatoDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
const UM_DIA_MS = 864e5;

function quando(iso) {
  const data = new Date(iso);
  const dia = formatoDia.format(data);
  const hoje = formatoDia.format(new Date());
  const ontem = formatoDia.format(new Date(Date.now() - UM_DIA_MS));
  const prefixo = dia === hoje ? 'hoje' : dia === ontem ? 'ontem' : dia;
  return `${prefixo}, ${formatoHora.format(data)}`;
}

const classeSla = (sla) => {
  if (sla >= META_SLA) return styles.ok;
  return sla >= 90 ? styles.aviso : styles.critico;
};

// Teclado enquanto há um técnico selecionado: Esc fecha, ← → navega.
function useAtalhos() {
  useEffect(() => {
    const onKeyDown = (event) => {
      const { selecionado, selecionar, navegar } = useEquipe.getState();
      if (!selecionado) return;
      if (event.key === 'Escape') selecionar(null);
      if (event.key === 'ArrowRight') navegar(1);
      if (event.key === 'ArrowLeft') navegar(-1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function Chamados({ tarefas }) {
  return (
    <section>
      <h3 className={styles.rotulo}>Chamados</h3>
      <dl className={styles.contadores}>
        <div>
          <dt>Abertos</dt>
          <dd>{tarefas.abertas}</dd>
        </div>
        <div>
          <dt>Em andamento</dt>
          <dd>{tarefas.emAndamento}</dd>
        </div>
        <div>
          <dt>Concluídos no mês</dt>
          <dd>{tarefas.concluidasMes}</dd>
        </div>
        <div className={tarefas.atrasadas > 0 ? styles.alerta : undefined}>
          <dt>Atrasados</dt>
          <dd>{tarefas.atrasadas}</dd>
        </div>
      </dl>
    </section>
  );
}

function Sla({ valor }) {
  const classe = classeSla(valor);

  return (
    <div>
      <div className={styles.linhaMetrica}>
        <h3 className={styles.rotulo}>SLA cumprido</h3>
        <strong className={classe}>{valor}%</strong>
      </div>
      <div className={styles.barra} role="img" aria-label={`SLA de ${valor} por cento`}>
        <span className={classe} style={{ width: `${valor}%` }} />
        <em style={{ left: `${META_SLA}%` }} />
      </div>
      <p className={`${styles.sutil} ${styles.pequeno}`}>Meta: {META_SLA}%</p>
    </div>
  );
}

function Avaliacao({ valor }) {
  return (
    <div>
      <div className={styles.linhaMetrica}>
        <h3 className={styles.rotulo}>Avaliação</h3>
        <strong>
          {valor.toFixed(1).replace('.', ',')}
          <small> / 5</small>
        </strong>
      </div>
      <div className={styles.pontos} aria-hidden="true">
        {NOTAS.map((n) => (
          <span key={n} style={{ '--preench': Math.max(0, Math.min(1, valor - n + 1)) }} />
        ))}
      </div>
    </div>
  );
}

/*
 * Card com os dados do técnico selecionado. Overlay HTML fora do <Canvas>:
 * lateral no desktop e bottom sheet no mobile. Cada seção só aparece quando o
 * dado dela existe; hoje o Milldesk fornece nome, cargo e ausência.
 */
export default function CardTecnico() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  useAtalhos();

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const tecnico = tecnicos[indice];
  if (!tecnico) return null;

  const { tarefas, slaCumprido, avaliacaoMedia, especialidades, ultimaAtividade } = tecnico;
  const temMetricas = slaCumprido !== undefined || avaliacaoMedia !== undefined;

  return (
    // A key refaz a animação de entrada ao trocar de técnico.
    <aside key={tecnico.id} className={styles.card} aria-label={`Informações de ${tecnico.nome}`}>
      <header className={styles.topo}>
        <div
          className={styles.avatar}
          style={{ '--cor-avatar': aparenciaDe(tecnico.id).camisa }}
          aria-hidden="true"
        >
          {tecnico.avatarIniciais}
        </div>
        <div className={styles.titulo}>
          <h2>{tecnico.nome}</h2>
          {tecnico.funcao && <p>{tecnico.funcao}</p>}
        </div>
        <button type="button" className={styles.fechar} aria-label="Fechar" onClick={() => selecionar(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {tecnico.ausente && (
        <span className={`${styles.pill} ${styles.neutro}`}>
          <i />
          Ausente
        </span>
      )}

      {tarefas && <Chamados tarefas={tarefas} />}

      {temMetricas && (
        <section className={styles.metricas}>
          {slaCumprido !== undefined && <Sla valor={slaCumprido} />}
          {avaliacaoMedia !== undefined && <Avaliacao valor={avaliacaoMedia} />}
        </section>
      )}

      {especialidades?.length > 0 && (
        <section>
          <h3 className={styles.rotulo}>Especialidades</h3>
          <ul className={styles.chips}>
            {especialidades.map((especialidade) => (
              <li key={especialidade}>{especialidade}</li>
            ))}
          </ul>
        </section>
      )}

      {ultimaAtividade && (
        <footer className={styles.rodape}>
          <span>Última atividade: {quando(ultimaAtividade)}</span>
        </footer>
      )}

      <nav className={styles.nav} aria-label="Navegar entre técnicos">
        <button type="button" aria-label="Técnico anterior" onClick={() => navegar(-1)}>
          ←
        </button>
        <span>
          {indice + 1} de {tecnicos.length}
        </span>
        <button type="button" aria-label="Próximo técnico" onClick={() => navegar(1)}>
          →
        </button>
      </nav>
    </aside>
  );
}
