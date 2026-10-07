// Configuração única dos setores: troque `image` aqui quando tiver as imagens finais.

import imgDesenvolvimento from '../../assets/images/1.png';
import imgSuporte from '../../assets/images/2.png';
import imgLicencas from '../../assets/images/3.png';

export const sectors = [
  {
    label: 'DESENVOLVIMENTO',
    href: '/desenvolvimento',
    // image: 'https://picsum.photos/seed/desenvolvimento/640/480',
    image: imgDesenvolvimento,
  },
  {
    label: 'SUPORTE',
    href: '/suporte',
    // image: 'https://picsum.photos/seed/suporte/640/480',
    image: imgSuporte,
  },
  {
    label: 'LICENÇAS',
    href: '/licencas',
    // image: 'https://picsum.photos/seed/licencas/640/480',
    image: imgLicencas,
  },
];
