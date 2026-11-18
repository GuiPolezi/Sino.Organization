// Gera as ilustrações dos cards da home a partir do estúdio 3D (src/estudio/).
//
// Sobe um servidor Vite próprio (porta 5277) em que o NATAL_ATIVO segue a consulta
// (?natal=0 desliga o tema), abre o Chrome sem janela, desenha cada composição em
// fundo transparente, lê o canvas e grava em src/assets/images/home:
//   <cena>.webp (com Natal) e <cena>-sem-natal.webp
// Todas 1200×800, a composição centrada na horizontal, com a base a 2% da borda de
// baixo e ocupando ~88% da altura.
//
// Uso: npm run gerar:ilustracoes-home
//      node scripts/gerar-ilustracoes-home.mjs --cenas=dev,suporte --previa=<pasta>
//   --cenas     só estas cenas (padrão: todas)
//   --variantes natal, sem-natal ou as duas (padrão)
//   --previa    também grava PNGs sobre um fundo cinza, para conferir
//   --chrome    caminho do Chrome (ou a variável CHROME)
//   --rapido    desenha com dpr 1 (prévia; a versão final usa dpr 2)
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createServer } from 'vite';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'src/assets/images/home');
const CENAS = ['dev', 'suporte', 'compilacao', 'digitalizacao', 'licencas', 'reunioes'];
const VARIANTES = { natal: { natal: 1, sufixo: '' }, 'sem-natal': { natal: 0, sufixo: '-sem-natal' } };
const PORTA_VITE = 5277;
const CHROME_PADRAO = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// A imagem final e onde a composição fica nela.
const FINAL = { largura: 1200, altura: 800 };
const OCUPA_ALTURA = 0.88;
const OCUPA_LARGURA = 0.97;
const MARGEM_BAIXO = 0.02;
// Pixels mais transparentes que isto não contam para o recorte (a franja da sombra).
const ALFA_MINIMO = 14;
const LIMITE_BYTES = 120 * 1024;
const PRAZO_CENA_MS = 180_000;
// Nenhum comando do DevTools espera mais que isto (o toDataURL de 2400×1600 leva poucos segundos).
const PRAZO_COMANDO_MS = 60_000;

function argumentos() {
  const lidos = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [chave, ...valor] = arg.replace(/^--/, '').split('=');
      return [chave, valor.join('=') || 'true'];
    }),
  );
  const lista = (texto, validos) => {
    const itens = texto ? texto.split(',').map((s) => s.trim()).filter(Boolean) : validos;
    const invalidos = itens.filter((item) => !validos.includes(item));
    if (invalidos.length) throw new Error(`Valor inválido: ${invalidos.join(', ')} (use ${validos.join(', ')})`);
    return itens;
  };
  return {
    cenas: lista(lidos.cenas, CENAS),
    variantes: lista(lidos.variantes, Object.keys(VARIANTES)),
    previa: lidos.previa ? path.resolve(lidos.previa) : null,
    chrome: lidos.chrome ?? process.env.CHROME ?? CHROME_PADRAO,
    rapido: lidos.rapido === 'true',
  };
}

