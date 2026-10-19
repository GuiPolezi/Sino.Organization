// Configuração única dos setores: troque `image` aqui quando tiver as imagens finais.

import imgDesenvolvimento from '../../assets/images/dev.png';
import imgSuporte from '../../assets/images/suporte.png';
import imgLicencas from '../../assets/images/license.png';

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
  {
    label: 'REUNIÕES',
    // Sem `href`: abre um modal (ver `modal` em SectorsList.jsx).
    modal: 'reunioes',
    // Imagem provisória (aleatória, fixa pela seed). Trocar pela final em 4:3.
    image: 'https://picsum.photos/seed/sino-reunioes/640/480',
  },
];
