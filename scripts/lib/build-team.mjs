// Monta a equipe pública de uma página (/suporte, /desenvolvimento) a partir da
// resposta de listAgents e da lista de quem aparece nela (scripts/data/*.json).
// Só saem daqui os campos que o site mostra: e-mail, telefone, login e custo
// dos técnicos ficam para trás.

export class TeamError extends Error {}

const ID_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// A API usa "Sim"/"Não" em listAgents e booleanos em outras listagens.
const isYes = (value) => value === true || String(value ?? '').trim().toLowerCase() === 'sim';
const clean = (value) => String(value ?? '').trim();

const checkRoster = (roster, file) => {
  if (!Array.isArray(roster) || roster.length === 0) {
    throw new TeamError(`${file} precisa de uma lista "team" com ao menos um técnico.`);
  }

  const ids = new Set();
  const agents = new Set();
  for (const entry of roster) {
    if (!entry || typeof entry !== 'object') {
      throw new TeamError(`Cada técnico em ${file} precisa ser { "id": ..., "agent": ... }.`);
    }

    const { id, agent } = entry;
    // Sem clean(): o id vai como está para o site, então espaços em volta também são inválidos.
    if (typeof id !== 'string' || !ID_FORMAT.test(id)) {
      throw new TeamError(`Id inválido em ${file}: "${id}" (use minúsculas, números e hífen).`);
    }
    if (!clean(agent)) throw new TeamError(`O técnico "${id}" está sem "agent" em ${file}.`);
    if (ids.has(id)) throw new TeamError(`Id repetido em ${file}: "${id}".`);
    if (agents.has(clean(agent))) throw new TeamError(`Técnico repetido em ${file}: "${agent}".`);
    ids.add(id);
    agents.add(clean(agent));
  }
};

const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

// "Guilherme Anderson dos Santos" -> ["Guilherme", "Guilherme Anderson"]. Uma
// partícula não conta como segundo nome: "Ana de Souza" -> "Ana de Souza".
const shortForms = (name) => {
  const parts = name.split(/\s+/);
  const second = parts.findIndex((part, index) => index > 0 && !PARTICLES.has(part.toLowerCase()));
  return [parts[0], second === -1 ? name : parts.slice(0, second + 1).join(' ')];
};

/*
 * Abrevia os nomes para o primeiro nome. Quem divide o primeiro nome com outra
 * pessoa da lista fica com o primeiro e o segundo; se nem assim der para
 * distinguir, o nome fica inteiro.
 */
export function shortenNames(names) {
  const repeated = (values) => new Set(values.filter((value, index) => values.indexOf(value) !== index));
  const forms = names.map(shortForms);
  const sameFirst = repeated(forms.map(([first]) => first));
  const sameSecond = repeated(forms.map(([, second]) => second));

  return names.map((name, index) => {
    const [first, second] = forms[index];
    if (!sameFirst.has(first)) return first;
    return sameSecond.has(second) ? name : second;
  });
}

/*
 * records: registros de listAgents. roster: [{ id, agent }], em que `agent` é
 * o nome exato do técnico no Milldesk (a API não tem outro identificador) e
 * `id` é o nosso, fixo, que liga o técnico à aparência do boneco.
 * Qualquer técnico que não possa ser publicado com certeza interrompe tudo:
 * melhor manter o arquivo atual do que publicar uma equipe incompleta.
 * file: nome do arquivo da lista, para as mensagens de erro. shortNames: publica
 * os nomes abreviados (ver shortenNames) em vez do nome inteiro do Milldesk.
 */
export function buildTeam(records, roster, { file = 'support-team.json', shortNames = false } = {}) {
  checkRoster(roster, file);

  const team = roster.map(({ id, agent }) => {
    const matches = records.filter((record) => clean(record?.agent) === clean(agent));
    if (matches.length === 0) {
      throw new TeamError(
        `Técnico "${agent}" não encontrado no Milldesk: confira o nome em ${file}.`,
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
        `Técnico "${agent}" está desabilitado no Milldesk: reabilite-o ou tire-o de ${file}.`,
      );
    }

    return {
      id,
      name: clean(record.agent),
      role: clean(record.post) || null,
      absent: isYes(record.temporary_absence),
    };
  });
  if (!shortNames) return team;

  const names = shortenNames(team.map((member) => member.name));
  return team.map((member, index) => ({ ...member, name: names[index] }));
}
