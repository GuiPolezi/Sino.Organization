// Percorre as linhas de uma aba (entre o cabeçalho e o "Total") e monta uma
// linha por cidade × tipo. Trabalha só sobre o modelo de leitor-excel.mjs.
import { extrairFaltantes, uniaoFaltantes } from './faltantes.mjs';
import { ErroPlanilha, endereco, lerInteiro, lerNomeDaCidade } from './planilha-texto.mjs';
import { escolherSigla, traduzirSigla } from './siglas.mjs';

const COL = { B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };
const DATA_NO_COMECO = /^\s*\d+\s*,\s*\d{1,2}\/\d{1,2}\/\d{2,4}/;

const algumVermelho = (celula) => celula.trechos.some((t) => t.vermelho && t.texto.trim());

// Texto em vermelho da célula (as normas faltantes). Se a célula inteira é vermelha
// numa linha de tipo, tira o "número, data" do começo: é a última norma, não faltante.
function vermelhosDe(celula, linhaDeTipo) {
  const vermelhos = celula.trechos.filter((t) => t.vermelho).map((t) => t.texto);
  const inteira = vermelhos.length > 0 && vermelhos.length === celula.trechos.length;
  return inteira && linhaDeTipo ? vermelhos.map((t) => t.replace(DATA_NO_COMECO, '')) : vermelhos;
}

const ultimoNumero = (celula) => {
  const m = /^\s*(\d+)/.exec(celula.texto);
  return m ? Number(m[1]) : null;
};

function novaLinha(aba, r, bloco, modo, avisos) {
  const c = aba.celula(r, COL.C);
  const e = aba.celula(r, COL.E);
  const d = aba.celula(r, COL.D);
  const f = aba.celula(r, COL.F);
  const g = aba.celula(r, COL.G);
  const sigla = escolherSigla(c.texto, e.texto).replace(/\s+/g, ' ').toUpperCase();
  const onde = endereco(r, c.texto.trim() && c.texto.trim() !== '-' ? COL.C : COL.E);
  let tipo;
  try {
    tipo = traduzirSigla(sigla);
  } catch (erro) {
    throw new ErroPlanilha(`${onde}: ${erro.message}`);
  }
  const total = lerInteiro(aba.celula(r, COL.H), endereco(r, COL.H), avisos);
  const deficit = lerInteiro(g, endereco(r, COL.G), avisos);
  if (modo === 'incluido' && deficit > total) {
    throw new ErroPlanilha(`${endereco(r, COL.G)}: DÉFICIT (${deficit}) maior que o TOTAL (${total}) no modo "incluido".`);
  }
  return {
    cidade: bloco.cidade,
    uf: bloco.uf,
    cidade_status: bloco.status,
    cidadeId: null,
    sigla,
    moduloId: tipo.moduloId,
    balde: tipo.balde,
    total,
    deficit,
    compiladas: modo === 'incluido' ? total - deficit : total,
    par_em_alerta: [c, e].some((x) => algumVermelho(x) || x.fundo === 'salmao') || g.fundo === 'vermelho',
    sigla_duvidosa: tipo.flags.sigla_duvidosa,
    nao_municipal: tipo.flags.nao_municipal,
    linha: r,
    vermelhoD: vermelhosDe(d, true),
    vermelhoF: vermelhosDe(f, true),
    ultimaNorma: Math.max(ultimoNumero(d) ?? -1, ultimoNumero(f) ?? -1),
  };
}

// Fecha a linha: roda o leitor de faltantes e tira os campos de trabalho.
function fechar({ vermelhoD, vermelhoF, ultimaNorma, ...linha }) {
  const opcoes = { ultimaNorma: ultimaNorma >= 0 ? ultimaNorma : null };
  const doDO = extrairFaltantes(vermelhoD, opcoes);
  const siscam = extrairFaltantes(vermelhoF, opcoes);
  const numeros = uniaoFaltantes(doDO.numeros, siscam.numeros);
  return {
    ...linha,
    faltantes: {
      total: numeros.length,
      doDO: doDO.contagem,
      siscam: siscam.contagem,
      numeros,
      suspeitos: doDO.suspeitos + siscam.suspeitos,
      naoEntendidos: [...doDO.naoEntendidos, ...siscam.naoEntendidos],
    },
  };
}

function continuar(aba, r, atual, avisos) {
  atual.vermelhoD.push(...vermelhosDe(aba.celula(r, COL.D), false));
  atual.vermelhoF.push(...vermelhosDe(aba.celula(r, COL.F), false));
  for (const coluna of [COL.G, COL.H]) {
    if (typeof aba.celula(r, coluna).valor === 'number') {
      avisos.push(`${endereco(r, coluna)}: número em linha de continuação, ignorado.`);
    }
  }
}

/** Linhas de tipo da aba, de `de` até `ate` (inclusive). */
export function lerLinhas(aba, de, ate, modo, avisos) {
  const abertas = [];
  const vistos = new Set();
  let bloco = null;
  for (let r = de; r <= ate; r += 1) {
    const nome = aba.celula(r, COL.B);
    if (!nome.escrava && nome.texto.trim()) bloco = lerNomeDaCidade(nome.texto);
    const c = aba.celula(r, COL.C);
    const e = aba.celula(r, COL.E);
    if (escolherSigla(c.texto, e.texto)) {
      if (!bloco) throw new ErroPlanilha(`${endereco(r, COL.B)}: linha de tipo sem cidade acima.`);
      const linha = novaLinha(aba, r, bloco, modo, avisos);
      const chave = `${linha.cidade}|${linha.uf}|${linha.sigla}`;
      if (vistos.has(chave)) throw new ErroPlanilha(`Linha ${r}: o par cidade × sigla está repetido na aba.`);
      vistos.add(chave);
      abertas.push(linha);
    } else if (abertas.length > 0) {
      continuar(aba, r, abertas.at(-1), avisos);
    }
  }
  return abertas.map(fechar);
}
