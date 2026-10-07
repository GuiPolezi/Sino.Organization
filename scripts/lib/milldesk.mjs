// Acesso de leitura à API do Milldesk, compartilhado pelos scripts de
// sincronização. As falhas viram MilldeskError com mensagem segura para exibir:
// a chave da API nunca aparece nelas.
const API_URL = 'https://v1.milldesk.com/api';
const API_TIMEOUT_MS = 15000;
const ERROR_PREVIEW_LENGTH = 80;

export class MilldeskError extends Error {}

const readApiKey = () => {
  const apiKey = process.env.MILLDESK_API_KEY;
  if (!apiKey) {
    throw new MilldeskError('Defina MILLDESK_API_KEY no arquivo .env (veja .env.example).');
  }
  return apiKey;
};

// Busca um endpoint de listagem (ex.: "listLocals") e devolve o JSON cru.
export async function fetchMilldesk(endpoint) {
  const apiKey = readApiKey();

  // A chave vai na URL: nunca registre a URL em logs ou mensagens de erro.
  // Sem seguir redirecionamentos, para a chave não ser enviada a outro endereço.
  const response = await fetch(`${API_URL}/${encodeURIComponent(apiKey)}/${endpoint}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => {
    throw new MilldeskError('Não foi possível conectar à API do Milldesk.');
  });
  if (!response.ok) throw new MilldeskError(`A API do Milldesk respondeu HTTP ${response.status}.`);

  return response.json().catch(() => {
    throw new MilldeskError('A API do Milldesk não devolveu JSON.');
  });
}

// Normaliza a resposta para uma lista de registros; um erro da API vira MilldeskError.
export function toRecords(payload) {
  if (payload?.error) {
    // A mensagem vem do servidor: tira a chave dela, crua ou codificada na URL.
    const apiKey = process.env.MILLDESK_API_KEY;
    const secrets = apiKey ? [apiKey, encodeURIComponent(apiKey)] : [];
    const reason = secrets
      .reduce((text, secret) => text.replaceAll(secret, '***'), String(payload.error))
      .slice(0, ERROR_PREVIEW_LENGTH);
    throw new MilldeskError(`A API do Milldesk recusou a requisição: ${reason}.`);
  }
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') return Object.values(payload);
  throw new MilldeskError('Formato de resposta inesperado da API do Milldesk.');
}
