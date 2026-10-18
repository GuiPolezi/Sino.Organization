import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { ESTACOES, definirEstacoes } from '../../Suporte/boneco/estacoes.js';
import EstacoesTrabalho from '../../Suporte/cena/EstacoesTrabalho.jsx';
import { basesDasMesas } from './estacoes.js';

/*
 * As mesas de trabalho da cena de /desenvolvimento. Mudam de lugar quando o
 * tapete vira retrato (como o quadro faz em posicionarQuadro); ao mudar, as
 * estações e os obstáculos são redefinidos e as mesas redesenhadas. Quem
 * estiver sentado termina o trabalho na mesa antiga, que some: raro (só ao
 * girar a tela) e inofensivo.
 */
export default function EstacoesDesenvolvimento() {
  const retrato = useThree((s) => s.size.width / s.size.height < 1);
  const [estacoes, setEstacoes] = useState(() => [...ESTACOES]);

  useEffect(() => {
    setEstacoes([...definirEstacoes(basesDasMesas(retrato))]);
  }, [retrato]);

  return <EstacoesTrabalho estacoes={estacoes} />;
}
