import Contagem from '../../Suporte/card/Contagem.jsx';
import card from '../../Suporte/card/CardTecnico.module.css';
import quadro from '../../Suporte/card/CardQuadro.module.css';
import EstadoCarregamento from '../../Suporte/card/EstadoCarregamento.jsx';
import { rotuloAtualizacao } from '../../Suporte/card/rotuloAtualizacao.js';
import useFecharComEsc from '../../Suporte/card/useFecharComEsc.js';
import { useEquipe } from '../../Suporte/store.js';
import { rotuloParcial } from '../resumo.js';
import { useCompilacao } from '../store.js';
import { useResumo } from '../useResumo.js';
import styles from './CardQuadroCompilacao.module.css';
import Destaques from './Destaques.jsx';
import Numero from './Numero.jsx';

const primeiroNome = (nome) => nome.split(' ')[0];

function Estrela() {
  return (
    <svg className={styles.estrela} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.8l3 6.7 7.2.8-5.4 4.9 1.5 7.2L12 17.7l-6.3 3.7 1.5-7.2L1.8 9.3l7.2-.8z" />
    </svg>
  );
}

// Anel com a parte do mês da equipe que veio de quem está em destaque.
function Anel({ parte }) {
  const cheio = Math.min(Math.max(parte, 0), 100);
  return (
    <span className={styles.anel} style={{ '--parte': cheio }} aria-hidden="true">
      <svg viewBox="0 0 36 36" focusable="false">
        <circle cx="18" cy="18" r="15" pathLength="100" />
        <circle cx="18" cy="18" r="15" pathLength="100" />
      </svg>
      <small>{parte}%</small>
    </span>
  );
}

// Quem mais compilou no mês: nome, total e a parte do mês da equipe. Clicar abre o card da pessoa.
function EmDestaque({ pessoa, totalDoMes }) {
  const selecionar = useEquipe((s) => s.selecionar);
  const nome = primeiroNome(pessoa.nome);
  const parte = totalDoMes > 0 ? Math.round((pessoa.normasMes / totalDoMes) * 100) : 0;
  return (
    <button
      type="button"
      className={styles.destaque}
      onClick={() => selecionar(pessoa.id)}
      aria-label={`Destaque: ${nome}, ${pessoa.normasMes} normas no mês, ${parte}% das normas da equipe. Abrir o card.`}
    >
      <span className={styles.destaqueTexto}>
        <span>
          <b>Destaque:</b> {nome}
          <Estrela />
        </span>
        <span>
          <b>Normas no Mês:</b> <Contagem valor={pessoa.normasMes} />
        </span>
      </span>
      <Anel parte={parte} />
    </button>
  );
}

// Um período do quadro: a soma e, se algum card ficou fora, o "parcial".
function Periodo({ rotulo, valor, semDado, className }) {
  const parcial = rotuloParcial(semDado);
  return (
    <div className={className}>
      <dt>{rotulo}</dt>
      <dd>
        <Numero valor={valor} mais />
      </dd>
      {parcial && <dd className={styles.parcial}>{parcial}</dd>}
    </div>
  );
}

// O título grande, o destaque e os totais da equipe (soma dos cards) no mês, na semana e no dia.
function Totais({ resumo, destaque }) {
  return (
    <section className={`${styles.totais} ${card.surge}`} style={{ '--ordem': 0 }}>
      <div className={styles.manchete}>
        <h3>Normas Compiladas</h3>
        {destaque && <EmDestaque pessoa={destaque} totalDoMes={resumo.normasMes} />}
      </div>
      <dl className={styles.periodos}>
        <Periodo className={styles.mes} rotulo="Mês" valor={resumo.normasMes} semDado={resumo.parcial.mes} />
        <Periodo rotulo="Semana" valor={resumo.normasSemana} semDado={resumo.parcial.semana} />
        <Periodo rotulo="Dia" valor={resumo.normasHoje} semDado={resumo.parcial.hoje} />
      </dl>
    </section>
  );
}

