// Contratos de dados da página, em JSDoc (o projeto não usa TypeScript).

/**
 * @typedef {'disponivel' | 'em_atendimento' | 'ausente'} StatusTecnico
 *
 * @typedef {object} Tecnico
 * @property {string} id
 * @property {string} nome
 * @property {string} funcao
 * @property {string} equipe
 * @property {StatusTecnico} status
 * @property {string} avatarIniciais
 * @property {{ abertas: number, emAndamento: number, concluidasMes: number, atrasadas: number }} tarefas
 * @property {number} slaCumprido      % de 0 a 100
 * @property {number} avaliacaoMedia   de 0 a 5
 * @property {string} ultimaAtividade  data ISO
 * @property {string[]} especialidades
 *
 * @typedef {object} AparenciaTecnico
 * @property {string} pele    hex
 * @property {string} camisa  hex
 * @property {string} calca   hex
 * @property {{ estilo: 'curto' | 'coque' | 'moicano' | 'careca' | 'longo', cor: string }} cabelo
 * @property {'nenhum' | 'oculos' | 'headset' | 'bone' | 'maleta' | 'gravata'} acessorio
 * @property {number} [altura] escala de 0.9 a 1.1
 */

export {};
