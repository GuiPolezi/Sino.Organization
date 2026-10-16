import styles from '../../Suporte/card/CardQuadro.module.css';
import card from '../../Suporte/card/CardTecnico.module.css';
import Contagem from '../../Suporte/card/Contagem.jsx';
import useFecharComEsc from '../../Suporte/card/useFecharComEsc.js';
import { useEquipe } from '../../Suporte/store.js';
import { useResumo } from '../quadro/useResumo.js';

const primeiroNome = (nome) => nome.split(' ')[0];

function FechadosDoMes({ total, hoje }) {
  return (
    <section className={`${styles.total} ${card.surge}`} style={{ '--ordem': 0 }}>
      <h3 className={card.rotulo}>Chamados fechados no mês</h3>
      <p className={styles.numero}>
        <Contagem valor={total} />
      </p>
      <p className={styles.legendaTotal}>{hoje} hoje · soma de toda a equipe</p>
    </section>
  );
}

// A mesma estrela do painel do suporte.
function Estrela() {
  return (
    <svg className={styles.estrela} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.8l3 6.7 7.2.8-5.4 4.9 1.5 7.2L12 17.7l-6.3 3.7 1.5-7.2L1.8 9.3l7.2-.8z" />
    </svg>
  );
}

// O primeiro do ranking. Clicar abre o card dele.
function DesenvolvedorEmDestaque({ desenvolvedor }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    // A entrada em cascata fica no invólucro, para não disputar o transform com o hover do botão.
    <div className={card.surge} style={{ '--ordem': 1 }}>
      <button type="button" className={styles.destaque} onClick={() => selecionar(desenvolvedor.id)}>
        <span className={styles.destaqueTitulo}>Desenvolvedor em Destaque</span>
        <span className={styles.destaqueLinha}>
          <span className={styles.destaqueQuem}>
            <strong>
              {primeiroNome(desenvolvedor.nome)}
              <Estrela />
            </strong>
            {desenvolvedor.funcao && <small>{desenvolvedor.funcao}</small>}
          </span>
          <span className={styles.destaqueTotal}>
            <strong>
              <Contagem valor={desenvolvedor.fechadosMes} />
            </strong>
            <small>Fechados no Mês</small>
          </span>
        </span>
      </button>
    </div>
  );
}

function RecebidosPorDia({ dias }) {
  const maximo = Math.max(...dias.map((dia) => dia.valor), 1);
  const descricao = dias.map((dia) => `${dia.rotulo}: ${dia.valor}`).join(', ');

  return (
    <section className={card.surge} style={{ '--ordem': 2 }}>
      <h3 className={card.rotulo}>Chamados recebidos por dia</h3>
      <div className={styles.dias} style={{ '--colunas': dias.length }} role="img" aria-label={descricao}>
        {dias.map((dia, i) => (
          <div
            key={i}
            className={dia.hoje ? styles.hoje : undefined}
            style={{ '--fracao': dia.valor / maximo, '--ordem': i }}
          >
            {/* O valor fica colado no topo da barra dele, seja ela alta ou baixa. */}
            <div className={styles.coluna}>
              <b>{dia.valor}</b>
              <i />
            </div>
            <small>{dia.rotulo}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tickets({ tickets }) {
  return (
    <section className={card.surge} style={{ '--ordem': 3 }}>
      <h3 className={card.secao}>Tickets</h3>
      <ul className={styles.tickets}>
        {tickets.map(({ id, nome, comODesenvolvedor }) => (
          <li key={id}>
            <h4>Tickets com {primeiroNome(nome)}</h4>
            <p>
              <strong>
                <Contagem valor={comODesenvolvedor} />
              </strong>
              <small>{comODesenvolvedor === 1 ? 'Chamado com o desenvolvedor' : 'Chamados com o desenvolvedor'}</small>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Todos os desenvolvedores, do que mais fechou no mês para o que menos. Clicar abre o card dele.
function Ranking({ ranking }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    <section className={card.surge} style={{ '--ordem': 4 }}>
      <h3 className={card.secao}>Ranking de Chamados Fechados</h3>
      <ol className={styles.ranking}>
        {ranking.map(({ id, nome, fechadosMes }, i) => (
          <li key={id} style={{ '--ordem': i }}>
            <button type="button" onClick={() => selecionar(id)}>
              <b>{i + 1} -</b>
              <span className={styles.nome}>{nome}</span>
              <i className={styles.seta} aria-hidden="true" />
              <strong>
                <Contagem valor={fechadosMes} />
              </strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Painel "Quadro da equipe" de /desenvolvimento: a visão geral da equipe, no
 * mesmo modelo do painel do suporte (as classes dele são reaproveitadas). Abre
 * pelo quadro da cena e cada seção só aparece quando o dado dela existe. Os
 * números saem dos chamados dos cards (mappers/resumoEquipe.js); hoje são de
 * demonstração.
 */
export default function CardQuadro() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  const resumo = useResumo();
  useFecharComEsc(aberto, fechar);

  if (!aberto) return null;

  const { totalDesenvolvedores, ranking, tickets } = resumo;
  // Sem nenhum chamado fechado no mês, ninguém está em destaque.
  const destaque = ranking[0]?.fechadosMes > 0 ? ranking[0] : null;

  return (
    <aside className={`${card.card} ${styles.quadro}`} aria-label="Quadro da equipe: visão geral">
      <header className={card.topo}>
        <div className={`${card.avatar} ${styles.avatar}`} aria-hidden="true">
          <svg viewBox="0 0 26 26" focusable="false">
            <rect x="3" y="3" width="20" height="14" rx="2" />
            <path d="M7 8h5M7 12h8M9 17l-3 6M17 17l3 6M13 17v4" />
          </svg>
        </div>
        <div className={card.titulo}>
          <h2>Quadro da equipe</h2>
          <p>Visão geral da equipe de desenvolvimento</p>
          <p className={card.sutil}>
            {totalDesenvolvedores} {totalDesenvolvedores === 1 ? 'desenvolvedor' : 'desenvolvedores'}
          </p>
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {resumo.fechadosMes !== null && <FechadosDoMes total={resumo.fechadosMes} hoje={resumo.fechadosHoje} />}
      {destaque && <DesenvolvedorEmDestaque desenvolvedor={destaque} />}
      {resumo.dias.length > 0 && <RecebidosPorDia dias={resumo.dias} />}
      {tickets.length > 0 && <Tickets tickets={tickets} />}
      {ranking.length > 0 && <Ranking ranking={ranking} />}

      {resumo.ficticio && (
        <footer className={`${card.rodape} ${card.surge}`} style={{ '--ordem': 5 }}>
          <span>Dados de demonstração</span>
        </footer>
      )}
    </aside>
  );
}
