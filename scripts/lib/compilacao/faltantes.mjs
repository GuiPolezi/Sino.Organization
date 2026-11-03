// Leitor tolerante da lista de normas faltantes (o texto em vermelho dentro das
// colunas D e F das planilhas). Cada pessoa escreve de um jeito, então o leitor
// aceita as formas conhecidas e, no que não entende, não chuta: anota um
// fragmento curto para o relatório local e segue.
//
// Só devolve números, contagens e fragmentos curtos. As notas escritas ao lado
// dos números são descartadas (só se conta que havia nota).

const MAX_FAIXA = 1000;
const MAX_FRAGMENTO = 30;

const ANO = '(\\d{2}|\\d{4})';
// Da forma mais específica para a mais simples (cada uma lê o começo do fragmento).
const FORMAS = [
  { tipo: 'faixaEntreAnos', regex: new RegExp(`^(\\d+)\\s*/\\s*${ANO}\\s*[-–]\\s*(\\d+)\\s*/\\s*${ANO}(?!\\d)`) },
  { tipo: 'faixaAno', regex: new RegExp(`^(\\d+)\\s*[-–]\\s*(\\d+)\\s*/\\s*${ANO}(?!\\d)`) },
  { tipo: 'faixa', regex: /^(\d+)\s*[-–]\s*(\d+)(?![\d/])/ },
  { tipo: 'unicoAno', regex: new RegExp(`^(\\d+)\\s*/\\s*${ANO}(?!\\d)`) },
  { tipo: 'unico', regex: /^(\d+)[A*]?(?![\p{L}\d])/u },
];

const NOTA_SOZINHA = /^(\*+|sem\b|arquivos?\b|com\b)/i;
const COMECA_COM_LETRA = /^[\p{L}[*]/u;

const chave = ([numero, ano]) => `${numero}/${ano ?? ''}`;
// O mesmo número escrito com ano e sem ano na mesma lista é a mesma norma:
// fica só a forma com ano.
function semRepetirSemAno(pares) {
  const comAno = new Set(pares.filter(([, ano]) => ano !== null).map(([numero]) => numero));
  return pares.filter(([numero, ano]) => ano !== null || !comAno.has(numero));
}

const anoCompleto = (texto) => (texto.length === 2 ? 2000 + Number(texto) : Number(texto));

function faixa(inicio, fim, ano) {
  if (fim < inicio || fim - inicio + 1 > MAX_FAIXA) return null;
  return Array.from({ length: fim - inicio + 1 }, (_, i) => [inicio + i, ano]);
}

// Lista de [número, ano] do começo do fragmento, ou null se não dá para ler.
function lerInicio(tipo, m) {
  switch (tipo) {
    case 'faixaEntreAnos': {
      const [a1, a2] = [anoCompleto(m[2]), anoCompleto(m[4])];
      return a1 === a2 ? faixa(Number(m[1]), Number(m[3]), a1) : null;
    }
    case 'faixaAno':
      return faixa(Number(m[1]), Number(m[2]), anoCompleto(m[3]));
    case 'faixa':
      return faixa(Number(m[1]), Number(m[2]), null);
    case 'unicoAno':
      return [[Number(m[1]), anoCompleto(m[2])]];
    default:
      return [[Number(m[1]), null]];
  }
}

/** @returns {{ lista: number[][], nota: boolean } | null} null = fragmento ilegível */
function lerFragmento(fragmento) {
  const texto = fragmento.replace(/(\d)\s+(?:até|a|à)\s+(\d)/g, '$1-$2');
  for (const { tipo, regex } of FORMAS) {
    const m = regex.exec(texto);
    if (!m) continue;
    const lista = lerInicio(tipo, m);
    if (!lista) return null;
    const resto = texto.slice(m[0].length).replace(/^[\s.,–-]+/, '');
    if (!resto) return { lista, nota: false };
    return COMECA_COM_LETRA.test(resto) ? { lista, nota: true } : null;
  }
  return null;
}

function separarFragmentos(textos) {
  return textos
    .filter((t) => typeof t === 'string')
    .join(',')
    .replace(/(\d)\s+e\s+(\d)/gi, '$1,$2')
    .split(/[,;()\n]/)
    .map((f) => f.trim().replace(/^[\s.–-]+/, '').replace(/[\s.]+$/, ''))
    .filter(Boolean);
}

/**
 * @param {(string | null | undefined)[]} textos trechos vermelhos de uma célula
 * @param {{ ultimaNorma?: number | null }} [opcoes] maior número de norma da linha, para achar suspeitos
 * @returns {{ numeros: number[][], contagem: number, suspeitos: number, comNota: number, naoEntendidos: string[] }}
 */
export function extrairFaltantes(textos, { ultimaNorma = null } = {}) {
  const achados = new Map();
  const naoEntendidos = [];
  let comNota = 0;

  for (const fragmento of separarFragmentos(textos)) {
    const lido = lerFragmento(fragmento);
    if (lido) {
      if (lido.nota) comNota += 1;
      for (const par of lido.lista) achados.set(chave(par), par);
    } else if (NOTA_SOZINHA.test(fragmento)) {
      comNota += 1;
    } else {
      naoEntendidos.push(fragmento.slice(0, MAX_FRAGMENTO));
    }
  }

  const todos = semRepetirSemAno([...achados.values()]);
  const suspeito = ([numero, ano]) => ano === null && Number.isFinite(ultimaNorma) && numero > ultimaNorma;
  const numeros = todos.filter((par) => !suspeito(par));
  return {
    numeros,
    contagem: numeros.length,
    suspeitos: todos.length - numeros.length,
    comNota,
    naoEntendidos,
  };
}

/** União de listas de [número, ano], sem repetir, na ordem em que aparecem. */
export function uniaoFaltantes(...listas) {
  const mapa = new Map();
  for (const par of listas.flat()) mapa.set(chave(par), par);
  return semRepetirSemAno([...mapa.values()]);
}
