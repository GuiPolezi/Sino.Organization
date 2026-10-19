import { somarDias } from './mappers/licencas.js';

/*
 * DADOS FICTÍCIOS — trocar pela API de licenças quando ela existir.
 * O vencimento é relativo a hoje (`prazo` em dias), para a página sempre ter
 * licenças vencidas e próximas de vencer, seja qual for a data.
 */

// Endereço do sistema de licenças (botão "Site Licenças"). Ainda não definido.
export const SITE_LICENCAS_URL = '#';

export const TOTAL_CLIENTES_REGISTRADOS = 229;

const FICTICIOS = [
  // Vencidas
  { nome: 'Prefeitura Municipal de Monte Belo', sistemas: ['Siscam', 'Workflow'], prazo: -7 },
  { nome: 'Câmara Municipal de Araras', sistemas: ['Siscam', 'Workflow', 'Siave'], prazo: -7 },
  { nome: 'Câmara Municipal de Botucatu', sistemas: ['Siscam', 'Workflow', 'Siave', 'Recepção'], prazo: -14 },
  { nome: 'Prefeitura Municipal de Itapira', sistemas: ['Workflow'], prazo: -2 },
  { nome: 'Câmara Municipal de Lins', sistemas: ['Siscam', 'Recepção'], prazo: -21 },
  { nome: 'Prefeitura Municipal de Socorro', sistemas: ['Siave', 'Workflow'], prazo: -30 },
  { nome: 'Câmara Municipal de Mococa', sistemas: ['Siscam'], prazo: -1 },
  { nome: 'Câmara Municipal de Pirassununga', sistemas: ['Siscam', 'Workflow', 'Recepção'], prazo: -45 },
  { nome: 'Prefeitura Municipal de Cajuru', sistemas: ['Workflow', 'Siave'], prazo: -60 },
  { nome: 'Câmara Municipal de Olímpia', sistemas: ['Siscam', 'Siave'], prazo: -12 },
  // Vencimento próximo (até 60 dias)
  { nome: 'Prefeitura Municipal de Guaxupé', sistemas: ['Siscam', 'Workflow'], prazo: 3 },
  { nome: 'Câmara Municipal de Franca', sistemas: ['Siscam', 'Workflow', 'Siave'], prazo: 0 },
  { nome: 'Câmara Municipal de Bauru', sistemas: ['Siscam', 'Workflow', 'Siave', 'Recepção'], prazo: 9 },
  { nome: 'Prefeitura Municipal de Poços de Caldas', sistemas: ['Workflow'], prazo: 14 },
  { nome: 'Câmara Municipal de Jaú', sistemas: ['Siscam', 'Recepção'], prazo: 18 },
  { nome: 'Câmara Municipal de Avaré', sistemas: ['Siscam'], prazo: 22 },
  { nome: 'Prefeitura Municipal de Muzambinho', sistemas: ['Siave', 'Workflow'], prazo: 25 },
  { nome: 'Câmara Municipal de Itu', sistemas: ['Siscam', 'Workflow'], prazo: 30 },
  { nome: 'Câmara Municipal de Leme', sistemas: ['Siscam', 'Siave'], prazo: 33 },
  { nome: 'Prefeitura Municipal de Andradas', sistemas: ['Workflow', 'Recepção'], prazo: 38 },
  { nome: 'Câmara Municipal de São Carlos', sistemas: ['Siscam', 'Workflow', 'Recepção'], prazo: 41 },
  { nome: 'Câmara Municipal de Ourinhos', sistemas: ['Siscam'], prazo: 47 },
  { nome: 'Prefeitura Municipal de Alfenas', sistemas: ['Siave'], prazo: 52 },
  { nome: 'Câmara Municipal de Marília', sistemas: ['Siscam', 'Workflow', 'Siave'], prazo: 56 },
  { nome: 'Câmara Municipal de Assis', sistemas: ['Siscam', 'Workflow'], prazo: 60 },
  // Em dia (fora da janela, não aparecem)
  { nome: 'Câmara Municipal de Garça', sistemas: ['Siscam'], prazo: 140 },
  { nome: 'Prefeitura Municipal de Caconde', sistemas: ['Workflow'], prazo: 230 },
];

export const gerarClientesFicticios = (hoje) =>
  FICTICIOS.map(({ prazo, ...cliente }) => ({
    ...cliente,
    vencimento: somarDias(hoje, prazo),
  }));
