// Texto do relatório do dry-run (só local, no terminal). Pode citar cidades;
// nada disto é gravado.
const nome = (aba) => `${String(aba.mes).padStart(2, '0')}/${aba.ano}`;
const col = (valor, largura) => String(valor).padStart(largura);

function linhaDaAba(aba) {
  if (aba.erro) return `${nome(aba)}  ERRO: ${aba.erro}`;
  const t = aba.totais;
  // TOTAL (H) e DÉFICIT (G) são conferidos em separado: cada um pode estar sem valor guardado.
  const conferencia = (valorFormula, soma) => (valorFormula === soma ? 'ok' : 'sem valor guardado');
  const confere = `H ${conferencia(aba.totalFormula, t.total)} · G ${conferencia(aba.deficitFormula, t.deficit)}`;
  const dono = aba.tituloConfere ? '' : '  [título de outra pessoa: não conta]';
  return [
    nome(aba),
    `linhas ${col(aba.linhas.length, 3)}`,
    `TOTAL ${col(t.total, 4)}`,
    `DÉFICIT ${col(t.deficit, 3)}`,
    `compiladas ${col(t.compiladas, 4)}`,
    `faltantes ${col(aba.faltantes, 5)}`,
    `ilegíveis ${col(aba.fragmentosIlegiveis, 2)}`,
    `suspeitos ${col(aba.numerosSuspeitos, 3)}`,
    `Σ=fórmula: ${confere}${dono}`,
  ].join('  ');
}

export function montarRelatorio({ pessoa, arquivo, resultado, modoDeficit, gravar }) {
  const linhas = [
    `Importação de planilha: ${pessoa} (modo do déficit: ${modoDeficit}) — ${gravar ? 'GRAVANDO' : 'dry-run, nada é gravado'}`,
    `Arquivo: ${arquivo}`,
    '',
    ...resultado.abas.map(linhaDaAba),
    '',
    `Abas lidas: ${resultado.abas.filter((a) => !a.erro).length} de ${resultado.abas.length} (contadas para a pessoa: ${resultado.totais.abasContadas}).`,
    `Pessoa (abas que contam): TOTAL ${resultado.totais.total}, DÉFICIT ${resultado.totais.deficit}, compiladas ${resultado.totais.compiladas}.`,
  ];
  const avisos = [
    ...resultado.avisos,
    ...resultado.abas.flatMap((a) => (a.avisos ?? []).map((x) => `${nome(a)} ${x}`)),
  ];
  if (avisos.length) linhas.push('', `Avisos (${avisos.length}):`, ...avisos.map((a) => `  - ${a}`));
  linhas.push('', 'cidade_id: não resolvido nesta etapa (gravado como nulo).');
  return linhas.join('\n');
}
