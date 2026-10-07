/** @import { Tecnico } from '../tipos.js' */

const iniciais = (nome) => {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes.at(-1)[0] : '';
  return (partes[0][0] + ultima).toUpperCase();
};

/**
 * Único lugar que conhece o formato do Mildesk.
 * @returns {Tecnico}
 */
export function mapearTecnico(raw) {
  return {
    id: raw.id_usuario,
    nome: raw.nome,
    funcao: raw.cargo,
    equipe: raw.departamento,
    status: raw.situacao,
    avatarIniciais: iniciais(raw.nome),
    tarefas: {
      abertas: raw.chamados_abertos,
      emAndamento: raw.chamados_andamento,
      concluidasMes: raw.concluidos_mes,
      atrasadas: raw.atrasados,
    },
    slaCumprido: raw.sla_percentual,
    avaliacaoMedia: raw.nota_media,
    ultimaAtividade: raw.ultima_interacao,
    especialidades: raw.habilidades,
  };
}
