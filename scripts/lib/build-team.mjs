// Monta a equipe pública da página /suporte a partir da resposta de listAgents
// e da lista de técnicos de suporte (scripts/data/support-team.json).
// Só saem daqui os campos que o site mostra: e-mail, telefone, login e custo
// dos técnicos ficam para trás.

export class TeamError extends Error {}

const ID_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// A API usa "Sim"/"Não" em listAgents e booleanos em outras listagens.
const isYes = (value) => value === true || String(value ?? '').trim().toLowerCase() === 'sim';
const clean = (value) => String(value ?? '').trim();

const checkRoster = (roster) => {
  if (!Array.isArray(roster) || roster.length === 0) {
    throw new TeamError('support-team.json precisa de uma lista "team" com ao menos um técnico.');
  }

  const ids = new Set();
  const agents = new Set();
  for (const entry of roster) {
    if (!entry || typeof entry !== 'object') {
      throw new TeamError('Cada técnico em support-team.json precisa ser { "id": ..., "agent": ... }.');
    }

    const { id, agent } = entry;
    // Sem clean(): o id vai como está para o site, então espaços em volta também são inválidos.
    if (typeof id !== 'string' || !ID_FORMAT.test(id)) {
      throw new TeamError(`Id inválido em support-team.json: "${id}" (use minúsculas, números e hífen).`);
    }
    if (!clean(agent)) throw new TeamError(`O técnico "${id}" está sem "agent" em support-team.json.`);
    if (ids.has(id)) throw new TeamError(`Id repetido em support-team.json: "${id}".`);
    if (agents.has(clean(agent))) throw new TeamError(`Técnico repetido em support-team.json: "${agent}".`);
    ids.add(id);
    agents.add(clean(agent));
  }
};

/*
 * records: registros de listAgents. roster: [{ id, agent }], em que `agent` é
 * o nome exato do técnico no Milldesk (a API não tem outro identificador) e
 * `id` é o nosso, fixo, que liga o técnico à aparência do boneco.
 * Qualquer técnico que não possa ser publicado com certeza interrompe tudo:
 * melhor manter o arquivo atual do que publicar uma equipe incompleta.
 */
export function buildTeam(records, roster) {
  checkRoster(roster);

  return roster.map(({ id, agent }) => {
    const matches = records.filter((record) => clean(record?.agent) === clean(agent));
    if (matches.length === 0) {
      throw new TeamError(
        `Técnico "${agent}" não encontrado no Milldesk: confira o nome em support-team.json.`,
      );
    }
    if (matches.length > 1) {
      throw new TeamError(
        `Há ${matches.length} técnicos chamados "${agent}" no Milldesk: não dá para saber qual é.`,
      );
    }

    const [record] = matches;
    if (!isYes(record.enabled)) {
      throw new TeamError(
        `Técnico "${agent}" está desabilitado no Milldesk: reabilite-o ou tire-o de support-team.json.`,
      );
    }

    return {
      id,
      name: clean(record.agent),
      role: clean(record.post) || null,
      absent: isYes(record.temporary_absence),
    };
  });
}
