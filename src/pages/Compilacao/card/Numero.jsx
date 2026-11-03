import Contagem from '../../Suporte/card/Contagem.jsx';

/**
 * Um número que conta até o valor, com "+" na frente se pedido; sem número, "—"
 * (nunca "+—").
 * @param {{ valor: number | null, mais?: boolean }} props
 */
export default function Numero({ valor, mais = false }) {
  if (typeof valor !== 'number') return <>—</>;
  return (
    <>
      {mais && '+'}
      <Contagem valor={valor} />
    </>
  );
}
