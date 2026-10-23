import { Fragment } from 'react';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { escalaY } from '../../Suporte/mappers/atendimentos.js';
import styles from './GraficoTipos.module.css';

const porcento = (valor, topo) => `${(valor / topo) * 100}%`;

// Com poucos chamados, uma linha de grade por chamado, para as colunas não sumirem
// no pé do gráfico; dali para cima, a mesma escala do gráfico do suporte.
function escala(maximo) {
  if (maximo >= 8) return escalaY(maximo);
  const topo = maximo + 1;
  return { topo, marcas: Array.from({ length: topo + 1 }, (_, i) => i) };
}

// "Migração/Dados" pode quebrar depois da barra, para caber na coluna.
const comQuebra = (assunto) =>
  assunto.split('/').map((parte, i, partes) => (
    <Fragment key={i}>
      {parte}
      {i < partes.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));

/**
 * Colunas com os chamados de uma categoria por assunto (a subcategoria do
 * Milldesk). Cada coluna leva o valor no topo, então o eixo Y só tem as linhas
 * de grade. Ao trocar de período as colunas são as mesmas e a altura delas
 * desliza até o valor novo.
 *
 * @param {object} props
 * @param {{ nome: string, assuntos: { assunto: string, total: number }[] }} props.categoria
 */
export default function GraficoTipos({ categoria }) {
  const { assuntos } = categoria;
  const { topo, marcas } = escala(Math.max(...assuntos.map(({ total }) => total)));
  const descricao = `Chamados de ${categoria.nome} por assunto: ${assuntos
    .map(({ assunto, total }) => `${assunto}, ${total}`)
    .join('; ')}`;

  return (
    <div className={styles.grafico} role="img" aria-label={descricao} style={{ '--colunas': assuntos.length }}>
      <div className={styles.area}>
        {marcas.slice(1).map((marca) => (
          <i key={marca} style={{ bottom: porcento(marca, topo) }} />
        ))}
        <div className={styles.colunas}>
          {assuntos.map(({ assunto, total }, i) => (
            <div key={assunto} style={{ '--altura': porcento(total, topo), '--ordem': i }}>
              <span className={total > 0 ? styles.valor : `${styles.valor} ${styles.zerado}`}>
                <Contagem valor={total} />
              </span>
              <span className={styles.barra} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.tipos}>
        {assuntos.map(({ assunto }) => (
          <span key={assunto}>{comQuebra(assunto)}</span>
        ))}
      </div>
    </div>
  );
}
