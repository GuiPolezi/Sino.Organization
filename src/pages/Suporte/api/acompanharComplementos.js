import { useEquipe } from '../store.js';
import { acompanharFonte } from './acompanharFonte.js';

/**
 * Liga a busca do que complementa a equipe (atendimentos em /suporte, chamados
 * em /desenvolvimento) ao estado que os cards leem:
 *  - situacaoComplementos: 'carregando' → 'pronto', ou 'erro' se a primeira falhar;
 *  - recarregarComplementos: o botão "Tentar de novo".
 * A busca se repete sozinha (api/acompanharFonte.js), e uma aba que volta do
 * segundo plano com o dado atrasado busca na hora.
 *
 * @template T
 * @param {{ buscar: () => Promise<T & { situacao?: string }>, aoReceber: (resposta: T) => void }} opcoes
 * @returns {() => void} para tudo ao sair da página
 */
export function acompanharComplementos({ buscar, aoReceber }) {
  useEquipe.setState({ situacaoComplementos: 'carregando' });

  const fonte = acompanharFonte({
    buscar,
    aoReceber: (resposta) => {
      aoReceber(resposta);
      useEquipe.setState({ situacaoComplementos: 'pronto' });
    },
    // Uma falha depois de já ter dados mantém os dados: a próxima busca corrige.
    aoFalhar: () =>
      useEquipe.setState(({ situacaoComplementos }) =>
        situacaoComplementos === 'pronto' ? {} : { situacaoComplementos: 'erro' },
      ),
  });

  const aoVoltar = () => {
    if (document.visibilityState === 'visible' && fonte.atrasado()) fonte.agora();
  };
  document.addEventListener('visibilitychange', aoVoltar);

  useEquipe.setState({
    recarregarComplementos: () => {
      if (useEquipe.getState().situacaoComplementos === 'erro') {
        useEquipe.setState({ situacaoComplementos: 'carregando' });
      }
      fonte.agora();
    },
  });

  return () => {
    fonte.parar();
    document.removeEventListener('visibilitychange', aoVoltar);
    useEquipe.setState({ situacaoComplementos: null, recarregarComplementos: null });
  };
}
