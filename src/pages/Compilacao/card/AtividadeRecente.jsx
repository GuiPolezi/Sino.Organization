import { useMemo } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { agoraEmBrasilia, atividadeRecente, diaEMes } from '../atuacao.js';
import styles from './CardCompilador.module.css';

/**
 * "Atividade Recente": a última ação da pessoa no sistema, com os campos da
 * Auditoria do Legislação Digital (ação, cidade, módulo, data, hora e descrição).
 *
 * @param {{ id: string, cidades: { nome: string, uf: string }[] }} props
 */
export default function AtividadeRecente({ id, cidades }) {
  const { acao, cidade, modulo, data, hora, descricao } = useMemo(
    () => atividadeRecente(id, cidades, agoraEmBrasilia()),
    [id, cidades],
  );
  const campos = [
    ['Ação', acao],
    ['Cidade', cidade],
    ['Módulo', modulo],
    ['Data', diaEMes(data)],
    ['Hora', hora],
  ];

  return (
    <section className={base.surge} style={{ '--ordem': 4 }}>
      <h3 className={`${base.secao} ${styles.centro}`}>Atividade Recente</h3>
      <div className={styles.atividade}>
        <dl>
          {campos.map(([rotulo, valor], i) => (
            <div key={rotulo} style={{ '--i': i }}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
          <div className={styles.descricao} style={{ '--i': campos.length }}>
            <dt>Descrição</dt>
            <dd>{descricao}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
