import { lerResponsabilidades, mensagemDeFalha, tempoDaFalha } from '../atuacao.js';
import { useResponsabilidades } from '../store.js';

/*
 * A responsabilidade de cada pessoa, que qualquer um na página troca pelo "Alterar"
 * e todos veem: GET lista as escolhas salvas, PUT salva a de uma pessoa.
 * Com a página aberta, a lista é buscada de novo a cada minuto (aba à vista),
 * ao voltar para a aba e depois de cada troca, para aparecer o que outros mudaram.
 */
const CAMINHO = '/api/compilacao/responsabilidades';
const BUSCAR_A_CADA_MS = 60_000;

const sem = (objeto, chave) => Object.fromEntries(Object.entries(objeto).filter(([k]) => k !== chave));

/** As escolhas salvas, já filtradas: { [personagem]: { chave, alteradaEm } }. */
export async function buscarResponsabilidades() {
  const resposta = await fetch(CAMINHO, { cache: 'no-store' });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok || !corpo) throw new Error(corpo?.erro ?? `O servidor respondeu HTTP ${resposta.status}.`);
  return lerResponsabilidades(corpo);
}

/**
 * Salva a escolha de uma pessoa. Nunca lança: status 0 é falha de rede.
 * @returns {Promise<{ ok: boolean, status: number, corpo: any, retryAfter: string | null }>}
 */
async function salvarResponsabilidade(personagem, chave) {
  try {
    const resposta = await fetch(`${CAMINHO}/${encodeURIComponent(personagem)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ responsabilidade: chave }),
    });
    const corpo = await resposta.json().catch(() => null);
    return { ok: resposta.ok, status: resposta.status, corpo, retryAfter: resposta.headers.get('retry-after') };
  } catch {
    return { ok: false, status: 0, corpo: null, retryAfter: null };
  }
}

/*
 * Busca a lista e troca a da tela. Se uma troca foi feita aqui enquanto a busca
 * corria, a resposta pode ser de antes dela: fica de fora. Quem está salvando
 * agora mantém o que a tela já mostra.
 */
async function atualizar() {
  const { versao } = useResponsabilidades.getState();
  let recebidas;
  try {
    recebidas = await buscarResponsabilidades();
  } catch {
    // Sem a lista (servidor fora, rota ainda não existe): vale a configurada, e a próxima busca tenta de novo.
    return;
  }
  useResponsabilidades.setState((estado) => {
    if (estado.versao !== versao) return {};
    const emAndamento = Object.fromEntries(
      Object.keys(estado.salvando).flatMap((p) => (estado.salvas[p] ? [[p, estado.salvas[p]]] : [])),
    );
    return { salvas: { ...recebidas, ...emAndamento } };
  });
}

/**
 * Liga a busca da lista enquanto a página está aberta.
 * @returns {() => void} para tudo ao sair da página
 */
export function acompanharResponsabilidades() {
  let ultima = 0;
  const buscar = () => {
    ultima = Date.now();
    atualizar();
  };
  const aCada = () => {
    if (document.visibilityState === 'visible') buscar();
  };
  const aoVoltar = () => {
    if (document.visibilityState === 'visible' && Date.now() - ultima >= BUSCAR_A_CADA_MS) buscar();
  };

  buscar();
  const timer = setInterval(aCada, BUSCAR_A_CADA_MS);
  document.addEventListener('visibilitychange', aoVoltar);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', aoVoltar);
    useResponsabilidades.setState({ salvas: {}, salvando: {}, falhas: {}, versao: 0 });
  };
}

// A mensagem some sozinha depois de `duracao` ms, se ainda for a mesma.
function mostrarFalha(personagem, mensagem, duracao) {
  useResponsabilidades.setState(({ falhas }) => ({ falhas: { ...falhas, [personagem]: mensagem } }));
  setTimeout(() => {
    useResponsabilidades.setState(({ falhas }) => (falhas[personagem] === mensagem ? { falhas: sem(falhas, personagem) } : {}));
  }, duracao);
}

/**
 * Troca a responsabilidade de uma pessoa: a tela muda na hora e, se o servidor
 * não salvar, volta ao que era, com a mensagem do porquê.
 * @param {string} personagem o id da pessoa
 * @param {string} chave uma das chaves de RESPONSABILIDADES
 */
export async function alterarResponsabilidade(personagem, chave) {
  const antes = useResponsabilidades.getState();
  if (antes.salvando[personagem]) return;
  const anterior = antes.salvas[personagem];

  useResponsabilidades.setState(({ salvas, salvando, falhas, versao }) => ({
    salvas: { ...salvas, [personagem]: { chave, alteradaEm: new Date().toISOString() } },
    salvando: { ...salvando, [personagem]: true },
    falhas: sem(falhas, personagem),
    versao: versao + 1,
  }));

  const { ok, status, corpo, retryAfter } = await salvarResponsabilidade(personagem, chave);
  const salva = ok && corpo?.chave ? { chave: corpo.chave, alteradaEm: corpo.alteradaEm ?? null } : null;

  useResponsabilidades.setState(({ salvas, salvando, versao }) => {
    let novas;
    if (salva) novas = { ...salvas, [personagem]: salva };
    else novas = anterior ? { ...salvas, [personagem]: anterior } : sem(salvas, personagem);
    return { salvas: novas, salvando: sem(salvando, personagem), versao: versao + 1 };
  });

  if (salva) {
    atualizar();
    return;
  }
  // O porquê técnico fica no console; a tela mostra a mensagem amigável.
  if (corpo?.erro) console.warn(`Responsabilidade de ${personagem} não salva (HTTP ${status}): ${corpo.erro}`);
  mostrarFalha(personagem, mensagemDeFalha({ status, erro: corpo?.erro }), tempoDaFalha(retryAfter));
}
