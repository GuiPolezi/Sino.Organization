import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import NotFound from '../NotFound/index.jsx';
import { gerarClientesFicticios } from './dados.js';
import {
  JANELA_PROXIMO_DIAS,
  descreverPrazo,
  diasAte,
  formatarData,
  hojeISO,
  slugify,
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
 * Página da licença de um cliente (/licencas/<slug>). Por enquanto mostra só
 * o resumo, com os mesmos dados fictícios da listagem.
 */
export default function Cliente({ slug }) {
  const raiz = useRef(null);
  const hoje = hojeISO();
  const cliente = gerarClientesFicticios(hoje).find(({ nome }) => slugify(nome) === slug);

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

  const dias = diasAte(cliente.vencimento, hoje);
  const { tom, rotulo } = situacao(dias);

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

      <dl className={styles.dados} data-anim>
        <div>
          <dt>Vencimento</dt>
          <dd>
            <time dateTime={cliente.vencimento}>{formatarData(cliente.vencimento)}</time>
            <span className={styles.prazo}>{descreverPrazo(dias)}</span>
          </dd>
        </div>
        <div>
          <dt>Sistemas</dt>
          <dd>
            <ul className={styles.sistemas}>
              {cliente.sistemas.map((sistema) => (
                <li key={sistema}>{sistema}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </main>
  );
}
