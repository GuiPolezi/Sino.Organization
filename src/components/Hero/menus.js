// Configuração única dos menus da home.
// Item sem `href` nem `modal` ainda não foi desenvolvido: aparece apagado, com "EM BREVE".

import imgDesenvolvimento from '../../assets/images/dev.png';
import imgSuporte from '../../assets/images/suporte.png';
import imgCompilacao from '../../assets/images/juiz.png';
import imgLicencas from '../../assets/images/license.png';
import imgReuniao from '../../assets/images/meeting.png';

/*
 * Fotos dos banners do hover: salve em src/assets/images/menus/ com o nome do
 * item (licencas, dev, suporte, compilacao, reunioes), em jpg, png, webp ou
 * avif. Enquanto a foto não existir, o banner usa a imagem provisória. Itens
 * "em breve" não têm banner: só trocam o nome por "EM BREVE".
 */
// Só os nomes esperados: outra imagem salva na pasta não entra no build.
const BANNER_FILES = import.meta.glob(
  '../../assets/images/menus/{licencas,dev,suporte,compilacao,reunioes}.{jpg,jpeg,png,webp,avif}',
  { eager: true, import: 'default' },
);

const bannerFor = (name, fallback) => {
  const match = Object.entries(BANNER_FILES).find(
    ([path]) => path.split('/').pop().replace(/\.\w+$/, '') === name,
  );
  return match ? match[1] : fallback;
};

export const menus = [
  {
    title: 'Sistemas',
    items: [
      { label: 'Licenças', href: '/licencas', banner: bannerFor('licencas', imgLicencas) },
    ],
  },
  {
    title: 'Setores',
    items: [
      {
        label: 'Dev.',
        href: '/desenvolvimento',
        banner: bannerFor('dev', imgDesenvolvimento),
      },
      { label: 'Suporte', href: '/suporte', banner: bannerFor('suporte', imgSuporte) },
      {
        label: 'Compilação',
        href: '/compilacao',
        banner: bannerFor('compilacao', imgCompilacao),
      },
      { label: 'Digitalização' },
    ],
  },
  {
    title: 'Utils',
    // Sem `href`: abre um modal (ver `MODALS` em MenusNav.jsx).
    items: [
      { label: 'Reuniões', modal: 'reunioes', banner: bannerFor('reunioes', imgReuniao) },
    ],
  },
];

export const isSoon = (item) => !item.href && !item.modal;
