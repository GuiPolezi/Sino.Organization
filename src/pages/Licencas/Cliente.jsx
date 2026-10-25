import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import NotFound from '../NotFound/index.jsx';
import { LICENCAS, urlClienteNoSite } from './dados.js';
import {
  JANELA_PROXIMO_DIAS,
  descreverPrazo,
  diasAte,
  formatarData,
  hojeISO,
} from './mappers/licencas.js';
import styles from './Cliente.module.css';

gsap.registerPlugin(useGSAP);

// Mesma janela da página de licenças: vencida, perto de vencer ou em dia.
const situacao = (dias) => {
  if (dias < 0) return { tom: 'vencida', rotulo: 'Licença vencida' };
  if (dias <= JANELA_PROXIMO_DIAS) return { tom: 'proxima', rotulo: 'Vencimento próximo' };
  return { tom: 'em-dia', rotulo: 'Licença em dia' };
};

/*
 * Página da licença de um cliente (/licencas/<slug>). Mostra as licenças do
 * cliente que estão nas tabelas do Sino.Licença, uma linha por data de
 * vencimento. A situação do topo é a da licença mais urgente.
 */
export default function Cliente({ slug }) {
  const raiz = useRef(null);
  const hoje = hojeISO();
  const licencas = LICENCAS.filter((licenca) => licenca.slug === slug)
    .map((licenca) => ({ ...licenca, dias: diasAte(licenca.vencimento, hoje) }))
    .sort((a, b) => a.dias - b.dias);
  const cliente = licencas[0];

  useGSAP(
    () => {
      if (!cliente) return;
      gsap.matchMedia().add(MEDIA.motion, () => {
        gsap.from('[data-anim]', {
          autoAlpha: 0,
          y: 24,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
        });
      });
    },
    { scope: raiz },
  );

  if (!cliente) return <NotFound />;

  const { tom, rotulo } = situacao(cliente.dias);

  return (
    <main ref={raiz} className={styles.page} data-tom={tom}>
      <title>{`${cliente.nome} · Licenças · sino.org`}</title>

      <a className={styles.voltar} href="/licencas" data-anim>
        ← Voltar para licenças
      </a>

      <p className={styles.situacao} data-anim>
        {rotulo}
      </p>
      <h1 className={styles.nome} data-anim>
        {cliente.nome}
      </h1>

      {licencas.map(({ chave, vencimento, dias, sistemas }) => (
        <dl key={chave} className={styles.dados} data-tom={situacao(dias).tom} data-anim>
          <div>
            <dt>Vencimento</dt>
            <dd>
              <time dateTime={vencimento}>{formatarData(vencimento)}</time>
              <span className={styles.prazo}>{descreverPrazo(dias)}</span>
            </dd>
          </div>
          <div>
            <dt>Sistemas</dt>
            <dd>
              <ul className={styles.sistemas}>
                {sistemas.map((sistema) => (
                  <li key={sistema}>{sistema}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      ))}

      <a
        className={styles.noSite}
        href={urlClienteNoSite(cliente.clienteId)}
        target="_blank"
        rel="noreferrer"
        data-anim
      >
        Abrir no Site Licenças ↗
      </a>
    </main>
  );
}
