import dados from '../../data/licencas.json';
import { agruparLicencas } from './mappers/licencas.js';

/*
 * Licenças das tabelas da página inicial do Sino.Licença (vencidas e com
 * vencimento próximo). Vêm de src/data/licencas.json, gerado por
 * `npm run sync:licencas`: o site não tem API, então o script entra com o
 * usuário do .env e lê o HTML (a senha nunca vem ao navegador).
 */

// Endereço do sistema de licenças (botão "Site Licenças").
export const SITE_LICENCAS_URL = 'https://licenca.sinoinformatica.com.br/';

// Página do cliente dentro do Sino.Licença (pede login lá).
export const urlClienteNoSite = (clienteId) => `${SITE_LICENCAS_URL}Clientes/Details/${clienteId}`;

export const TOTAL_CLIENTES_REGISTRADOS = dados.totalClientes ?? 0;

// Data e hora do último sync, para dizer de quando é a lista.
export const ATUALIZADO_EM = dados.geradoEm;

// Um item por cliente e data de vencimento: { chave, clienteId, nome, slug, sistemas, vencimento }.
export const LICENCAS = agruparLicencas(dados.licencas ?? []);
