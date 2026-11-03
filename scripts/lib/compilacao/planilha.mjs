// Leitura de uma planilha de Atualizações (um arquivo por pessoa, uma aba por mês),
// sobre o modelo de leitor-excel.mjs. Funções puras: não abrem arquivo nem gravam.
// Regras: docs/compilacao-planilhas.md, seção 8.2 (local).
import { lerLinhas } from './planilha-linhas.mjs';
import { ErroPlanilha, endereco, identificarAba, letraDaColuna, nomeDoMes, normalizar } from './planilha-texto.mjs';

export { ErroPlanilha, identificarAba };

const MAX_LINHA_CABECALHO = 15;
const COLUNA_G = 7;
const COLUNA_H = 8;
const ULTIMA_COLUNA_UTIL = 10; // J
const ESPERADO = [
  [2, 'CLIENTE'],
  [3, 'DIARIO OFICIAL'],
  [5, 'SISCAM'],
  [7, 'DEFICIT'],
  [8, 'TOTAL'],
];

const textoNorm = (aba, l, c) => normalizar(aba.celula(l, c).texto);

function acharCabecalho(aba) {
  for (let l = 1; l <= MAX_LINHA_CABECALHO; l += 1) {
    const textos = Array.from({ length: 12 }, (_, i) => textoNorm(aba, l, i + 1));
    if (!['CLIENTE', 'DEFICIT', 'TOTAL'].every((t) => textos.includes(t))) continue;
    for (const [coluna, esperado] of ESPERADO) {
      if (textos[coluna - 1] !== esperado) {
        throw new ErroPlanilha(`${endereco(l, coluna)}: esperava o cabeçalho "${esperado}".`);
      }
    }
    return l;
  }
  throw new ErroPlanilha('Cabeçalho (CLIENTE, DÉFICIT, TOTAL) não encontrado nas primeiras linhas.');
}

function acharLinhaTotal(aba, depoisDe) {
  for (let l = depoisDe + 1; l <= aba.ultimaLinha; l += 1) {
    if (textoNorm(aba, l, 1) === 'TOTAL' || textoNorm(aba, l, 2) === 'TOTAL') return l;
  }
  throw new ErroPlanilha('Linha "Total" não encontrada depois do cabeçalho.');
}

// A fórmula do Total tem que somar da primeira linha de dados até a de cima (ou começar antes: H2).
function conferirFormula(celula, coluna, primeira, linhaTotal, avisos) {
  const onde = endereco(linhaTotal, coluna);
  const m = /SUM\(\s*\$?([A-Z]+)\$?(\d+)\s*:\s*\$?([A-Z]+)\$?(\d+)\s*\)/i.exec(celula.formula ?? '');
  if (!m) {
    if (celula.formula) avisos.push(`${onde}: fórmula do Total não reconhecida, intervalo não conferido.`);
    return;
  }
  const [letra, inicio, fim] = [letraDaColuna(coluna), Number(m[2]), Number(m[4])];
  if (m[1].toUpperCase() !== letra || m[3].toUpperCase() !== letra || inicio > primeira || fim !== linhaTotal - 1) {
    throw new ErroPlanilha(`${onde}: a fórmula não cobre as linhas ${primeira} a ${linhaTotal - 1}.`);
  }
}

// Soma das linhas = valor guardado da fórmula. Devolve o valor guardado (ou null).
function conferirSoma(aba, coluna, soma, primeira, linhaTotal, avisos) {
  const celula = aba.celula(linhaTotal, coluna);
  const onde = endereco(linhaTotal, coluna);
  conferirFormula(celula, coluna, primeira, linhaTotal, avisos);
  if (typeof celula.valor !== 'number') {
    avisos.push(`${onde}: sem valor guardado na fórmula, soma não conferida.`);
    return null;
  }
  if (celula.valor !== soma) {
    throw new ErroPlanilha(`${onde}: a soma das linhas (${soma}) difere do valor da fórmula (${celula.valor}).`);
  }
  return celula.valor;
}

