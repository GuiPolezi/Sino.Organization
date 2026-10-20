import { Component, Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

/*
 * Retratos dos bonecos para os avatares das reuniões, na home. Este módulo não
 * importa o three: o Canvas (RetratistaReunioes.jsx) vem num chunk à parte, só
 * quando há retrato a tirar, e sai quando a fila esvazia (libera o WebGL).
 */
const RetratistaReunioes = lazy(() => import('./RetratistaReunioes.jsx'));

// Quanto o Canvas espera, com a fila vazia, antes de fechar (novas páginas da lista).
// Parado ele não desenha nada (frameloop sob demanda); fechar e reabrir é que custa
// (contexto WebGL novo e shaders recompilados), por isso a espera é longa.
const ESPERA_FECHAR = 20000;
// Quanto a raiz do fotógrafo fica depois que o último avatar sai.
const ESPERA_SAIR = 20000;

let estado = { urls: {}, pendentes: [], semWebGL: false };
const ouvintes = new Set();
const mudar = (parcial) => {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((ouvinte) => ouvinte());
};

let webgl;
// Testa o WebGL 2 uma vez (o Retratista usa alvo com multisample) e solta o contexto do teste.
function temWebGL() {
  if (webgl !== undefined) return webgl;
  try {
    const contexto = document.createElement('canvas').getContext('webgl2');
    webgl = Boolean(contexto);
    contexto?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

export const filaRetratos = {
  get: () => estado,
  assinar(ouvinte) {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },
  pedir(id) {
    if (!id || estado.semWebGL || id in estado.urls || estado.pendentes.includes(id)) return;
    if (!temWebGL()) return mudar({ semWebGL: true });
    mudar({ pendentes: [...estado.pendentes, id] });
  },
  entregar(id, url) {
    mudar({ urls: { ...estado.urls, [id]: url }, pendentes: estado.pendentes.filter((outro) => outro !== id) });
  },
  // Sem cena possível: ficam as iniciais.
  desistir() {
    mudar({ semWebGL: true, pendentes: [] });
  },
};

const useFila = (seletor) => useSyncExternalStore(filaRetratos.assinar, () => seletor(estado));

// Erro no chunk ou no Canvas: desiste dos retratos em vez de quebrar a página.
class Barreira extends Component {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {
    filaRetratos.desistir();
  }
  render() {
    return this.state.erro ? null : this.props.children;
  }
}

// Liga o Canvas enquanto há fila; desliga um pouco depois de ela esvaziar.
function Fotografo() {
  const temFila = useFila((s) => s.pendentes.length > 0 && !s.semWebGL);
  const [ligado, setLigado] = useState(temFila);

  useEffect(() => {
    if (temFila) {
      setLigado(true);
      return undefined;
    }
    const espera = setTimeout(() => setLigado(false), ESPERA_FECHAR);
    return () => clearTimeout(espera);
  }, [temFila]);

  if (!ligado && !temFila) return null;
  return (
    <Barreira>
      <Suspense fallback={null}>
        <RetratistaReunioes />
      </Suspense>
    </Barreira>
  );
}

/*
 * Um único fotógrafo para todos os avatares: uma raiz React própria, fora do
 * layout, criada com o primeiro avatar e desmontada pouco depois do último.
 * Assim a troca de página da lista não reabre o contexto WebGL.
 */
let raiz = null;
let usuarios = 0;
let saida = null;

function usarFotografo() {
  usuarios += 1;
  clearTimeout(saida);
  if (!raiz) {
    const elemento = document.createElement('div');
    elemento.setAttribute('aria-hidden', 'true');
    document.body.append(elemento);
    raiz = { elemento, root: createRoot(elemento) };
    raiz.root.render(<Fotografo />);
  }
  return () => {
    usuarios -= 1;
    if (usuarios > 0) return;
    saida = setTimeout(() => {
      if (!raiz || usuarios > 0) return;
      raiz.root.unmount();
      raiz.elemento.remove();
      raiz = null;
    }, ESPERA_SAIR);
  };
}

/**
 * O retrato do boneco de `id` (data URL) ou null enquanto não fica pronto ou
 * sem WebGL. Pede o retrato e mantém o fotógrafo vivo enquanto montado.
 * @param {string} id
 */
export function useRetratoReuniao(id) {
  const url = useFila((s) => s.urls[id] ?? null);
  useEffect(() => usarFotografo(), []);
  useEffect(() => {
    if (id && !url) filaRetratos.pedir(id);
  }, [id, url]);
  return url;
}
