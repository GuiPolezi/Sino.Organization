// Coordenadas em px na arte (1440×1024): `position` é o canto superior
// esquerdo do balão e `line` é o tracejado que liga o notebook a ele.
// Os textos do modal são provisórios, até o conteúdo final chegar.
export const SYSTEMS = [
  {
    id: 'sapl',
    label: 'SAPL',
    title: 'Sistema de Apoio ao Processo Legislativo',
    summary:
      'Organiza toda a tramitação da Câmara, da entrada da matéria até a publicação da norma, em um só lugar.',
    highlights: [
      'Protocolo e tramitação de matérias legislativas',
      'Pautas, sessões e atas integradas',
      'Consulta pública de normas e proposições',
    ],
    position: { x: 667, y: 282 },
    line: { x1: 717, y1: 492, x2: 742, y2: 345 },
  },
  {
    id: 'websites',
    label: 'Websites',
    title: 'Websites institucionais',
    summary:
      'Portais rápidos, acessíveis e fáceis de atualizar, feitos para aproximar a instituição do cidadão.',
    highlights: [
      'Layout responsivo e acessível',
      'Painel simples para publicar notícias',
      'Portal da transparência integrado',
    ],
    position: { x: 854, y: 331 },
    line: { x1: 765, y1: 522, x2: 855, y2: 418 },
  },
  {
    id: 'cartorios',
    label: 'Cartórios',
    title: 'Gestão para cartórios',
    summary:
      'Controle de atos, selos e atendimento, com segurança e agilidade no dia a dia do cartório.',
    highlights: [
      'Emissão e controle de atos e selos',
      'Fila de atendimento e protocolo',
      'Relatórios financeiros e de produtividade',
    ],
    position: { x: 941, y: 413 },
    line: { x1: 815, y1: 558, x2: 935, y2: 470 },
  },
  {
    id: 'painel-votacao',
    label: 'Painel de Votação',
    title: 'Painel eletrônico de votação',
    summary:
      'Registra presença e votos em tempo real, deixando as sessões plenárias mais transparentes.',
    highlights: [
      'Votação nominal e simbólica',
      'Presença e tempo de fala no telão',
      'Resultado integrado ao SAPL',
    ],
    position: { x: 983, y: 508 },
    line: { x1: 835, y1: 610, x2: 958, y2: 560 },
  },
  {
    id: 'consultas',
    label: 'Consultas e Outros',
    title: 'Consultas e outros serviços',
    summary:
      'Ferramentas sob medida para consultas, integrações e rotinas específicas de cada cliente.',
    highlights: [
      'Consultas públicas online',
      'Integração com sistemas já existentes',
      'Desenvolvimento sob demanda',
    ],
    position: { x: 997, y: 603 },
    line: { x1: 830, y1: 662, x2: 970, y2: 638 },
  },
  {
    id: 'mobile',
    label: 'Mobile',
    title: 'Aplicativos mobile',
    summary:
      'Os principais serviços na palma da mão, em aplicativos leves para Android e iOS.',
    highlights: [
      'Acompanhamento de sessões e matérias',
      'Notificações em tempo real',
      'Experiência pensada para o celular',
    ],
    position: { x: 998, y: 701 },
    line: { x1: 822, y1: 707, x2: 970, y2: 723 },
  },
];

// Tracejado das linhas, em px de tela: [traço, intervalo].
export const LINE_DASH = [14, 12];
