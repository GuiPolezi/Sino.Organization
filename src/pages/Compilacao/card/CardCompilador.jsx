import { aparenciaDe } from '../../Suporte/boneco/aparencia.js';
import Contagem from '../../Suporte/card/Contagem.jsx';
import GraficoAtendimentos from '../../Suporte/card/GraficoAtendimentos.jsx';
import styles from '../../Suporte/card/CardTecnico.module.css';
import useAtalhos from '../../Suporte/card/useAtalhos.js';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { producaoDe } from '../resumo.js';

function Normas({ totais }) {
  return (
    <section className={styles.surge} style={{ '--ordem': 1 }}>
      <h3 className={styles.secao}>Normas compiladas</h3>
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
        <div className={styles.largo}>
          <dt>Mês</dt>
          <dd>
            <Contagem valor={totais.mes} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Fila({ emFila }) {
  return (
    <section className={styles.surge} style={{ '--ordem': 2 }}>
      <h3 className={styles.secao}>Fila</h3>
      <p className={styles.tickets}>
        <strong>
          <Contagem valor={emFila} />
        </strong>
        <span>{emFila === 1 ? 'Norma aguardando compilação' : 'Normas aguardando compilação'}</span>
      </p>
    </section>
  );
}

/*
 * Card de quem foi selecionado em /compilacao: o card do técnico do suporte,
 * com a produção de normas no lugar dos atendimentos. Os números ainda são os
 * escritos à mão em dados.js.
 */
export default function CardCompilador() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  useAtalhos();

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const pessoa = tecnicos[indice];
  if (!pessoa) return null;

  const hoje = hojeEmBrasilia();
  const { porDia, totais, emFila } = producaoDe(pessoa.id, hoje);

  return (
    // A key refaz as animações de entrada ao trocar de pessoa.
    <aside key={pessoa.id} className={styles.card} aria-label={`Informações de ${pessoa.nome}`}>
      <header className={styles.topo}>
        <div className={styles.avatar} style={{ '--cor-avatar': aparenciaDe(pessoa.id).camisa }} aria-hidden="true">
          {pessoa.avatarIniciais}
        </div>
        <div className={styles.titulo}>
          <h2>{pessoa.nome}</h2>
          {pessoa.funcao && <p>{pessoa.funcao}</p>}
        </div>
        <button type="button" className={styles.fechar} aria-label="Fechar" onClick={() => selecionar(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <Normas totais={totais} />
      <Fila emFila={emFila} />
      <div className={styles.surge} style={{ '--ordem': 3 }}>
        <GraficoAtendimentos porDia={porDia} hoje={hoje} assunto="Normas" />
      </div>

      <nav className={`${styles.nav} ${styles.surge}`} style={{ '--ordem': 4 }} aria-label="Navegar pela equipe">
        <button type="button" aria-label="Anterior" onClick={() => navegar(-1)}>
          ←
        </button>
        <span>
          {indice + 1} de {tecnicos.length}
        </span>
        <button type="button" aria-label="Próximo" onClick={() => navegar(1)}>
          →
        </button>
      </nav>
    </aside>
  );
}
