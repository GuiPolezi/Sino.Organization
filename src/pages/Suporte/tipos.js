// Contratos de dados da página, em JSDoc (o projeto não usa TypeScript).

/**
 * Hoje o Milldesk fornece só a identidade do técnico. Os campos opcionais são
 * das próximas etapas (chamados, SLA, avaliação): o card mostra cada seção
 * apenas quando o dado dela existe.
 *
 * @typedef {object} Tecnico
 * @property {string} id               id fixo do site (scripts/data/support-team.json)
 * @property {string} nome
 * @property {string | null} funcao
 * @property {boolean} ausente         ausência temporária marcada no Milldesk
 * @property {string} avatarIniciais
 * @property {{ abertas: number, emAndamento: number, concluidasMes: number, atrasadas: number }} [tarefas]
 * @property {number} [slaCumprido]      % de 0 a 100
 * @property {number} [avaliacaoMedia]   de 0 a 5
 * @property {string} [ultimaAtividade]  data ISO
 * @property {string[]} [especialidades]
 *
 * @typedef {'curto' | 'topete' | 'coque' | 'moicano' | 'longo' | 'cacheado' | 'careca'} EstiloCabelo
 *
 * @typedef {object} AparenciaTecnico
 * @property {string} pele    hex
 * @property {string} camisa  hex
 * @property {string} calca   hex
 * @property {{ estilo: EstiloCabelo, cor: string, mechas?: string }} cabelo  mechas: cor das luzes
 * @property {'nenhum' | 'oculos' | 'headset' | 'bone' | 'maleta' | 'gravata'} acessorio
 * @property {'nenhuma' | 'bigode' | 'cavanhaque'} [barba]  usa a cor do cabelo
 * @property {string} [olhos]  hex; escuros quando ausente
 * @property {number} [altura] escala de 0.9 a 1.1
 * @property {boolean} [logo]  logo da empresa no peito esquerdo da camisa
 */

export {};
