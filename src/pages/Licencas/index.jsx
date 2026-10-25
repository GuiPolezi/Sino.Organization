import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLenis } from '../../hooks/useLenis.js';
import { MEDIA } from '../../utils/media.js';
import { classificarLicencas, hojeISO } from './mappers/licencas.js';
import { SITE_LICENCAS_URL, useLicencas } from './dados.js';
import { animarCabecalho, animarContador } from './animacoes.js';
import SecaoLicencas from './SecaoLicencas.jsx';
import styles from './Licencas.module.css';

gsap.registerPlugin(useGSAP);

// "25/10/2026 às 18:10", no horário do navegador.
const formatarAtualizado = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(iso))
    .replace(', ', ' às ');

export default function Licencas() {
  useLenis();
  const topo = useRef(null);
  const numeroClientes = useRef(null);
  const estado = useLicencas();
  const pronto = estado.situacao === 'pronto';
  const total = pronto ? estado.totalClientes : 0;

  const { vencidas, proximas } = useMemo(
    () => (pronto ? classificarLicencas(estado.licencas, hojeISO()) : { vencidas: [], proximas: [] }),
    [pronto, estado.licencas],
  );

  useGSAP(
    () => {
      gsap.matchMedia().add(MEDIA.motion, () => {
        animarCabecalho(gsap.utils.selector(topo));
      });
    },
    { scope: topo },
  );

  // O total chega da API depois da entrada do topo: conta até ele quando chegar.
  useGSAP(
    () => {
      if (!total) return;
      gsap.matchMedia().add(MEDIA.motion, () => {
        const numero = numeroClientes.current;
        animarContador(numero, total);
        // Se a animação for desfeita no meio da contagem, volta ao valor final.
        return () => {
          numero.textContent = total;
        };
      });
    },
    { scope: topo, dependencies: [total] },
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
              {total ? '+' : ''}
              <span ref={numeroClientes}>{total || '–'}</span>
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
          {pronto && (
            <span className={styles.atualizado} role="status">
              Atualizado em {formatarAtualizado(estado.atualizadoEm)}
              {estado.aviso && ` · ${estado.aviso}`}
            </span>
          )}
        </p>
      </header>

      {estado.situacao === 'carregando' && (
        <p className={styles.estado} role="status">
          <span className={styles.pontos} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Buscando as licenças no Sino.Licença…
        </p>
      )}

      {estado.situacao === 'erro' && (
        <div className={styles.estado} role="alert">
          <p>Não foi possível carregar as licenças. {estado.mensagem}</p>
          <button type="button" className={styles.mais} onClick={estado.tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}

      {pronto && (
        <>
          <SecaoLicencas id="vencidas" titulo="Vencidas" tom="vencida" licencas={vencidas} />
          <SecaoLicencas
            id="proximas"
            titulo="Vencimento Próximo"
            tom="proxima"
            licencas={proximas}
          />
        </>
      )}
    </main>
  );
}
