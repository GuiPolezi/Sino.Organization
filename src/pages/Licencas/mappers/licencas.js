// Regras de prazo das licenças. Funções puras: a data de "hoje" sempre chega
// por parâmetro, para o teste e a página falarem da mesma coisa.

const DIA_MS = 86_400_000;

// Licenças que vencem em até N dias contam como "vencimento próximo".
export const JANELA_PROXIMO_DIAS = 60;

// Quantos cards cada seção mostra antes do "Mostrar mais".
export const LIMITE_INICIAL = 3;

// 'YYYY-MM-DD' -> número do dia (em UTC, para o horário de verão não somar 23h).
const paraDia = (iso) => {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia) / DIA_MS;
};

const doDia = (dia) => new Date(dia * DIA_MS).toISOString().slice(0, 10);

// Data local do navegador em 'YYYY-MM-DD'.
export const hojeISO = (agora = new Date()) =>
  [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0'),
  ].join('-');

export const somarDias = (iso, dias) => doDia(paraDia(iso) + dias);

export const diasAte = (vencimento, hoje) => paraDia(vencimento) - paraDia(hoje);

// "Câmara Municipal de Araras" -> "camara-municipal-de-araras"
export const slugify = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const formatarData = (iso) => iso.split('-').reverse().join('/');

export function descreverPrazo(dias) {
  if (dias < -1) return `Venceu há ${-dias} dias`;
  if (dias === -1) return 'Venceu ontem';
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

/*
 * Separa as licenças em vencidas (antes de hoje) e com vencimento próximo
 * (de hoje até a janela). As que vencem depois disso ficam de fora.
 * Vencidas: a que venceu por último primeiro. Próximas: a mais urgente primeiro.
 */
export function classificarLicencas(clientes, hoje, janela = JANELA_PROXIMO_DIAS) {
  const vencidas = [];
  const proximas = [];

  for (const cliente of clientes) {
    const dias = diasAte(cliente.vencimento, hoje);
    const item = { ...cliente, slug: cliente.slug ?? slugify(cliente.nome), dias };
    if (dias < 0) vencidas.push(item);
    else if (dias <= janela) proximas.push(item);
  }

  vencidas.sort((a, b) => b.dias - a.dias);
  proximas.sort((a, b) => a.dias - b.dias);
  return { vencidas, proximas };
}

/*
 * Linhas do Sino.Licença (uma por sistema de um cliente) -> um card por cliente
 * e data de vencimento: os sistemas que vencem no mesmo dia ficam juntos. Um
 * cliente com sistemas vencendo em dias diferentes aparece uma vez por data.
 * O slug vem do nome; se dois clientes derem o mesmo slug, o id entra no fim.
 */
export function agruparLicencas(linhas) {
  const idsPorSlug = new Map();
  for (const { clienteId, nome } of linhas) {
    const slug = slugify(nome);
    if (!idsPorSlug.has(slug)) idsPorSlug.set(slug, new Set());
    idsPorSlug.get(slug).add(clienteId);
  }
  const slugDe = (clienteId, nome) => {
    const slug = slugify(nome);
    return idsPorSlug.get(slug).size > 1 ? `${slug}-${clienteId}` : slug;
  };

  const grupos = new Map();
  for (const { clienteId, nome, sistema, vencimento } of linhas) {
    const chave = `${clienteId}-${vencimento}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, { chave, clienteId, nome, slug: slugDe(clienteId, nome), sistemas: [], vencimento });
    }
    const { sistemas } = grupos.get(chave);
    if (!sistemas.includes(sistema)) sistemas.push(sistema);
  }
  return [...grupos.values()];
}

// Caminho da página de licença do cliente.
export const caminhoCliente = (slug) => `/licencas/${slug}`;
