import { useEffect, useRef, useState } from 'react';
import GlassModal from '../Modal/GlassModal.jsx';
import { useReunioes } from './reunioes/useReunioes.js';
import ReunioesLista from './reunioes/ReunioesLista.jsx';
import ReuniaoForm from './reunioes/ReuniaoForm.jsx';
import styles from './ReunioesModal.module.css';

// Modal do setor "Reuniões": histórico das reuniões e formulário para agendar.
export default function ReunioesModal({ onClose }) {
  const { reunioes, criar, remover } = useReunioes();
  const [visao, setVisao] = useState('lista');
  const criarBotao = useRef(null);
  const voltouDoForm = useRef(false);

  // Ao voltar do formulário, o foco retorna ao botão Criar.
  useEffect(() => {
    if (visao === 'lista' && voltouDoForm.current) {
      voltouDoForm.current = false;
      criarBotao.current?.focus();
    }
  }, [visao]);

  const voltarParaLista = () => {
    voltouDoForm.current = true;
    setVisao('lista');
  };

  const salvar = (dados) => {
    const resultado = criar(dados);
    if (resultado.ok) voltarParaLista();
    return resultado;
  };

  // Fragmento sempre presente: o cabeçalho não muda de layout entre as visões.
  const actions = (
    <>
      {visao === 'lista' && (
        <button
          ref={criarBotao}
          type="button"
          className={styles.criar}
          onClick={() => setVisao('form')}
        >
          Criar
        </button>
      )}
    </>
  );

  return (
    <GlassModal
      title="Reuniões"
      onClose={onClose}
      className={styles.card}
      actions={actions}
      // No formulário, "Voltar" retorna à lista; na lista, fecha o modal.
      onVoltar={visao === 'form' ? voltarParaLista : undefined}
    >
      <div key={visao} className={styles.visao} data-modal="item">
        {visao === 'lista' ? (
          <ReunioesLista reunioes={reunioes} onRemover={remover} />
        ) : (
          <ReuniaoForm onSalvar={salvar} onCancelar={voltarParaLista} />
        )}
      </div>
    </GlassModal>
  );
}
