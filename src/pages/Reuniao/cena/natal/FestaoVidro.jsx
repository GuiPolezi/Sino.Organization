/*
 * Festão no vidro da reunião: uma barriga por trecho, as 10 mescladas numa
 * geometria só, com 5 lâmpadas e 3 bolinhas por trecho (pontos.js).
 */
import Festao from '../../../../tema/natal/pecas/Festao.jsx';
import { CURVAS_FESTAO_VIDRO } from './pontos.js';

export default function FestaoVidro() {
  return <Festao name="natal-festao-vidro" curvas={CURVAS_FESTAO_VIDRO} luzes={5} bolinhas={3} />;
}
