import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLenis } from '../../hooks/useLenis.js';
import { MEDIA } from '../../utils/media.js';
import { classificarLicencas, hojeISO } from './mappers/licencas.js';
import {
  ATUALIZADO_EM,
  LICENCAS,
  SITE_LICENCAS_URL,
  TOTAL_CLIENTES_REGISTRADOS,
} from './dados.js';
import { animarCabecalho } from './animacoes.js';
import SecaoLicencas from './SecaoLicencas.jsx';
import styles from './Licencas.module.css';

gsap.registerPlugin(useGSAP);

const HOJE = hojeISO();
const { vencidas, proximas } = classificarLicencas(LICENCAS, HOJE);

// "25/10/2026 às 18:10", no horário do navegador.
const ATUALIZADO = ATUALIZADO_EM
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      .format(new Date(ATUALIZADO_EM))
      .replace(', ', ' às ')
  : null;

export default function Licencas() {
  useLenis();
  const topo = useRef(null);
  const numeroClientes = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        animarCabecalho(
          gsap.utils.selector(topo),
          numeroClientes.current,
          TOTAL_CLIENTES_REGISTRADOS,
        );
        // Se a animação for desfeita no meio da contagem, volta ao valor final.
        const numero = numeroClientes.current;
        return () => {
          numero.textContent = TOTAL_CLIENTES_REGISTRADOS;
        };
      });
    },
    { scope: topo },
  );

  return (
    <main className={styles.page}>
      <title>Licenças · sino.org</title>

      <header ref={topo} className={styles.topo}>
        <a className={styles.voltar} href="/" data-anim="sobe">
          <span className={styles.voltarSeta} aria-hidden="true">
            ←
          </span>
          Voltar para o início
        </a>

        <div className={styles.topoLinha}>
          <h1 className={styles.titulo}>
            {['Sino', 'Licenças'].map((palavra) => (
              <span key={palavra} className={styles.mascara}>
                <span className={styles.palavra} data-anim="titulo-palavra">
                  {palavra}
                </span>
              </span>
            ))}
          </h1>

          <div className={styles.linhas} aria-hidden="true">
            <span data-anim="linha" />
            <span data-anim="linha" />
            <span data-anim="linha" />
          </div>

          <p className={styles.contador}>
            <span className={styles.contadorNumero} data-anim="contador">
              +<span ref={numeroClientes}>{TOTAL_CLIENTES_REGISTRADOS}</span>
            </span>
            <span className={styles.contadorTexto} data-anim="contador">
              Clientes Registrados
            </span>
          </p>
        </div>

        <p className={styles.subtitulo} data-anim="sobe">
          Sistema de Gerenciamento de Licenças dos Softwares Sino
        </p>

        <p className={styles.acesso} data-anim="sobe">
          <span>Clique para acessar</span>
          <a className={styles.botaoSite} href={SITE_LICENCAS_URL}>
            Site Licenças
            <span className={styles.botaoSeta} aria-hidden="true">
              ↗
            </span>
          </a>
          {ATUALIZADO && <span className={styles.atualizado}>Atualizado em {ATUALIZADO}</span>}
        </p>
      </header>

      <SecaoLicencas id="vencidas" titulo="Vencidas" tom="vencida" licencas={vencidas} />
      <SecaoLicencas
        id="proximas"
        titulo="Vencimento Próximo"
        tom="proxima"
        licencas={proximas}
      />
    </main>
  );
}
