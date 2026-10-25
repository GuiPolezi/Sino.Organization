import { useCallback, useEffect, useState } from 'react';
import { agruparLicencas } from './mappers/licencas.js';

/*
 * Licenças das tabelas da página inicial do Sino.Licença (vencidas e com
 * vencimento próximo), pela API do próprio site (/api/licencas). O servidor
 * entra no Sino.Licença com o usuário do .env, guarda o resultado por até
 * 15 minutos e devolve só os dados já filtrados: a senha nunca vem ao navegador.
 */

// Endereço do sistema de licenças (botão "Site Licenças").
export const SITE_LICENCAS_URL = 'https://licenca.sinoinformatica.com.br/';

// Página do cliente dentro do Sino.Licença (pede login lá).
export const urlClienteNoSite = (clienteId) => `${SITE_LICENCAS_URL}Clientes/Details/${clienteId}`;

// Um pedido por carregamento de página, dividido entre quem precisar.
let pedido = null;

/**
 * @returns {Promise<{
 *   licencas: ReturnType<typeof agruparLicencas>,
 *   totalClientes: number,
 *   atualizadoEm: string,
 *   aviso?: string,
 * }>}
 */
export function buscarLicencas() {
  pedido ??= fetch('/api/licencas')
    .then(async (resposta) => {
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.dados) {
        throw new Error(corpo?.erro ?? `O servidor respondeu HTTP ${resposta.status}.`);
      }
      return {
        licencas: agruparLicencas(corpo.dados.licencas ?? []),
        totalClientes: corpo.dados.totalClientes ?? 0,
        atualizadoEm: corpo.geradoEm,
        aviso: corpo.aviso,
      };
    })
    .catch((erro) => {
      pedido = null; // deixa tentar de novo
      throw erro;
    });
  return pedido;
}

/**
 * Estado das licenças para as páginas: 'carregando', 'pronto' ou 'erro'.
 * `tentarDeNovo` refaz o pedido depois de um erro.
 */
export function useLicencas() {
  const [estado, setEstado] = useState({ situacao: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscarLicencas().then(
      (dados) => ativo && setEstado({ situacao: 'pronto', ...dados }),
      (erro) => ativo && setEstado({ situacao: 'erro', mensagem: erro.message }),
    );
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => {
    setEstado({ situacao: 'carregando' });
    setTentativa((n) => n + 1);
  }, []);

  return { ...estado, tentarDeNovo };
}
