import { useState } from 'react';
import { escalaY, semanaDoGrafico, semanasAnteriores } from '../mappers/atendimentos.js';
import card from './CardTecnico.module.css';
import styles from './GraficoAtendimentos.module.css';

const porcento = (valor, topo) => `${(valor / topo) * 100}%`;

function Seta({ sentido, ...botao }) {
  return (
    <button type="button" {...botao}>
      <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <path d={sentido === 'voltar' ? 'M7 1L2 5l5 4z' : 'M3 1l5 4-5 4z'} />
      </svg>
    </button>
  );
}

// Troca a semana do gráfico: volta até a do registro mais antigo e não passa da atual.
function SeletorDeSemana({ semana, recuo, limite, onMudar }) {
  const podeVoltar = recuo < limite;
  const podeAvancar = recuo > 0;
  const voltar = () => podeVoltar && onMudar(recuo + 1);
  const avancar = () => podeAvancar && onMudar(recuo - 1);

  // Com o foco no seletor, ← e → trocam a semana, e não o técnico (atalho global do card).
  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.stopPropagation();
    if (event.key === 'ArrowLeft') voltar();
    else avancar();
  };

  return (
    <div className={styles.seletor} onKeyDown={onKeyDown}>
      <Seta sentido="voltar" aria-label="Semana anterior" aria-disabled={!podeVoltar} onClick={voltar} />
      {/* A key refaz a animação do rótulo a cada troca de semana. */}
      <p key={recuo} className={styles.semana} aria-live="polite">
        <strong>Semana {semana.numero}</strong>
        <span>{semana.periodo}</span>
      </p>
      <Seta sentido="avancar" aria-label="Próxima semana" aria-disabled={!podeAvancar} onClick={avancar} />
    </div>
  );
}

/*
 * Gráfico de barras dos atendimentos de uma semana (domingo a sábado). O eixo Y
 * acompanha os dados (escalaY): cresce quando os atendimentos crescem. As barras
 * são as mesmas a cada troca de semana, então a altura delas desliza até o valor novo.
 */
export default function GraficoAtendimentos({ porDia, hoje }) {
  const [recuo, setRecuo] = useState(0);
  const semana = semanaDoGrafico(porDia, hoje, recuo);
  const { topo, marcas } = escalaY(Math.max(...semana.dias.map((dia) => dia.total)));
  const descricao = `Semana ${semana.numero}, ${semana.periodo}. ${semana.dias
    .map((dia) => `${dia.rotulo}: ${dia.total}`)
    .join(', ')}`;

  return (
    <section>
      <div className={styles.cabecalho}>
        <h3 className={card.secao}>Gráfico de Atendimentos</h3>
        <SeletorDeSemana semana={semana} recuo={recuo} limite={semanasAnteriores(porDia, hoje)} onMudar={setRecuo} />
      </div>

      <div className={styles.grafico} role="img" aria-label={descricao}>
        <span className={styles.eixo}>Atendimentos</span>

        <div className={styles.marcas}>
          {marcas.map((marca) => (
            <span key={marca} style={{ bottom: porcento(marca, topo) }}>
              {marca}
            </span>
          ))}
        </div>

        <div className={styles.area}>
          {marcas.slice(1).map((marca) => (
            <i key={marca} style={{ bottom: porcento(marca, topo) }} />
          ))}
          <div className={styles.colunas}>
            {semana.dias.map((dia, i) => (
              <div key={i} style={{ '--altura': porcento(dia.total, topo), '--ordem': i }}>
                <span className={dia.total > 0 ? styles.valor : `${styles.valor} ${styles.zerado}`}>{dia.total}</span>
                <span className={styles.barra} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.dias}>
          {semana.dias.map((dia) => (
            <span key={dia.data} className={dia.hoje ? styles.hoje : undefined}>
              {dia.rotulo}
            </span>
          ))}
        </div>

        <span className={`${styles.eixo} ${styles.eixoDias}`}>Dias da semana</span>
      </div>
    </section>
  );
}