function PorTipo({ tipos }) {
  return (
    <section className={card.surge} style={{ '--ordem': 1 }}>
      <h3 className={styles.secao}>Normas por Tipo</h3>
      <ul className={styles.tipos}>
        {tipos.map(({ chave, rotulo, valor }) => (
          <li key={chave}>
            <strong>
              <Numero valor={valor} />
            </strong>
            <small>{rotulo}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Quantas normas aguardam compilação na fila de cada pessoa, com a fonte embaixo
// (o projeto, ou o déficit da planilha). Fila dividida aparece marcada nas duas pessoas.
function Filas({ ranking }) {
  const nomeDe = (id) => primeiroNome(ranking.find((p) => p.id === id)?.nome ?? id);
  return (
    <section className={card.surge} style={{ '--ordem': 2 }}>
      <h3 className={styles.secao}>Fila</h3>
      <ul className={`${quadro.tickets} ${styles.fila}`}>
        {ranking.map(({ id, nome, emFila, legendaFila, divididaCom }) => (
          <li key={id}>
            <h4>Fila de {primeiroNome(nome)}</h4>
            <p>
              <strong>
                <Numero valor={emFila} />
              </strong>
              <small>{emFila === 1 ? 'Norma aguardando' : 'Normas aguardando'}</small>
            </p>
            <span className={styles.legendaFila}>
              {legendaFila}
              {divididaCom.length > 0 && ` · dividida com ${divididaCom.map(nomeDe).join(' e ')}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/*
 * Painel "Quadro da equipe" de /compilacao: abre pela estátua de Têmis. Os totais
 * da equipe no mês, na semana e no dia, quem está em destaque, as normas por tipo,
 * a fila de cada um e os destaques (quem ficou em primeiro em cada conta). Tudo é
 * a soma dos cards (resumo.js), com os números do servidor (/api/compilacao).
 */
export default function CardQuadroCompilacao() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  const tecnicos = useEquipe((s) => s.tecnicos);
  const resumo = useResumo();
  const geradoEm = useCompilacao((s) => s.geradoEm);
  useFecharComEsc(aberto, fechar);

  if (!aberto) return null;

  const { totalCompiladores, ranking } = resumo;
  const destaque = ranking[0]?.normasMes > 0 ? ranking[0] : null;

  return (
    <aside className={`${card.card} ${quadro.quadro} ${styles.painel}`} aria-label="Quadro da equipe: visão geral">
      <header className={card.topo}>
        <div className={`${card.avatar} ${quadro.avatar}`} aria-hidden="true">
          {/* Uma folha com linhas escritas: o quadro geral que a estátua segura. */}
          <svg viewBox="0 0 26 26" focusable="false">
            <path d="M7 3h9l4 4v16H7z" />
            <path d="M16 3v4h4M10 12h7M10 16h7M10 20h4" />
          </svg>
        </div>
        <div className={card.titulo}>
          <h2>Quadro da equipe</h2>
          <p>Visão geral da compilação</p>
          <p className={card.sutil}>
            {totalCompiladores} {totalCompiladores === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {!resumo.carregado && <EstadoCarregamento dados="números da compilação" />}
      {resumo.carregado && (
        <>
          <Totais resumo={resumo} destaque={destaque} />
          <PorTipo tipos={resumo.porTipo} />
          {ranking.length > 0 && <Filas ranking={ranking} />}
          {ranking.length > 0 && (
            <section className={card.surge} style={{ '--ordem': 3 }}>
              <h3 className={styles.secao}>Destaques</h3>
              <Destaques ranking={ranking} tecnicos={tecnicos} />
            </section>
          )}
          {geradoEm && (
            <footer className={`${card.rodape} ${card.surge}`} style={{ '--ordem': 4 }}>
              <span>{rotuloAtualizacao(geradoEm)}</span>
            </footer>
          )}
        </>
      )}
    </aside>
  );
}
