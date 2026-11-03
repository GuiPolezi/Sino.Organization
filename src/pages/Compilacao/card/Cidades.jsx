import { useId, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import styles from './CardCompilador.module.css';

/**
 * "Trabalhando em": a cidade de agora (em Projetos, com o tipo de norma) e, para
 * quem tem uma carteira de cidades (Atualizações), o "Ver mais" com as outras,
 * na ordem da ação mais recente.
 *
 * @param {{ atual: string, outras: string[] }} props
 */
export default function Cidades({ atual, outras }) {
  const [aberta, setAberta] = useState(false);
  const idGaveta = useId();
  const naCarteira = outras.length + 1;

  return (
    <section className={base.surge} style={{ '--ordem': 2 }}>
      <h3 className={base.secao}>Trabalhando em</h3>
      <p className={styles.cidade}>{atual}</p>

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
            <span className={styles.qtdCidades}>{naCarteira} cidades na carteira</span>
          </button>
          <div id={idGaveta} className={styles.gaveta} data-aberta={aberta} inert={!aberta}>
            <div>
              <ul aria-label="Outras cidades da carteira">
                {outras.map((cidade, i) => (
                  <li key={cidade} style={{ '--i': i }}>
                    {cidade}
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
