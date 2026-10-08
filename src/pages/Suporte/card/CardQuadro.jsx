import { useEffect } from 'react';
import { useResumo } from '../quadro/useResumo.js';
import { useEquipe } from '../store.js';
import Contagem from './Contagem.jsx';
import card from './CardTecnico.module.css';
import styles from './CardQuadro.module.css';

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});
const primeiroNome = (nome) => nome.split(' ')[0];

// Esc fecha o painel enquanto ele está aberto.
function useFecharComEsc(aberto, fechar) {
  useEffect(() => {
    if (!aberto) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') fechar();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aberto, fechar]);
}

function TotalDoMes({ total, hoje }) {
  return (
    <section className={`${styles.total} ${card.surge}`} style={{ '--ordem': 0 }}>
      <h3 className={card.rotulo}>Atendimentos concluídos no mês</h3>
      <p className={styles.numero}>
        <Contagem valor={total} />
      </p>
      <p className={styles.legendaTotal}>{hoje !== null && `${hoje} hoje · `}soma de toda a equipe</p>
    </section>
  );
}

function Estrela() {
  return (
    <svg className={styles.estrela} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.8l3 6.7 7.2.8-5.4 4.9 1.5 7.2L12 17.7l-6.3 3.7 1.5-7.2L1.8 9.3l7.2-.8z" />
    </svg>
  );
}

// O primeiro do ranking. Clicar abre o card dele.
function TecnicoEmDestaque({ tecnico }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    // A entrada em cascata fica no invólucro, para não disputar o transform com o hover do botão.
    <div className={card.surge} style={{ '--ordem': 1 }}>
      <button type="button" className={styles.destaque} onClick={() => selecionar(tecnico.id)}>
        <span className={styles.destaqueTitulo}>Técnico em Destaque</span>
        <span className={styles.destaqueLinha}>
          <span className={styles.destaqueQuem}>
            <strong>
              {primeiroNome(tecnico.nome)}
              <Estrela />
            </strong>
            {tecnico.funcao && <small>{tecnico.funcao}</small>}
          </span>
          <span className={styles.destaqueTotal}>
            <strong>
              <Contagem valor={tecnico.atendimentosMes} />
            </strong>
            <small>Atendimentos no Mês</small>
          </span>
        </span>
      </button>
    </div>
  );
}

function AtendimentosPorDia({ dias }) {
  const maximo = Math.max(...dias.map((dia) => dia.valor), 1);
  const descricao = dias.map((dia) => `${dia.rotulo}: ${dia.valor}`).join(', ');

  return (
    <section className={card.surge} style={{ '--ordem': 2 }}>
      <h3 className={card.rotulo}>Atendimentos por dia</h3>
      <div className={styles.dias} style={{ '--colunas': dias.length }} role="img" aria-label={descricao}>
        {dias.map((dia, i) => (
          <div
            key={i}
            className={dia.hoje ? styles.hoje : undefined}
            style={{ '--altura': `${(dia.valor / maximo) * 100}%`, '--ordem': i }}
          >
            <b>{dia.valor}</b>
            <i />
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
        {tickets.map(({ id, nome, atribuidos }) => (
          <li key={id}>
            <h4>Tickets com {primeiroNome(nome)}</h4>
            <p>
              <strong>
                <Contagem valor={atribuidos} />
              </strong>
              <small>{atribuidos === 1 ? 'Chamado atribuído ao técnico' : 'Chamados atribuídos ao técnico'}</small>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Todos os técnicos, do que mais atendeu no mês para o que menos. Clicar abre o card dele.
function Ranking({ ranking }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    <section className={card.surge} style={{ '--ordem': 4 }}>
      <h3 className={card.secao}>Ranking de Atendimentos</h3>
      <ol className={styles.ranking}>
        {ranking.map(({ id, nome, atendimentosMes }, i) => (
          <li key={id} style={{ '--ordem': i }}>
            <button type="button" onClick={() => selecionar(id)}>
              <b>{i + 1} -</b>
              <span className={styles.nome}>{nome}</span>
              <i className={styles.seta} aria-hidden="true" />
              <strong>
                <Contagem valor={atendimentosMes} />
              </strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Painel "Quadro da equipe": a visão geral, com a moldura e o cabeçalho do card
 * do técnico (as classes dele são reaproveitadas). Abre pelo quadro da cena e,
 * como no card, cada seção só aparece quando o dado dela existe. Os números
 * saem dos atendimentos de cada técnico (mappers/resumoEquipe.js); hoje são de
 * demonstração.
 */
export default function CardQuadro() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  const resumo = useResumo();
  useFecharComEsc(aberto, fechar);

  if (!aberto) return null;

  const { totalTecnicos, ranking, tickets } = resumo;
  const temRodape = resumo.atualizadoEm !== null || resumo.ficticio;
  // Sem nenhum atendimento no mês, ninguém está em destaque.
  const destaque = ranking[0]?.atendimentosMes > 0 ? ranking[0] : null;

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
          <p>Visão geral da equipe técnica</p>
          <p className={card.sutil}>
            {totalTecnicos} {totalTecnicos === 1 ? 'técnico' : 'técnicos'}
          </p>
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {resumo.atendimentosMes !== null && <TotalDoMes total={resumo.atendimentosMes} hoje={resumo.atendimentosHoje} />}
      {destaque && <TecnicoEmDestaque tecnico={destaque} />}
      {resumo.dias.length > 0 && <AtendimentosPorDia dias={resumo.dias} />}
      {tickets.length > 0 && <Tickets tickets={tickets} />}
      {ranking.length > 0 && <Ranking ranking={ranking} />}

      {temRodape && (
        <footer className={`${card.rodape} ${card.surge}`} style={{ '--ordem': 5 }}>
          {resumo.atualizadoEm !== null && (
            <span>Atualizado às {formatoHora.format(new Date(resumo.atualizadoEm))}</span>
          )}
          {resumo.ficticio && <span>Dados de demonstração</span>}
        </footer>
      )}
    </aside>
  );
}
