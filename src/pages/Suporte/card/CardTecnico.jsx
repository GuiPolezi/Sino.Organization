import { useEffect } from 'react';
import { aparenciaDe } from '../boneco/aparencia.js';
import { hojeEmBrasilia, totaisDeAtendimentos } from '../mappers/atendimentos.js';
import { useEquipe } from '../store.js';
import Contagem from './Contagem.jsx';
import GraficoAtendimentos from './GraficoAtendimentos.jsx';
import styles from './CardTecnico.module.css';

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

function Atendimentos({ totais, tempoMedioMin }) {
  return (
    <section className={styles.surge} style={{ '--ordem': 1 }}>
      <h3 className={styles.secao}>Atendimentos</h3>
      <dl className={styles.blocos}>
        <div>
          <dt>Hoje</dt>
          <dd>
            <Contagem valor={totais.hoje} />
          </dd>
        </div>
        <div>
          <dt>Semana</dt>
          <dd>
            <Contagem valor={totais.semana} />
          </dd>
        </div>
        <div>
          <dt>Mês</dt>
          <dd>
            <Contagem valor={totais.mes} />
          </dd>
        </div>
        {tempoMedioMin !== undefined && (
          <div>
            <dt>Tempo Médio Diário de Atendimentos</dt>
            <dd>
              <Contagem valor={tempoMedioMin} />
              <small>Min</small>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Tickets({ atribuidos }) {
  return (
    <section className={styles.surge} style={{ '--ordem': 2 }}>
      <h3 className={styles.secao}>Tickets</h3>
      <p className={styles.tickets}>
        <strong>
          <Contagem valor={atribuidos} />
        </strong>
        <span>{atribuidos === 1 ? 'Chamado atribuído ao técnico' : 'Chamados atribuídos ao técnico'}</span>
      </p>
    </section>
  );
}

/*
 * Card com os dados do técnico selecionado. Overlay HTML fora do <Canvas>:
 * lateral no desktop e bottom sheet no mobile. As seções de atendimentos só
 * aparecem para quem tem esses dados (api/atendimentosTecnico.js); hoje são
 * números de demonstração.
 */
export default function CardTecnico() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const atendimentos = useEquipe((s) => s.atendimentos[s.selecionado]);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  useAtalhos();

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const tecnico = tecnicos[indice];
  if (!tecnico) return null;

  const hoje = hojeEmBrasilia();

  return (
    // A key refaz as animações de entrada ao trocar de técnico.
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
        <span className={`${styles.pill} ${styles.neutro} ${styles.surge}`} style={{ '--ordem': 0 }}>
          <i />
          Ausente
        </span>
      )}

      {atendimentos && (
        <>
          <Atendimentos
            totais={totaisDeAtendimentos(atendimentos.porDia, hoje)}
            tempoMedioMin={atendimentos.tempoMedioMin}
          />
          {atendimentos.chamadosAtribuidos !== undefined && <Tickets atribuidos={atendimentos.chamadosAtribuidos} />}
          <div className={styles.surge} style={{ '--ordem': 3 }}>
            <GraficoAtendimentos porDia={atendimentos.porDia} hoje={hoje} />
          </div>
        </>
      )}

      <nav className={`${styles.nav} ${styles.surge}`} style={{ '--ordem': 4 }} aria-label="Navegar entre técnicos">
        <button type="button" aria-label="Técnico anterior" onClick={() => navegar(-1)}>
          ←
        </button>
        <span>
          {indice + 1} de {tecnicos.length}
          {atendimentos?.ficticio && <small>Dados de demonstração</small>}
        </span>
        <button type="button" aria-label="Próximo técnico" onClick={() => navegar(1)}>
          →
        </button>
      </nav>
    </aside>
  );
}
