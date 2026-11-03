import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { lerArquivoExcel } from './leitor-excel.mjs';

test('fórmula compartilhada: a célula filha recebe a fórmula traduzida, não o endereço da mestra', async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'leitor-excel-'));
  try {
    const livro = new ExcelJS.Workbook();
    const aba = livro.addWorksheet('X');
    aba.getCell('G2').value = 1;
    aba.getCell('H2').value = 2;
    aba.getCell('G3').value = 3;
    aba.getCell('H3').value = 4;
    aba.getCell('G4').value = { formula: 'SUM(G2:G3)', result: 4, shareType: 'shared', ref: 'G4:H4' };
    aba.getCell('H4').value = { sharedFormula: 'G4', result: 6 };
    const arquivo = path.join(pasta, 'sintetica.xlsx');
    await livro.xlsx.writeFile(arquivo);

    const { abas } = await lerArquivoExcel(arquivo);
    assert.equal(abas[0].celula(4, 7).formula, 'SUM(G2:G3)');
    assert.equal(abas[0].celula(4, 8).formula, 'SUM(H2:H3)');
    assert.equal(abas[0].celula(4, 8).valor, 6);
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
});
