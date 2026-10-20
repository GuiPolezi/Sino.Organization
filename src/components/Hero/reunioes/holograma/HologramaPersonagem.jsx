import { Component, Suspense, lazy, memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import devTeam from '../../../../data/dev-team.json';
import team from '../../../../data/team.json';
import { iniciais } from '../MembrosAvatares.jsx';
import { useRetratoReuniao } from '../RetratosReunioes.jsx';
import styles from './HologramaPersonagem.module.css';

/*
 * Holograma 3D do boneco de uma pessoa, girando sobre um projetor. Este módulo
 * não importa o three: a cena (CenaHolograma.jsx) vem num chunk à parte.
 */
let promessa = null;
const carregarCena = () => {
  promessa ??= import('./CenaHolograma.jsx').catch((erro) => {
    promessa = null;
    throw erro;
  });
  return promessa;
};
const CenaHolograma = lazy(carregarCena);

/** Dispara o download da cena 3D (ex.: ao abrir o modal), sem montar nada. */
export function precarregarHolograma() {
  carregarCena().catch(() => {});
}

const NOMES = new Map([...team.team, ...devTeam.team].map((pessoa) => [pessoa.id, pessoa.name]));

let webgl;
function temWebGL() {
  if (webgl !== undefined) return webgl;
  try {
    const contexto = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    webgl = Boolean(contexto);
    contexto?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

const consultaMovimento = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const assinarMovimento = (ouvinte) => {
  consultaMovimento?.addEventListener('change', ouvinte);
  return () => consultaMovimento?.removeEventListener('change', ouvinte);
};
const useMovimentoReduzido = () => useSyncExternalStore(assinarMovimento, () => Boolean(consultaMovimento?.matches), () => false);

const assinarVisibilidade = (ouvinte) => {
  document.addEventListener('visibilitychange', ouvinte);
  return () => document.removeEventListener('visibilitychange', ouvinte);
};
const useAbaVisivel = () => useSyncExternalStore(assinarVisibilidade, () => document.visibilityState !== 'hidden', () => true);

// O render só roda com o card na tela (o modal pode estar animando para fora).
function useNaTela(ref) {
  const [naTela, setNaTela] = useState(true);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver(([entrada]) => setNaTela(entrada.isIntersecting));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);
  return naTela;
}

// Enquanto a cena carrega (ou sem WebGL): o retrato do rosto, ou as iniciais, em holograma.
function Reserva({ pessoaId }) {
  const url = useRetratoReuniao(pessoaId);
  const [carregado, setCarregado] = useState(false);
  useEffect(() => setCarregado(false), [url]);
  return (
    <div className={styles.reservaFigura}>
      {url ? (
        <img
          className={styles.retrato}
          src={url}
          alt=""
          data-carregado={carregado || undefined}
          onLoad={() => setCarregado(true)}
          draggable={false}
        />
      ) : (
        <span className={styles.iniciais}>{iniciais(NOMES.get(pessoaId) ?? pessoaId)}</span>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string | null} props.pessoaId id em team.json / dev-team.json; null = projetor vazio
 * @param {string} [props.rotulo] texto acessível (ex.: "Boneco de Guilherme P.")
 * @param {string} [props.className]
 */
function HologramaPersonagem({ pessoaId = null, rotulo, className }) {
  const raiz = useRef(null);
  const reduzido = useMovimentoReduzido();
  const abaVisivel = useAbaVisivel();
  const naTela = useNaTela(raiz);
  const [suporta] = useState(temWebGL);
  const [pronto, setPronto] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const cena3d = suporta && !falhou;
  const ativo = abaVisivel && naTela;
  // Estáveis: não re-renderizam o Canvas a cada render daqui.
  const aoPronto = useCallback(() => setPronto(true), []);
  const aoFalhar = useCallback(() => setFalhou(true), []);
  // A reserva some com fade e só depois sai da árvore.
  const [reservaFora, setReservaFora] = useState(false);
  useEffect(() => {
    if (!cena3d || !pronto) return setReservaFora(false);
    const espera = setTimeout(() => setReservaFora(true), 700);
    return () => clearTimeout(espera);
  }, [cena3d, pronto]);

  return (
    <div
      ref={raiz}
      className={[styles.holograma, className].filter(Boolean).join(' ')}
      data-pronto={(cena3d && pronto) || undefined}
      data-reduzido={reduzido || undefined}
      data-vazio={!pessoaId || undefined}
      data-inativo={!ativo || undefined}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
    >
      <div className={styles.fundo} aria-hidden="true" />

      {(!cena3d || !reservaFora) && (
        <div className={styles.reserva} aria-hidden="true">
          <div className={styles.feixe} />
          {pessoaId && <Reserva key={pessoaId} pessoaId={pessoaId} />}
          <div className={styles.disco} />
        </div>
      )}

      {cena3d && (
        <ErroCena onErro={aoFalhar}>
          <Suspense fallback={null}>
            <CenaHolograma
              className={styles.canvas}
              pessoaId={pessoaId}
              ativo={ativo}
              reduzido={reduzido}
              onPronto={aoPronto}
            />
          </Suspense>
        </ErroCena>
      )}

      <div className={styles.linhas} aria-hidden="true" />
      <div className={styles.varredura} aria-hidden="true" />
      {/* Remonta a cada troca de pessoa: dispara o glitch de uma vez só. */}
      <div key={pessoaId ?? 'vazio'} className={styles.glitch} aria-hidden="true" />
      <div className={styles.vinheta} aria-hidden="true" />
    </div>
  );
}

export default memo(HologramaPersonagem);

// Erro no chunk ou no WebGL: avisa o pai e o fallback volta, sem quebrar o modal.
class ErroCena extends Component {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {
    this.props.onErro();
  }
  render() {
    return this.state.erro ? null : this.props.children;
  }
}
