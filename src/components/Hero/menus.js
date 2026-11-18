// Os cards da home, na ordem da grade (3 por linha no desktop). Cada um leva a
// uma página (`href`), abre um modal (`modal`) ou, sem os dois, ainda não foi
// desenvolvido: aparece bloqueado, em cinza, sem clique.
//
// As ilustrações são os bonecos 3D do próprio sistema, renderizados em imagem
// por `scripts/gerar-ilustracoes-home.mjs` (1200×800, fundo transparente,
// composição centrada e apoiada na base). Com o tema de Natal, vale a versão de gorro.

import { NATAL_ATIVO } from '../../tema/natal.js';
import compilacao from '../../assets/images/home/compilacao.webp';
import compilacaoSemNatal from '../../assets/images/home/compilacao-sem-natal.webp';
import dev from '../../assets/images/home/dev.webp';
import devSemNatal from '../../assets/images/home/dev-sem-natal.webp';
import digitalizacao from '../../assets/images/home/digitalizacao.webp';
import digitalizacaoSemNatal from '../../assets/images/home/digitalizacao-sem-natal.webp';
import licencas from '../../assets/images/home/licencas.webp';
import licencasSemNatal from '../../assets/images/home/licencas-sem-natal.webp';
import reunioes from '../../assets/images/home/reunioes.webp';
import reunioesSemNatal from '../../assets/images/home/reunioes-sem-natal.webp';
import suporte from '../../assets/images/home/suporte.webp';
import suporteSemNatal from '../../assets/images/home/suporte-sem-natal.webp';

const imagem = (natal, semNatal) => (NATAL_ATIVO ? natal : semNatal);

export const menus = [
  { label: 'Dev.', name: 'Desenvolvimento', href: '/desenvolvimento', image: imagem(dev, devSemNatal) },
  { label: 'Suporte', href: '/suporte', image: imagem(suporte, suporteSemNatal) },
  { label: 'Compilação', href: '/compilacao', image: imagem(compilacao, compilacaoSemNatal) },
  { label: 'Digitalização', image: imagem(digitalizacao, digitalizacaoSemNatal) },
  { label: 'Licenças', href: '/licencas', image: imagem(licencas, licencasSemNatal) },
  // Sem `href`: abre um modal (ver `MODALS` em MenuCards.jsx).
  { label: 'Reuniões', modal: 'reunioes', image: imagem(reunioes, reunioesSemNatal) },
];

export const isSoon = (item) => !item.href && !item.modal;
