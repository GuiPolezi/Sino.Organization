// Atualizações: os números de uma pessoa a partir das linhas importadas das
// planilhas (tabelas compilacao_planilhas e compilacao_planilhas_abas).
// Só contam as abas com o título da própria pessoa (titulo_confere).
import { BALDES, normalizar } from './tipos.mjs';
import { instanteDoItem, textoPublico } from './itens.mjs';

const chaveDoMes = (x) => x.ano * 100 + x.mes;
const textoDoMes = (x) => `${x.ano}-${String(x.mes).padStart(2, '0')}`;

const inteiro = (n) => Number.isInteger(n) && n >= 0;
const linhaValida = (l) => inteiro(l.compiladas) && inteiro(l.deficit) && BALDES.includes(l.balde);

function porBalde(linhas) {
  const soma = Object.fromEntries(BALDES.map((b) => [b, 0]));
  for (const l of linhas) soma[l.balde] += l.compiladas;
  return soma;
}

const somar = (linhas, campo) => linhas.reduce((total, l) => total + l[campo], 0);

// Cidades ativas da aba, sem repetir, na ordem da ação mais recente da pessoa
// (as sem ação vão para o fim). O nome vem do sistema quando há cidade_id.
function carteira(linhas, cidadesPorId, versoes) {
  const ultimaAcao = new Map();
  for (const item of versoes ?? []) {
    if (typeof item?.cidadeUf !== 'string') continue;
    const chave = normalizar(item.cidadeUf);
    const instante = instanteDoItem(item);
    if (instante > (ultimaAcao.get(chave) ?? '')) ultimaAcao.set(chave, instante);
  }
  const vistas = new Map();
  for (const l of linhas) {
    if (l.cidade_status !== 'ativa') continue;
    const bruta = cidadesPorId?.[l.cidade_id] ?? { nome: l.cidade, uf: l.uf };
    const uf = typeof bruta.uf === 'string' ? bruta.uf.trim().toUpperCase() : '';
    const cidade = { nome: textoPublico(bruta.nome, 60), uf: /^[A-Z]{2}$/.test(uf) ? uf : '' };
    if (!cidade.nome) continue;
    const chave = normalizar(`${cidade.nome}-${cidade.uf}`);
    if (!vistas.has(chave)) vistas.set(chave, cidade);
  }
  return [...vistas]
    .sort(([a], [b]) => (ultimaAcao.get(b) ?? '').localeCompare(ultimaAcao.get(a) ?? ''))
    .map(([, cidade]) => cidade);
}

/**
 * Resumo da pessoa, ou null quando as planilhas não foram lidas ou ela não tem
 * nenhuma aba que confere. `referencia` = hoje (AAAA-MM-DD).
 */
export function resumirPlanilhas(personagem, planilhas, referencia, { cidadesPorId, versoes, avisar = () => {} } = {}) {
  if (!planilhas) return null;
  const abas = (planilhas.abas ?? []).filter((a) => a.personagem === personagem && a.titulo_confere === true);
  if (abas.length === 0) return null;
  const conferem = new Set(abas.map(chaveDoMes));
  const linhas = (planilhas.linhas ?? []).filter((l) => l.personagem === personagem && conferem.has(chaveDoMes(l)));
  if (!linhas.every(linhaValida)) {
    avisar('linha de planilha fora do formato esperado');
    return null;
  }

  const [ano, mes] = referencia.split('-').map(Number);
  const atual = abas.find((a) => chaveDoMes(a) === ano * 100 + mes) ?? null;
  const base = atual ?? abas.reduce((a, b) => (chaveDoMes(b) > chaveDoMes(a) ? b : a));
  const daBase = linhas.filter((l) => chaveDoMes(l) === chaveDoMes(base));
  const doMes = atual ? daBase : null;

  return {
    mes: doMes ? somar(doMes, 'compiladas') : null,
    porTipoMes: doMes ? porBalde(doMes) : null,
    tudo: somar(linhas, 'compiladas'),
    porTipoTudo: porBalde(linhas),
    aguardando: { valor: somar(daBase, 'deficit'), fonte: 'planilha', mes: textoDoMes(base) },
    planilha: { mes: textoDoMes(base), importadaEm: base.importado_em ? new Date(base.importado_em).toISOString() : null },
    carteira: carteira(daBase, cidadesPorId, versoes),
  };
}
