import GraficoBarras from '../../Desenvolvimento/card/GraficoBarras.jsx';
import Contagem from '../../Suporte/card/Contagem.jsx';
import card from '../../Suporte/card/CardTecnico.module.css';
import quadro from '../../Suporte/card/CardQuadro.module.css';
import useFecharComEsc from '../../Suporte/card/useFecharComEsc.js';
import { useEquipe } from '../../Suporte/store.js';
import { useResumo } from '../useResumo.js';
import styles from './CardQuadroCompilacao.module.css';

const primeiroNome = (nome) => nome.split(' ')[0];
const formato = new Intl.NumberFormat('pt-BR');

// O total do mês e a barra da meta.
function TotalDoMes({ resumo }) {
  const cumprida = Math.min(resumo.metaCumprida, 100);
  return (
    <section className={`${quadro.total} ${card.surge}`} style={{ '--ordem': 0 }}>
      <h3 className={card.rotulo}>Normas compiladas no mês</h3>
      <p className={quadro.numero}>
        <Contagem valor={resumo.normasMes} />
      </p>
      <p className={quadro.legendaTotal}>
        {resumo.normasHoje} hoje · {resumo.normasSemana} na semana · soma de toda a equipe
      </p>
      <div
        className={styles.meta}
        role="meter"
        aria-label="Meta do mês"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={cumprida}
        style={{ '--cumprida': `${cumprida}%` }}
      >
        <i />
      </div>
      <p className={styles.legendaMeta}>
        <span>Meta: {formato.format(resumo.meta)} normas</span>
        <strong>{resumo.metaCumprida}%</strong>
      </p>
    </section>
  );
}

function Estrela() {
  return (
    <svg className={quadro.estrela} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.8l3 6.7 7.2.8-5.4 4.9 1.5 7.2L12 17.7l-6.3 3.7 1.5-7.2L1.8 9.3l7.2-.8z" />
    </svg>
  );
}

// Quem mais compilou no mês. Clicar abre o card da pessoa.
function EmDestaque({ pessoa }) {
  const selecionar = useEquipe((s) => s.selecionar);
  return (
    <div className={card.surge} style={{ '--ordem': 1 }}>
      <button type="button" className={quadro.destaque} onClick={() => selecionar(pessoa.id)}>
        <span className={quadro.destaqueTitulo}>Destaque da Compilação</span>
        <span className={quadro.destaqueLinha}>
          <span className={quadro.destaqueQuem}>
            <strong>
              {primeiroNome(pessoa.nome)}
              <Estrela />
            </strong>
            {pessoa.funcao && <small>{pessoa.funcao}</small>}
          </span>
          <span className={quadro.destaqueTotal}>
            <strong>
              <Contagem valor={pessoa.normasMes} />
            </strong>
            <small>Normas no Mês</small>
          </span>
        </span>
      </button>
    </div>
  );
}

function NormasPorDia({ dias }) {
  const maximo = Math.max(...dias.map((dia) => dia.valor), 1);
  const descricao = dias.map((dia) => `${dia.rotulo}: ${dia.valor}`).join(', ');
  return (
    <section className={card.surge} style={{ '--ordem': 2 }}>
      <h3 className={card.rotulo}>Normas por dia</h3>
      <div className={quadro.dias} style={{ '--colunas': dias.length }} role="img" aria-label={descricao}>
        {dias.map((dia, i) => (
          <div key={i} className={dia.hoje ? quadro.hoje : undefined} style={{ '--fracao': dia.valor / maximo, '--ordem': i }}>
            <div className={quadro.coluna}>
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

// Quantas normas estão na fila de cada pessoa, um bloco por pessoa.
function Filas({ ranking }) {
  return (
    <section className={card.surge} style={{ '--ordem': 4 }}>
      <h3 className={card.secao}>Fila</h3>
      <ul className={quadro.tickets}>
        {ranking.map(({ id, nome, emFila }) => (
          <li key={id}>
            <h4>Fila de {primeiroNome(nome)}</h4>
            <p>
              <strong>
                <Contagem valor={emFila} />
              </strong>
              <small>{emFila === 1 ? 'Norma aguardando' : 'Normas aguardando'}</small>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ranking({ ranking }) {
  const selecionar = useEquipe((s) => s.selecionar);
  return (
    <section className={card.surge} style={{ '--ordem': 5 }}>
      <h3 className={card.secao}>Ranking de Normas Compiladas</h3>
      <ol className={quadro.ranking}>
        {ranking.map(({ id, nome, normasMes }, i) => (
          <li key={id} style={{ '--ordem': i }}>
            <button type="button" onClick={() => selecionar(id)}>
              <b>{i + 1} -</b>
              <span className={quadro.nome}>{nome}</span>
              <i className={quadro.seta} aria-hidden="true" />
              <strong>
                <Contagem valor={normasMes} />
              </strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Painel "Quadro da equipe" de /compilacao: abre pela estátua de Têmis. Mesma
 * moldura e seções do painel do suporte, com a produção de normas: o total e a
 * meta do mês, quem está em destaque, os últimos dias, os tipos de norma, a fila
 * de cada um e o ranking. Os números ainda são os escritos à mão (dados.js).
 */
export default function CardQuadroCompilacao() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  const resumo = useResumo();
  useFecharComEsc(aberto, fechar);

  if (!aberto) return null;

  const { totalCompiladores, ranking } = resumo;
  const destaque = ranking[0]?.normasMes > 0 ? ranking[0] : null;

  return (
    <aside className={`${card.card} ${quadro.quadro}`} aria-label="Quadro da equipe: visão geral">
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

      <TotalDoMes resumo={resumo} />
      {destaque && <EmDestaque pessoa={destaque} />}
      {resumo.dias.length > 0 && <NormasPorDia dias={resumo.dias} />}
      <section className={card.surge} style={{ '--ordem': 3 }}>
        <GraficoBarras titulo="Normas por tipo" cabecalho="Tipo de norma" itens={resumo.porTipo} unidade="Normas" />
      </section>
      {ranking.length > 0 && <Filas ranking={ranking} />}
      {ranking.length > 0 && <Ranking ranking={ranking} />}

      <footer className={`${card.rodape} ${card.surge}`} style={{ '--ordem': 6 }}>
        <span>Números provisórios, preenchidos à mão</span>
      </footer>
    </aside>
  );
}
