// Acesso de leitura ao Sino.Licença (licenca.sinoinformatica.com.br), que não
// tem API: o script entra com usuário e senha, como um navegador, e lê o HTML.
//
// Só lê páginas de endereço fixo (a inicial e a lista de clientes) e nunca segue
// links nem redirecionamentos: o sistema tem links de exclusão que funcionam por
// GET, e eles não podem ser abertos por engano. As falhas viram LicencaError com
// mensagem segura para exibir: o usuário e a senha nunca aparecem nelas.
export const SITE_URL = 'https://licenca.sinoinformatica.com.br';
const TIMEOUT_MS = 20000;

export class LicencaError extends Error {}

const lerCredenciais = () => {
  const usuario = process.env.LICENCA_USUARIO;
  const senha = process.env.LICENCA_SENHA;
  if (!usuario || !senha) {
    throw new LicencaError('Defina LICENCA_USUARIO e LICENCA_SENHA no arquivo .env (veja .env.example).');
  }
  return { usuario, senha };
};

// Guarda os cookies da sessão (ASP.NET_SessionId, token anti-falsificação e o
// cookie de login) e os devolve nas próximas requisições.
function criarSessao() {
  const cookies = new Map();

  return async function requisitar(caminho, opcoes = {}) {
    const resposta = await fetch(`${SITE_URL}${caminho}`, {
      ...opcoes,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...opcoes.headers,
        ...(cookies.size && {
          cookie: [...cookies].map(([nome, valor]) => `${nome}=${valor}`).join('; '),
        }),
      },
    }).catch(() => {
      throw new LicencaError('Não foi possível conectar ao site de licenças.');
    });

    for (const linha of resposta.headers.getSetCookie()) {
      const [par] = linha.split(';');
      const igual = par.indexOf('=');
      if (igual > 0) cookies.set(par.slice(0, igual).trim(), par.slice(igual + 1).trim());
    }
    return resposta;
  };
}

const vaiParaLogin = (resposta) =>
  resposta.status >= 300 && resposta.status < 400 && /\/Home\/Login/i.test(resposta.headers.get('location') ?? '');

async function lerPagina(requisitar, caminho) {
  const resposta = await requisitar(caminho);
  if (vaiParaLogin(resposta)) throw new LicencaError('O site de licenças encerrou a sessão.');
  if (!resposta.ok) throw new LicencaError(`O site de licenças respondeu HTTP ${resposta.status} em ${caminho}.`);
  return resposta.text();
}

/*
 * Entra no site e devolve o HTML das páginas usadas pela API (server/api.mjs):
 * - inicio: a página inicial, com as tabelas de vencidas e de vencimento próximo;
 * - clientes: a primeira página da lista de clientes, com o total de registros.
 */
export async function baixarPaginas() {
  const { usuario, senha } = lerCredenciais();
  const requisitar = criarSessao();

  // 1. O formulário de login traz o token anti-falsificação (e o cookie dele).
  const formulario = await lerPagina(requisitar, '/Home/Login');
  const token = formulario.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
  if (!token) throw new LicencaError('Não achei o formulário de login do site de licenças.');

  // 2. Login certo responde com redirecionamento; errado devolve o formulário de novo.
  const login = await requisitar('/Home/Login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ __RequestVerificationToken: token, Usuario: usuario, Senha: senha }),
  });
  if (login.status !== 302 || vaiParaLogin(login)) {
    throw new LicencaError('O site de licenças recusou o login. Confira LICENCA_USUARIO e LICENCA_SENHA.');
  }

  return {
    inicio: await lerPagina(requisitar, '/'),
    clientes: await lerPagina(requisitar, '/Clientes'),
  };
}
