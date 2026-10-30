import { useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { rotuloDataHora } from '../atuacao.js';
import styles from './CardCompilador.module.css';
import ModalResponsabilidade from './ModalResponsabilidade.jsx';

/**
 * "Responsabilidade atual": a palavra grande (Atualizações ou Projetos Novos), a
 * última troca e o botão que abre o modal para trocar.
 *
 * @param {object} props
 * @param {string} props.nome
 * @param {ReturnType<typeof import('../atuacao.js').atuacaoDe>} props.atuacao
 * @param {(chave: string) => void} props.escolher
 */
export default function Responsabilidade({ nome, atuacao, escolher }) {
  const [aberto, setAberto] = useState(false);
  const { responsabilidade, rotulo, alteradaEm } = atuacao;
  const letras = [...rotulo.toUpperCase()];

  return (
    <section className={`${base.surge} ${styles.responsabilidade}`} style={{ '--ordem': 1 }}>
      <div className={styles.linhaTitulo}>
        <h3 className={base.secao}>Responsabilidade Atual</h3>
        <button type="button" className={styles.alterar} aria-haspopup="dialog" onClick={() => setAberto(true)}>
          Alterar
        </button>
      </div>

      {/* A key refaz a entrada das letras quando a responsabilidade muda. */}
      <div aria-live="polite">
        <p key={responsabilidade} className={styles.palavra}>
          <span className="sr-only">{rotulo}</span>
          {letras.map((letra, i) => (
            <span key={i} className={styles.letra} style={{ '--i': i }} aria-hidden="true">
              {letra}
            </span>
          ))}
        </p>
      </div>
      <p key={rotuloDataHora(alteradaEm)} className={styles.alteracao}>
        Última Alteração: {rotuloDataHora(alteradaEm)}
      </p>

      {aberto && (
        <ModalResponsabilidade
          nome={nome}
          atual={responsabilidade}
          aoEscolher={escolher}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
