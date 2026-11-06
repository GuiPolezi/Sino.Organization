// Configuração única dos menus da home: troque `image` aqui quando tiver as imagens finais.
// Item sem `href` nem `modal` ainda não foi desenvolvido: aparece apagado, com "EM BREVE".

import imgDesenvolvimento from '../../assets/images/dev.png';
import imgSuporte from '../../assets/images/suporte.png';
import imgCompilacao from '../../assets/images/juiz.png';
import imgLicencas from '../../assets/images/license.png';
import imgReuniao from '../../assets/images/meeting.png';

export const menus = [
  {
    title: 'Sistemas',
    items: [{ label: 'Licenças', href: '/licencas', image: imgLicencas }],
  },
  {
    title: 'Setores',
    items: [
      {
        label: 'Dev.',
        name: 'Desenvolvimento',
        href: '/desenvolvimento',
        image: imgDesenvolvimento,
      },
      { label: 'Suporte', href: '/suporte', image: imgSuporte },
      { label: 'Compilação', href: '/compilacao', image: imgCompilacao },
      { label: 'Digitalização' },
    ],
  },
  {
    title: 'Utils',
    // Sem `href`: abre um modal (ver `MODALS` em MenusNav.jsx).
    items: [{ label: 'Reuniões', modal: 'reunioes', image: imgReuniao }],
  },
];

export const isSoon = (item) => !item.href && !item.modal;
