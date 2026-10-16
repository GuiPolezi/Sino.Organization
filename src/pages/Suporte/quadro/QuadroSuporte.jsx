import { useMemo } from 'react';
import { anotacoesDoQuadro } from './anotacoes.js';
import Quadro from './Quadro.jsx';
import { useResumo } from './useResumo.js';

// O quadro da cena de /suporte, com a visão geral da equipe técnica escrita nele.
export default function QuadroSuporte({ area }) {
  const resumo = useResumo();
  const anotacoes = useMemo(() => anotacoesDoQuadro(resumo), [resumo]);
  return <Quadro area={area} anotacoes={anotacoes} />;
}
