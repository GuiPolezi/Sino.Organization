import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { ESTACOES } from '../../Suporte/boneco/estacoes.js';
import EstacoesTrabalho from '../../Suporte/cena/EstacoesTrabalho.jsx';
import CantoDoCafe from './CantoDoCafe.jsx';
import { aplicarPlanta } from './lugares.js';
import { planta } from './planta.js';

/*
 * Os móveis de /compilacao no tapete: as sete mesas de trabalho (as de
 * /suporte) e o cantinho do café com os pufes. Quando o tapete vira retrato,
 * tudo muda de lugar junto (como as mesas de /desenvolvimento): as estações e
 * o obstáculo da mesa do café são refeitos e os móveis redesenhados.
 */
export default function CenarioCompilacao() {
  const retrato = useThree((s) => s.size.width / s.size.height < 1);
  const [mesas, setMesas] = useState(() => ESTACOES.filter(({ tipo }) => tipo === 'mesa'));

  useEffect(() => {
    setMesas(aplicarPlanta(retrato).filter(({ tipo }) => tipo === 'mesa'));
  }, [retrato]);

  const { cafe, pufes } = useMemo(() => planta(retrato), [retrato]);

  return (
    <>
      <EstacoesTrabalho estacoes={mesas} />
      <CantoDoCafe cafe={cafe} pufes={pufes} />
    </>
  );
}
