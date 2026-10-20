import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import GlassModal from '../Modal/GlassModal.jsx';
import { useReunioes } from './reunioes/useReunioes.js';
import { useAgora } from './reunioes/useAgora.js';
import { POR_PAGINA, filtrarReunioes } from './reunioes/periodos.js';
import ReunioesLista from './reunioes/ReunioesLista.jsx';
import ReuniaoForm from './reunioes/ReuniaoForm.jsx';
import styles from './ReunioesModal.module.css';

// Modal do setor "Reuniões": histórico das reuniões e formulário para agendar.
export default function ReunioesModal({ onClose }) {
  const { reunioes, criar, remover } = useReunioes();
  const agora = useAgora(reunioes);
  const [visao, setVisao] = useState('lista');
  // Filtro e página ficam aqui para sobreviver à ida ao formulário.
  const [filtro, setFiltro] = useState('todas');
  const [pagina, setPagina] = useState(1);
  // Quantos cards cabem na tela; a lista mede e avisa (sem rolagem).
  const [porPagina, setPorPagina] = useState(POR_PAGINA);
  const [destaqueId, setDestaqueId] = useState(null);
  const criarBotao = useRef(null);
  const visaoRef = useRef(null);
  const visaoInicial = useRef(visao);
  const voltouDoForm = useRef(false);

  // Ao voltar do formulário, o foco retorna ao botão Criar.
  useEffect(() => {
    if (visao === 'lista' && voltouDoForm.current) {
      voltouDoForm.current = false;
      criarBotao.current?.focus();
    }
  }, [visao]);

  // Troca lista ↔ formulário: a nova visão entra (a abertura fica com o GlassModal).
  useGSAP(
    () => {
      if (visaoInicial.current === visao) return;
      visaoInicial.current = null;
      if (matches(MEDIA.reducedMotion)) return;
      gsap.fromTo(
        visaoRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'opacity,transform' },
      );
    },
    { dependencies: [visao] },
  );

  const voltarParaLista = () => {
    voltouDoForm.current = true;
    setVisao('lista');
  };

  const salvar = (dados) => {
    const resultado = criar(dados);
    if (resultado.ok) {
      // Mostra a nova reunião: filtro "Todas", na página em que ela caiu.
      const lista = filtrarReunioes([...reunioes, resultado.reuniao], 'todas', new Date());
      const indice = lista.findIndex((r) => r.id === resultado.reuniao.id);
      setFiltro('todas');
      setPagina(indice < 0 ? 1 : Math.floor(indice / porPagina) + 1);
      setDestaqueId(resultado.reuniao.id);
      voltarParaLista();
    }
    return resultado;
  };

  // Mudou quantos cabem: continua mostrando o primeiro card que estava no topo.
  const porPaginaAtual = useRef(POR_PAGINA);
  const ajustarPorPagina = useCallback((novo) => {
    const antigo = porPaginaAtual.current;
    if (novo === antigo) return;
    porPaginaAtual.current = novo;
    setPorPagina(novo);
    setPagina((atual) => Math.floor(((atual - 1) * antigo) / novo) + 1);
  }, []);

  const escolherFiltro = useCallback((id) => {
    setFiltro(id);
    setPagina(1);
    setDestaqueId(null);
  }, []);

  // delta: +1 / -1. A lista limita a página ao intervalo válido.
  const mudarPagina = useCallback((delta) => {
    setPagina((atual) => Math.max(1, atual + delta));
    setDestaqueId(null);
  }, []);

  // Fragmento sempre presente: o cabeçalho não muda de layout entre as visões.
  // Lista: "Criar". Formulário: botão de voltar à lista (design "Criar Reunião").
  const actions =
    visao === 'lista' ? (
      <button
        ref={criarBotao}
        type="button"
        className={styles.criar}
        onClick={() => setVisao('form')}
      >
        Criar
      </button>
    ) : (
      <button
        type="button"
        className={styles.voltarForm}
        aria-label="Voltar para as reuniões"
        onClick={voltarParaLista}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 12H6M11 6.5L5.5 12l5.5 5.5" />
        </svg>
      </button>
    );

  // O título troca com um leve deslize entre as visões.
  const titulo = (
    <span key={visao} className={styles.tituloTroca}>
      {visao === 'lista' ? 'Reuniões' : 'Criar Reunião'}
    </span>
  );

  return (
    <GlassModal
      title={titulo}
      onClose={onClose}
      className={styles.card}
      actions={actions}
      // O link "← Voltar" (fecha o modal) só aparece na lista.
      voltar={visao === 'lista'}
    >
      <div key={visao} ref={visaoRef} className={styles.visao} data-modal="item">
        {visao === 'lista' ? (
          <ReunioesLista
            reunioes={reunioes}
            agora={agora}
            filtro={filtro}
            pagina={pagina}
            porPagina={porPagina}
            onPorPagina={ajustarPorPagina}
            destaqueId={destaqueId}
            onFiltro={escolherFiltro}
            onPagina={mudarPagina}
            onAjustarPagina={setPagina}
            onRemover={remover}
          />
        ) : (
          <ReuniaoForm onSalvar={salvar} />
        )}
      </div>
    </GlassModal>
  );
}
