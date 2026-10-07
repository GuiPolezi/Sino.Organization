import { useEffect } from 'react';
import { aparenciaDe } from '../boneco/aparencia.js';
import { useEquipe } from '../store.js';
import styles from './CardTecnico.module.css';

const META_SLA = 95;
const NOTAS = [1, 2, 3, 4, 5];

const STATUS = {
  disponivel: { rotulo: 'Disponível', classe: styles.ok },
  em_atendimento: { rotulo: 'Em atendimento', classe: styles.aviso },
  ausente: { rotulo: 'Ausente', classe: styles.neutro },
};

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

/*
 * Card com os dados do técnico selecionado. Overlay HTML fora do <Canvas>:
 * lateral no desktop e bottom sheet no mobile.
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

  const { tarefas } = tecnico;
  const status = STATUS[tecnico.status] ?? STATUS.ausente;
  const sla = classeSla(tecnico.slaCumprido);
  const nota = tecnico.avaliacaoMedia.toFixed(1).replace('.', ',');

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
          <p>{tecnico.funcao}</p>
          <p className={styles.sutil}>{tecnico.equipe}</p>
        </div>
        <button type="button" className={styles.fechar} aria-label="Fechar" onClick={() => selecionar(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <span className={`${styles.pill} ${status.classe}`}>
        <i />
        {status.rotulo}
      </span>

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

      <section className={styles.metricas}>
        <div>
          <div className={styles.linhaMetrica}>
            <h3 className={styles.rotulo}>SLA cumprido</h3>
            <strong className={sla}>{tecnico.slaCumprido}%</strong>
          </div>
          <div className={styles.barra} role="img" aria-label={`SLA de ${tecnico.slaCumprido} por cento`}>
            <span className={sla} style={{ width: `${tecnico.slaCumprido}%` }} />
            <em style={{ left: `${META_SLA}%` }} />
          </div>
          <p className={`${styles.sutil} ${styles.pequeno}`}>Meta: {META_SLA}%</p>
        </div>
        <div>
          <div className={styles.linhaMetrica}>
            <h3 className={styles.rotulo}>Avaliação</h3>
            <strong>
              {nota}
              <small> / 5</small>
            </strong>
          </div>
          <div className={styles.pontos} aria-hidden="true">
            {NOTAS.map((n) => (
              <span key={n} style={{ '--preench': Math.max(0, Math.min(1, tecnico.avaliacaoMedia - n + 1)) }} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className={styles.rotulo}>Especialidades</h3>
        <ul className={styles.chips}>
          {tecnico.especialidades.map((especialidade) => (
            <li key={especialidade}>{especialidade}</li>
          ))}
        </ul>
      </section>

      <footer className={styles.rodape}>
        <span>Última atividade: {quando(tecnico.ultimaAtividade)}</span>
        <span>{tecnico.id}</span>
      </footer>

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
