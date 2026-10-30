import { useId, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { nomeDaCidade } from '../atuacao.js';
import styles from './CardCompilador.module.css';

/**
 * "Trabalhando em": a cidade de agora e, para quem mexe em mais de uma (quem
 * está em Atualizações), o "Ver mais" que abre a gaveta com as outras.
 *
 * @param {{ cidades: { nome: string, uf: string }[] }} props
 */
export default function Cidades({ cidades }) {
  const [aberta, setAberta] = useState(false);
  const idGaveta = useId();
  const [atual, ...outras] = cidades;

  return (
    <section className={base.surge} style={{ '--ordem': 2 }}>
      <h3 className={base.secao}>Trabalhando em</h3>
      <p className={styles.cidade}>{nomeDaCidade(atual)}</p>

      {outras.length > 0 && (
        <>
          <button
            type="button"
            className={styles.verMais}
            aria-expanded={aberta}
            aria-controls={idGaveta}
            onClick={() => setAberta((antes) => !antes)}
          >
            <span className={styles.sinal} aria-hidden="true" />
            <span className={styles.textoVerMais}>{aberta ? 'Ver menos' : 'Ver mais'}</span>
            <span className={styles.qtdCidades}>
              {outras.length === 1 ? '1 cidade' : `${outras.length} cidades`}
            </span>
          </button>
          <div id={idGaveta} className={styles.gaveta} data-aberta={aberta} inert={!aberta}>
            <div>
              <ul aria-label="Outras cidades">
                {outras.map((cidade, i) => (
                  <li key={nomeDaCidade(cidade)} style={{ '--i': i }}>
                    {nomeDaCidade(cidade)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