function avisarNumerosForaDaTabela(aba, de, ate, avisos) {
  for (let l = de; l <= ate; l += 1) {
    for (let c = ULTIMA_COLUNA_UTIL + 1; c <= aba.ultimaColuna; c += 1) {
      if (typeof aba.celula(l, c).valor === 'number') {
        avisos.push(`${endereco(l, c)}: número depois da coluna J, ignorado (conferir se era DÉFICIT na coluna errada).`);
      }
    }
  }
}

const somar = (linhas, campo) => linhas.reduce((acc, l) => acc + l[campo], 0);

/**
 * Lê uma aba de mês. Lança ErroPlanilha se o layout ou as contas não fecham.
 * @param {import('./leitor-excel.mjs').Aba} aba
 * @param {{ tituloContem: string, modoDeficit: 'separado' | 'incluido' }} config
 */
export function lerAba(aba, config) {
  const id = identificarAba(aba.nome);
  if (!id) throw new ErroPlanilha(`O nome da aba "${aba.nome}" não é de um mês.`);
  const avisos = [];
  const periodo = textoNorm(aba, 2, 1);
  if (periodo && !periodo.includes(nomeDoMes(id.mes))) avisos.push('A2: o PERÍODO não é o mês da aba.');

  const cabecalho = acharCabecalho(aba);
  const linhaTotal = acharLinhaTotal(aba, cabecalho);
  const primeira = cabecalho + 1;
  const linhas = lerLinhas(aba, primeira, linhaTotal - 1, config.modoDeficit, avisos);
  avisarNumerosForaDaTabela(aba, primeira, linhaTotal - 1, avisos);

  const totais = { total: somar(linhas, 'total'), deficit: somar(linhas, 'deficit'), compiladas: somar(linhas, 'compiladas') };
  const deficitFormula = conferirSoma(aba, COLUNA_G, totais.deficit, primeira, linhaTotal, avisos);
  const totalFormula = conferirSoma(aba, COLUNA_H, totais.total, primeira, linhaTotal, avisos);

  const ativas = linhas.filter((l) => l.cidade_status !== 'saiu');
  const soDe = (campo) => ativas.reduce((acc, l) => acc + l.faltantes[campo].length, 0);
  return {
    nome: aba.nome,
    ...id,
    tituloConfere: normalizar(aba.celula(1, 1).texto).includes(normalizar(config.tituloContem)),
    linhas,
    totais,
    totalFormula,
    deficitFormula,
    faltantes: ativas.reduce((acc, l) => acc + l.faltantes.total, 0),
    fragmentosIlegiveis: soDe('naoEntendidos'),
    numerosSuspeitos: ativas.reduce((acc, l) => acc + l.faltantes.suspeitos, 0),
    avisos,
  };
}

/**
 * Lê todas as abas de mês. Aba com erro vira { nome, mes, ano, erro }; aba que não é de mês é ignorada com aviso.
 * Os totais da pessoa só somam abas sem erro cujo título confere (decisão P3).
 */
export function lerPlanilha(modelo, config) {
  const avisos = [];
  const vistas = new Set();
  const abas = [];
  for (const aba of modelo.abas) {
    const id = identificarAba(aba.nome);
    if (!id) {
      avisos.push(`Aba "${aba.nome}" ignorada: o nome não é de um mês.`);
      continue;
    }
    const chave = `${id.ano}-${id.mes}`;
    try {
      if (vistas.has(chave)) throw new ErroPlanilha(`Há duas abas para ${id.mes}/${id.ano}.`);
      vistas.add(chave);
      abas.push(lerAba(aba, config));
    } catch (erro) {
      if (!(erro instanceof ErroPlanilha)) throw erro;
      abas.push({ nome: aba.nome, ...id, erro: erro.message });
    }
  }
  abas.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const contadas = abas.filter((a) => !a.erro && a.tituloConfere);
  const totais = {
    total: contadas.reduce((acc, a) => acc + a.totais.total, 0),
    deficit: contadas.reduce((acc, a) => acc + a.totais.deficit, 0),
    compiladas: contadas.reduce((acc, a) => acc + a.totais.compiladas, 0),
    abasContadas: contadas.length,
  };
  return { abas, avisos, totais };
}
