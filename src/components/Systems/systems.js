/*
 * Aplicativos da área de trabalho do computador da seção Sistemas.
 *
 * Os ícones e os nomes já vêm desenhados no wallpaper (desktop-*.webp, 1920×1080);
 * `area` é o retângulo clicável de cada um, em px dessa imagem (ícone + nome).
 * Como a tela tem a mesma proporção do wallpaper (16:9), a área vira % e
 * acompanha a tela em qualquer tamanho.
 */
export const WALLPAPER = { largura: 1920, altura: 1080 };

export const APPS = [
  {
    id: 'siscam',
    nome: 'Sino.Siscam',
    titulo: 'Sistema de Apoio ao Processo Legislativo',
    resumo:
      'Sua principal função é manter o controle sobre os documentos na Câmara, permitindo a padronização dos textos, busca rápida de documentos, controle de sua tramitação pela casa e outras facilidades de edição, além de auxiliar também na gestão dos documentos administrativos.',
    destaques: ['Siscam 9 - Versão mais nova formato website', 'Siscam 8 - Versão Desktop'],
    area: { x: 108, y: 88, w: 178, h: 176 },
  },
  {
    id: 'websites',
    nome: 'Websites',
    titulo: 'Websites Institucionais',
    resumo:
      'Portais rápidos, acessíveis e fáceis de atualizar, feitos para aproximar a instituição do cidadão.',
    destaques: [
      'Website de Câmaras',
      'Website de Prefeituras',
      'Gabinete Web',
      'Sino Recepção',
      'Controle de Viagens',
    ],
    area: { x: 108, y: 296, w: 178, h: 182 },
  },
  {
    id: 'cartorios',
    nome: 'Cartórios',
    titulo: 'Gestão para Cartórios',
    resumo:
      'Controle de atos, selos e atendimento, com segurança e agilidade no dia a dia do cartório.',
    destaques: [
      'Sistema de Firmas',
      'Sistema de Escrituras',
      'Sistema de NFE',
      'Selo Digital',
      'COAF',
      'Sino Digitalizador',
      'Sino Biometria',
    ],
    area: { x: 108, y: 518, w: 178, h: 162 },
  },
  {
    id: 'plenarium',
    nome: 'PlenariUM',
    titulo: 'Painel Eletrônico de Votação',
    resumo:
      'Registra presença e votos em tempo real, deixando as sessões plenárias mais transparentes.',
    destaques: ['Sino Plenarium'],
    area: { x: 108, y: 742, w: 178, h: 152 },
  },
  {
    id: 'consultas',
    nome: 'Consultas',
    titulo: 'Consultas e Outros Serviços',
    resumo:
      'Ferramentas sob medida para consultas, integrações e rotinas específicas de cada cliente.',
    destaques: [
      'Site de Consulta pública de normas e proposições',
      'Site Legislativo - Legislação Digital',
      'Site de Protocolo - Siave',
      'Site de Tramitações - Workflow',
    ],
    area: { x: 316, y: 306, w: 178, h: 172 },
  },
  {
    id: 'mobile',
    nome: 'Sino.Mobile',
    titulo: 'Aplicativos Mobile',
    resumo: 'Os principais serviços na palma da mão, em aplicativos leves para Android e iOS.',
    destaques: [
      'Acompanhamento de Sessões e Matérias',
      'Notificações em tempo real',
      'Experiência pensada para o celular',
    ],
    area: { x: 312, y: 530, w: 186, h: 150 },
  },
];

// Os slides: a área de trabalho primeiro, depois um por aplicativo.
export const SLIDES = [{ id: null, nome: 'Desktop' }, ...APPS.map(({ id, nome }) => ({ id, nome }))];

export const appPorId = (id) => APPS.find((app) => app.id === id) ?? null;

// Retângulo da área em % da tela (left/top/width/height).
export const areaEmPorcentagem = ({ x, y, w, h }) => ({
  left: (x / WALLPAPER.largura) * 100,
  top: (y / WALLPAPER.altura) * 100,
  width: (w / WALLPAPER.largura) * 100,
  height: (h / WALLPAPER.altura) * 100,
});
