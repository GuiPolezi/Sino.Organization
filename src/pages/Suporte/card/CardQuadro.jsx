import { useEffect } from 'react';
import { aparenciaDe } from '../boneco/aparencia.js';
import { useResumo } from '../quadro/useResumo.js';
import { useEquipe } from '../store.js';
import card from './CardTecnico.module.css';
import styles from './CardQuadro.module.css';

const META_SLA = 95;
const NOTAS = [1, 2, 3, 4, 5];

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});
const formatoNumero = new Intl.NumberFormat('pt-BR');
const decimal = (valor) => valor.toFixed(1).replace('.', ',');

const classeSla = (sla) => {
  if (sla >= META_SLA) return card.ok;
  return sla >= 90 ? card.aviso : card.critico;
};

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

function TotalDoMes({ chamados, atendimentosHoje }) {
  return (
    <section className={styles.total}>
      <h3 className={card.rotulo}>Atendimentos concluídos no mês</h3>
      <p className={styles.numero}>{formatoNumero.format(chamados.concluidasMes)}</p>
      <p className={`${card.sutil} ${styles.legendaTotal}`}>
        {atendimentosHoje !== null && `${atendimentosHoje} hoje · `}soma de toda a equipe
      </p>
    </section>
  );
}

function AtendimentosPorDia({ dias }) {
  const maximo = Math.max(...dias.map((dia) => dia.valor), 1);
  const descricao = dias.map((dia) => `${dia.rotulo}: ${dia.valor}`).join(', ');

  return (
    <section>
      <h3 className={card.rotulo}>Atendimentos por dia</h3>
      <div
        className={styles.dias}
        style={{ '--colunas': dias.length }}
        role="img"
        aria-label={descricao}
      >
        {dias.map((dia, i) => (
          <div key={i} className={dia.hoje ? styles.hoje : undefined}>
            <span className={styles.valor}>{dia.valor}</span>
            <span className={styles.coluna} style={{ height: `${(dia.valor / maximo) * 100}%` }} />
            <span className={styles.dia}>{dia.rotulo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChamadosDaEquipe({ chamados, primeiraResposta }) {
  return (
    <section>
      <h3 className={card.rotulo}>Chamados da equipe</h3>
      <dl className={card.contadores}>
        <div>
          <dt>Abertos</dt>
          <dd>{chamados.abertos}</dd>
        </div>
        <div>
          <dt>Em andamento</dt>
          <dd>{chamados.emAndamento}</dd>
        </div>
        <div className={chamados.atrasadas > 0 ? card.alerta : undefined}>
          <dt>Atrasados</dt>
          <dd>{chamados.atrasadas}</dd>
        </div>
        {primeiraResposta !== null && (
          <div>
            <dt>1ª resposta (média)</dt>
            <dd>
              {primeiraResposta}
              <small className={styles.unidade}> min</small>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function EquipeAgora({ status, aoVivo }) {
  // "Em atendimento" só existe quando os técnicos trazem o status ao vivo.
  const grupos = [
    { classe: card.ok, rotulo: 'Disponíveis', total: status.disponivel },
    aoVivo && { classe: card.aviso, rotulo: 'Em atendimento', total: status.em_atendimento },
    { classe: card.neutro, rotulo: 'Ausentes', total: status.ausente },
  ].filter(Boolean);
  const descricao = grupos.map(({ rotulo, total }) => `${rotulo}: ${total}`).join(', ');

  return (
    <section>
      <h3 className={card.rotulo}>Equipe agora</h3>
      <div className={styles.distribuicao} role="img" aria-label={descricao}>
        {grupos.map(({ classe, rotulo, total }) => (
          <span key={rotulo} className={classe} style={{ flexGrow: total }} />
        ))}
      </div>
      <ul className={styles.legenda}>
        {grupos.map(({ classe, rotulo, total }) => (
          <li key={rotulo} className={classe}>
            <i />
            <span>
              {rotulo} <strong>{total}</strong>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SlaMedio({ valor, primeiroContato }) {
  const classe = classeSla(valor);

  return (
    <div>
      <div className={card.linhaMetrica}>
        <h3 className={card.rotulo}>SLA médio</h3>
        <strong className={classe}>{valor}%</strong>
      </div>
      <div className={card.barra} role="img" aria-label={`SLA médio de ${valor} por cento`}>
        <span className={classe} style={{ width: `${Math.min(valor, 100)}%` }} />
        <em style={{ left: `${META_SLA}%` }} />
      </div>
      <p className={`${card.sutil} ${card.pequeno}`}>
        Meta: {META_SLA}%
        {primeiroContato !== null && ` · ${primeiroContato}% resolvidos no 1º contato`}
      </p>
    </div>
  );
}

function AvaliacaoMedia({ valor, satisfacao }) {
  return (
    <div>
      <div className={card.linhaMetrica}>
        <h3 className={card.rotulo}>Avaliação média</h3>
        <strong>
          {decimal(valor)}
          <small> / 5</small>
        </strong>
      </div>
      <div className={card.pontos} aria-hidden="true">
        {NOTAS.map((n) => (
          <span key={n} style={{ '--preench': Math.max(0, Math.min(1, valor - n + 1)) }} />
        ))}
      </div>
      {satisfacao !== null && (
        <p className={`${card.sutil} ${card.pequeno}`}>{satisfacao}% dos clientes satisfeitos</p>
      )}
    </div>
  );
}

// Clicar num destaque abre o card daquele técnico.
function DestaquesDoMes({ destaques }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    <section>
      <h3 className={card.rotulo}>Destaques do mês</h3>
      <ol className={styles.ranking}>
        {destaques.map(({ id, nome, concluidasMes }, i) => (
          <li key={id}>
            <button type="button" onClick={() => selecionar(id)}>
              <span className={styles.posicao}>{i + 1}</span>
              <i style={{ background: aparenciaDe(id).camisa }} />
              <span className={styles.nome}>{nome}</span>
              <span className={styles.quantidade}>
                {concluidasMes} <small>concluídos</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Painel "Quadro da equipe": a visão geral, com o mesmo visual do card do
 * técnico (as classes dele são reaproveitadas). Abre pelo quadro da cena e,
 * como no card, cada seção só aparece quando o dado dela existe.
 */
export default function CardQuadro() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  const resumo = useResumo();
  useFecharComEsc(aberto, fechar);

  if (!aberto) return null;

  const { chamados, slaMedio, avaliacaoMedia, status, totalTecnicos } = resumo;
  const temMetricas = slaMedio !== null || avaliacaoMedia !== null;
  const temRodape = resumo.atualizadoEm !== null || resumo.ficticio;

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

      {resumo.temStatusAoVivo && (
        <span className={`${card.pill} ${card.ok}`}>
          <i />
          Ao vivo · {status.em_atendimento} em atendimento agora
        </span>
      )}

      {chamados && <TotalDoMes chamados={chamados} atendimentosHoje={resumo.atendimentosHoje} />}
      {resumo.dias.length > 0 && <AtendimentosPorDia dias={resumo.dias} />}
      {chamados && (
        <ChamadosDaEquipe chamados={chamados} primeiraResposta={resumo.tempoMedioPrimeiraResposta} />
      )}
      {totalTecnicos > 0 && <EquipeAgora status={status} aoVivo={resumo.temStatusAoVivo} />}

      {temMetricas && (
        <section className={card.metricas}>
          {slaMedio !== null && <SlaMedio valor={slaMedio} primeiroContato={resumo.resolvidosPrimeiroContato} />}
          {avaliacaoMedia !== null && (
            <AvaliacaoMedia valor={avaliacaoMedia} satisfacao={resumo.satisfacaoClientes} />
          )}
        </section>
      )}

      {resumo.destaques.length > 0 && <DestaquesDoMes destaques={resumo.destaques} />}

      {temRodape && (
        <footer className={card.rodape}>
          {resumo.atualizadoEm !== null && (
            <span>Atualizado às {formatoHora.format(new Date(resumo.atualizadoEm))}</span>
          )}
          {resumo.ficticio && <span>Dados de demonstração</span>}
        </footer>
      )}
    </aside>
  );
}
