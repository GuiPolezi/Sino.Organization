import { useMemo } from 'react';
import Quadro from '../../Suporte/quadro/Quadro.jsx';
import { anotacoesDoQuadro } from './anotacoes.js';
import { useResumo } from './useResumo.js';

// O quadro da cena de /desenvolvimento, com a visão geral da equipe escrita nele.
export default function QuadroDesenvolvimento({ area }) {
  const resumo = useResumo();
  const anotacoes = useMemo(() => anotacoesDoQuadro(resumo), [resumo]);
  return <Quadro area={area} anotacoes={anotacoes} />;
}
