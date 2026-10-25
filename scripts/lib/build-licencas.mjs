// Lê as tabelas da página inicial do Sino.Licença. Sem acesso à rede: a API
// (server/api.mjs) baixa o HTML, aqui só se extrai o conteúdo.
//
// Cada linha das tabelas é um sistema de um cliente: "Cliente" (um link para
// /Clientes/Details/<id>), "Data" (dd/mm/aaaa) e "Sistema". O serial da licença
// fica só na página do cliente e nunca é lido.

export const TABELAS = {
  vencidas: 'Licenças Vencidas',
  proximas: 'Licenças Com Vencimento Próximo',
};

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// "C&#226;mara" -> "Câmara"
export const decodificarHtml = (texto) =>
  texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidade, codigo) => {
    if (codigo[0] === '#') {
      const numero = codigo[1].toLowerCase() === 'x' ? parseInt(codigo.slice(2), 16) : Number(codigo.slice(1));
      return String.fromCodePoint(numero);
    }
    return ENTIDADES[codigo.toLowerCase()] ?? entidade;
  });

const textoDaCelula = (html) => decodificarHtml(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

// "08/11/2026" -> "2026-11-08"; null se não for uma data válida.
export function dataIso(texto) {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;
  const [, dia, mes, ano] = partes;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  return data.getUTCDate() === Number(dia) && data.getUTCMonth() === Number(mes) - 1 ? `${ano}-${mes}-${dia}` : null;
}

/*
 * Linhas da tabela cuja legenda é `titulo`. Sem a tabela, o layout do site mudou:
 * erro, para a API não guardar uma lista vazia como se não houvesse licenças.
 */
export function lerTabela(html, titulo) {
  const legenda = html.search(new RegExp(`<caption>\\s*<h3>\\s*${titulo}\\s*</h3>`, 'i'));
  if (legenda === -1) throw new Error(`Tabela "${titulo}" não encontrada na página inicial.`);
  const tabela = html.slice(legenda, html.indexOf('</table>', legenda));
  const corpo = tabela.slice(tabela.search(/<tbody/i));

  const linhas = [];
  let invalidas = 0;
  for (const [, tr] of corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const celulas = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(([, conteudo]) => conteudo);
    const clienteId = Number(celulas[0]?.match(/\/Clientes\/Details\/(\d+)/i)?.[1]);
    const nome = textoDaCelula(celulas[0] ?? '');
    const vencimento = dataIso(textoDaCelula(celulas[1] ?? ''));
    const sistema = textoDaCelula(celulas[2] ?? '');
    if (!clienteId || !nome || !vencimento || !sistema) {
      invalidas += 1;
      continue;
    }
    linhas.push({ clienteId, nome, sistema, vencimento });
  }
  return { linhas, invalidas };
}

// "229 registro(s) encontrado(s)" -> 229; null se a página não trouxer o total.
export function lerTotalClientes(html) {
  const total = html.match(/(\d+)\s*registro\(s\)\s*encontrado/i)?.[1];
  return total ? Number(total) : null;
}

/*
 * Junta as duas tabelas numa lista só, sem linhas repetidas, da data mais antiga
 * para a mais nova. Quem separa vencidas de próximas é a página, pela data de
 * hoje: assim um dado guardado no cache continua certo.
 */
export function montarLicencas({ inicio, clientes }) {
  const vistas = new Set();
  const licencas = [];
  let invalidas = 0;

  for (const titulo of Object.values(TABELAS)) {
    const tabela = lerTabela(inicio, titulo);
    invalidas += tabela.invalidas;
    for (const linha of tabela.linhas) {
      const chave = `${linha.clienteId}|${linha.sistema}|${linha.vencimento}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      licencas.push(linha);
    }
  }

  licencas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.clienteId - b.clienteId);
  return { totalClientes: lerTotalClientes(clientes), licencas, invalidas };
}