// No servidor deste script, o tema de Natal segue a consulta da página (?natal=0 desliga).
function natalPelaConsulta() {
  return {
    name: 'estudio-natal-pela-consulta',
    enforce: 'pre',
    transform(_codigo, id) {
      if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/src/tema/natal.js')) return null;
      return {
        code: "export const NATAL_ATIVO = new URLSearchParams(globalThis.location?.search ?? '').get('natal') !== '0';\n",
        map: null,
      };
    },
  };
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function comPrazo(tentar, prazoMs, descricao) {
  const fim = Date.now() + prazoMs;
  let ultimoErro;
  while (Date.now() < fim) {
    try {
      const valor = await tentar();
      if (valor) return valor;
    } catch (erro) {
      if (erro.fatal) throw erro;
      ultimoErro = erro;
    }
    await esperar(400);
  }
  throw new Error(`Tempo esgotado: ${descricao}${ultimoErro ? ` (${ultimoErro.message})` : ''}`);
}

// Cliente mínimo do DevTools Protocol, com o WebSocket do próprio Node.
async function conectar(urlWs) {
  const ws = new WebSocket(urlWs);
  await new Promise((resolver, rejeitar) => {
    ws.addEventListener('open', resolver, { once: true });
    ws.addEventListener('error', () => rejeitar(new Error('Falha ao conectar no Chrome')), { once: true });
  });
  let proximo = 0;
  let encerrado = null;
  const pendentes = new Map();
  const concluir = (id) => {
    const pendente = pendentes.get(id);
    if (!pendente) return null;
    pendentes.delete(id);
    clearTimeout(pendente.prazo);
    return pendente;
  };
  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    const pendente = concluir(msg.id);
    if (!pendente) return;
    if (msg.error) pendente.rejeitar(new Error(`${msg.error.message} ${msg.error.data ?? ''}`));
    else pendente.resolver(msg.result);
  });
  // Conexão caiu (o Chrome fechou ou travou): ninguém fica esperando resposta para sempre.
  const encerrar = (motivo) => {
    encerrado ??= new Error(`Conexão com o Chrome encerrada (${motivo})`);
    [...pendentes.keys()].forEach((id) => concluir(id).rejeitar(encerrado));
  };
  ws.addEventListener('close', () => encerrar('close'));
  ws.addEventListener('error', () => encerrar('error'));
  const enviar = (method, params = {}) =>
    new Promise((resolver, rejeitar) => {
      if (encerrado) {
        rejeitar(encerrado);
        return;
      }
      const id = ++proximo;
      const prazo = setTimeout(() => {
        concluir(id)?.rejeitar(new Error(`Sem resposta do Chrome em ${PRAZO_COMANDO_MS / 1000} s: ${method}`));
      }, PRAZO_COMANDO_MS);
      pendentes.set(id, { resolver, rejeitar, prazo });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const avaliar = async (expressao) => {
    const { result, exceptionDetails } = await enviar('Runtime.evaluate', {
      expression: expressao,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  return { enviar, avaliar, fechar: () => ws.close() };
}

function abrirChrome(executavel, pastaPerfil) {
  const chrome = spawn(
    executavel,
    [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      // Porta 0: o Chrome escolhe uma livre e a anota em DevToolsActivePort, no perfil
      // novo deste processo; assim nunca se conecta num Chrome que sobrou de outra execução.
      '--remote-debugging-port=0',
      `--user-data-dir=${pastaPerfil}`,
      '--window-size=1400,1000',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  chrome.on('error', (erro) => console.error(`Chrome: ${erro.message}`));
  return chrome;
}

// A porta de depuração que este Chrome abriu (primeira linha de DevToolsActivePort).
async function portaDoChrome(pastaPerfil) {
  const texto = await readFile(path.join(pastaPerfil, 'DevToolsActivePort'), 'utf8');
  const porta = Number.parseInt(texto, 10);
  return Number.isInteger(porta) && porta > 0 ? porta : null;
}

// No Windows, o kill() mata só o processo principal: os filhos (GPU, renderizador) ficam.
function fecharChrome(chrome) {
  if (!chrome?.pid || chrome.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    chrome.kill();
  }
}

// Caixa dos pixels visíveis (alfa acima de ALFA_MINIMO).
function caixaDosPixels({ data, info }) {
  const { width: w, height: h, channels } = info;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * channels + 3] <= ALFA_MINIMO) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('A imagem saiu vazia (nada desenhado no canvas)');
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Recorta a composição, ajusta o tamanho e a põe no lugar padrão da imagem final.
async function montarFinal(png) {
  const bruto = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const caixa = caixaDosPixels(bruto);
  const escala = Math.min(
    (FINAL.altura * OCUPA_ALTURA) / caixa.height,
    (FINAL.largura * OCUPA_LARGURA) / caixa.width,
  );
  const largura = Math.round(caixa.width * escala);
  const altura = Math.round(caixa.height * escala);
  const recorte = await sharp(png)
    .extract(caixa)
    .resize(largura, altura, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const topo = Math.round(FINAL.altura * (1 - MARGEM_BAIXO)) - altura;
  return sharp({
    create: { width: FINAL.largura, height: FINAL.altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: recorte, left: Math.round((FINAL.largura - largura) / 2), top: topo }])
    .png()
    .toBuffer();
}

// WebP com alfa; baixa a qualidade até caber no limite.
async function paraWebp(png) {
  for (const qualidade of [86, 82, 78, 74, 70, 65, 60]) {
    const webp = await sharp(png).webp({ quality: qualidade, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer();
    if (webp.length <= LIMITE_BYTES || qualidade === 60) return { webp, qualidade };
  }
  throw new Error('inalcançável');
}

async function capturar(cdp, url) {
  // A flag do documento anterior não pode valer para o novo: zera antes e, depois,
  // só aceita o "pronto" quando a página já é a da URL pedida.
  await cdp.avaliar('window.__estudioPronto = false; window.__estudioErro = null; true');
  await cdp.enviar('Page.navigate', { url });
  await comPrazo(
    async () => {
      const estado = await cdp.avaliar(
        '({ href: location.href, pronto: window.__estudioPronto === true, erro: window.__estudioErro ?? null })',
      );
      if (estado?.href !== url) return false;
      if (estado.erro) throw Object.assign(new Error(estado.erro), { fatal: true });
      return estado.pronto;
    },
    PRAZO_CENA_MS,
    url,
  );
  const dataUrl = await cdp.avaliar("document.querySelector('canvas').toDataURL('image/png')");
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/*
 * A home importa as 12 imagens; se faltar alguma, o Vite não monta o App (e nem o
 * estúdio). Na primeira geração, quem falta vira uma imagem transparente provisória,
 * substituída logo em seguida.
 */
async function garantirProvisorias() {
  const vazia = await sharp({
    create: { width: FINAL.largura, height: FINAL.altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .webp()
    .toBuffer();
  for (const cena of CENAS) {
    for (const { sufixo } of Object.values(VARIANTES)) {
      const arquivo = path.join(SAIDA, `${cena}${sufixo}.webp`);
      const existe = await access(arquivo).then(() => true, () => false);
      if (!existe) await writeFile(arquivo, vazia);
    }
  }
}

async function main() {
  const opcoes = argumentos();
  await mkdir(SAIDA, { recursive: true });
  await garantirProvisorias();
  if (opcoes.previa) await mkdir(opcoes.previa, { recursive: true });

  const servidor = await createServer({
    root: RAIZ,
    configFile: path.join(RAIZ, 'vite.config.js'),
    plugins: [natalPelaConsulta()],
    server: { port: PORTA_VITE, strictPort: true, host: '127.0.0.1' },
    clearScreen: false,
    logLevel: 'warn',
  });
  const pastaPerfil = await mkdtemp(path.join(tmpdir(), 'estudio-home-'));
  let chrome;
  let cdp;
  try {
    await servidor.listen();
    chrome = abrirChrome(opcoes.chrome, pastaPerfil);
    const alvo = await comPrazo(
      async () => {
        const porta = await portaDoChrome(pastaPerfil);
        if (!porta) return null;
        const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
        return lista.find((item) => item.type === 'page');
      },
      30_000,
      'Chrome abrir a porta de depuração',
    );
    cdp = await conectar(alvo.webSocketDebuggerUrl);
    await cdp.enviar('Page.enable');
    await cdp.enviar('Runtime.enable');

    for (const cena of opcoes.cenas) {
      for (const nomeVariante of opcoes.variantes) {
        const { natal, sufixo } = VARIANTES[nomeVariante];
        const url = `http://127.0.0.1:${PORTA_VITE}/estudio-home?cena=${cena}&natal=${natal}${opcoes.rapido ? '&dpr=1' : ''}`;
        const inicio = Date.now();
        const final = await montarFinal(await capturar(cdp, url));
        const { webp, qualidade } = await paraWebp(final);
        const arquivo = path.join(SAIDA, `${cena}${sufixo}.webp`);
        await writeFile(arquivo, webp);
        if (opcoes.previa) {
          const previa = await sharp(final).flatten({ background: '#C9D3D6' }).png().toBuffer();
          await writeFile(path.join(opcoes.previa, `${cena}${sufixo}.png`), previa);
        }
        const kb = (webp.length / 1024).toFixed(1);
        const aviso = webp.length > LIMITE_BYTES ? '  (acima de 120 KB!)' : '';
        console.log(`${path.relative(RAIZ, arquivo)}  ${kb} KB  q${qualidade}  ${((Date.now() - inicio) / 1000).toFixed(1)} s${aviso}`);
      }
    }
  } finally {
    cdp?.fechar();
    fecharChrome(chrome);
    await servidor.close();
    // O Chrome leva um instante para soltar os arquivos do perfil.
    await rm(pastaPerfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch(() => {});
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
