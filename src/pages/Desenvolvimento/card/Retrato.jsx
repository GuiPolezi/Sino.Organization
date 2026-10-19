import { useRetrato } from '../../Suporte/boneco/Retratos.jsx';

/**
 * O rosto do boneco da pessoa (Retratos.jsx). Enquanto o retrato não fica
 * pronto, ou sem a cena 3D, ficam as iniciais. Decorativo: o nome vem ao lado.
 *
 * @param {object} props
 * @param {import('../../Suporte/tipos.js').Tecnico} props.tecnico
 * @param {string} props.className a moldura (tamanho, fundo, cantos)
 */
export default function Retrato({ tecnico, className }) {
  const url = useRetrato(tecnico.id);

  return (
    <span className={className} aria-hidden="true">
      {url ? <img src={url} alt="" draggable="false" /> : tecnico.avatarIniciais}
    </span>
  );
}
