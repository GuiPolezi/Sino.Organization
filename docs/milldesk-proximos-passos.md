# Milldesk: dados que se atualizam sozinhos

> **Status (25/10/2026): migração concluída.** Equipes, atendimentos, clientes e chamados vêm
> da API do site (`/api/*`), com cache no Supabase. Os `npm run sync:*` e a pasta `src/data/`
> foram removidos. O que resta fazer está em "Pendências". O roteiro original segue abaixo
> como documentação de como cada fonte foi migrada.

## Pendências

- [ ] Criar `CRON_SECRET` na Vercel (texto longo e aleatório) e fazer um novo deploy. Sem ele,
      o agendamento diário responde 503 e as janelas antigas dos chamados não se renovam
      (as recentes continuam se renovando pelo acesso).
- [ ] Opcional: substituir os números inventados de `src/pages/Suporte/api/resumoEquipe.js`
      (`ficticio: true`) por números reais dos atendimentos.
- [ ] Opcional: trocar `src/pages/Desenvolvimento/fixtures/chamados.json` (cópia real de 23/10,
      usada só pelos testes) por um fixture pequeno e sem nomes de clientes.

## Comandos úteis

- `npm run seed:chamados` — recarrega todo o histórico de chamados no Supabase (alguns minutos).
- `npm run relatorio:clientes` — mostra os locais do mapa que merecem conferência
  (para ajustar `scripts/data/client-overrides.json`). Não grava nada.

## Visão geral

| Fonte | Hoje (estático) | Quem usa no site | Depois (API) |
|---|---|---|---|
| Equipes (suporte e dev) | `sync:team` / `sync:dev-team` → `src/data/team.json`, `dev-team.json` | /suporte, /desenvolvimento, reuniões | `/api/equipes/<setor>`, cache de 1 dia |
| Atendimentos | `sync:atendimentos` → `src/data/atendimentos.json` | /suporte (gráfico por dia) | `/api/atendimentos`, cache de 15 min |
| Clientes / mapa | `sync:clients` → `src/data/clients.json` | mapa da home | `/api/clientes`, cache de 1 dia |
| Chamados | `sync:chamados` → `src/data/chamados.json` (300 KB, todo o histórico) | /desenvolvimento | `/api/chamados`, histórico em partes (ver seção 4) |

**Ordem sugerida:** equipes → atendimentos → clientes → chamados (do mais simples ao mais pesado).
Cada fonte pode ir para a `main` sozinha; o site continua funcionando com as que ainda forem estáticas.

---

## 0. Antes de começar ✅

- [ ] Pegar a chave no painel do Milldesk (configurações / integrações da API).
- [ ] Colocar no `.env` local: `MILLDESK_API_KEY=...` (nunca no chat, no código ou com prefixo `VITE_`).
- [ ] Testar a chave localmente com o script que já existe: `npm run sync:team`.
      Se gravar `src/data/team.json` sem erro, a chave funciona. (Descarte a alteração do JSON se não quiser commitar.)
- [ ] Cadastrar `MILLDESK_API_KEY` na Vercel (Project → Settings → Environment Variables, todos os ambientes) e fazer um novo deploy.
- [ ] Criar também `CRON_SECRET` na Vercel (um texto aleatório longo). Ele protege a rota do agendamento diário (seção 4).

**Cuidado com a chave:** ela vai **dentro da URL** do Milldesk (`https://v1.milldesk.com/api/<chave>/<endpoint>`).
`scripts/lib/milldesk.mjs` já trata isso: não segue redirecionamentos, não registra a URL e tira a chave das mensagens de erro.
Nada novo deve registrar URLs do Milldesk em `console.log`.

---

## O padrão (igual ao das licenças)

Cada fonte segue os mesmos passos que as licenças seguiram (commit `139fea5`):

1. **Servidor** — em `server/api.mjs`, adicionar a fonte em `FONTES` (chave do cache → função que busca e devolve o dado já filtrado) e a rota em `ROTAS`. A função reaproveita o que já existe em `scripts/lib/` (`milldesk.mjs` para buscar, `build-*.mjs` para filtrar).
2. **Vercel** — criar `api/<rota>.js` exportando `GET = tratarApi` (ver `api/licencas.js`).
3. **Navegador** — trocar o `import` do JSON por `fetch('/api/<rota>')`, com estado de carregando e de erro (ver `src/pages/Licencas/dados.js`).
4. **Limpeza** — apagar o script `scripts/sync-*.mjs`, o `npm run sync:*` do `package.json` e o `src/data/*.json` correspondente (ver a seção "Limpeza").
5. **Testar** — `npm run dev` (a API roda junto), as suítes `npm run test:*` e, depois do deploy, `curl https://sino-organization.vercel.app/api/<rota>`.

**Cache por fonte.** Hoje `criarCache` usa 15 minutos para tudo (`IDADE_MAXIMA_MS` em `server/cache.mjs`).
Equipes e clientes mudam pouco: vale permitir uma idade máxima por fonte (ex.: `FONTES.clientes = { buscar, idadeMaximaMs: 24 * 3600_000 }`).

**Arquivos lidos com `readFile`.** Os scripts leem `scripts/data/*.json` com `readFile(new URL(...))`.
Na Vercel, prefira `import dados from '../scripts/data/x.json' with { type: 'json' }`: assim o arquivo vai junto com a função com certeza.

---

## 1. Equipes ✅

- **Busca:** endpoint `listAgents` (1 requisição). Lógica em `scripts/sync-team.mjs` e `scripts/lib/build-team.mjs` (`buildTeam`).
- **Quem aparece** continua definido à mão em `scripts/data/support-team.json` e `scripts/data/dev-team.json` (ficam no repositório).
- **Saída:** `{ id, name, role, absent }` (e-mail, telefone, login e custo já são descartados pelo `buildTeam`).
- **Servidor:** `FONTES['equipe-suporte']` e `FONTES['equipe-desenvolvimento']`; rota `/api/equipes/suporte` e `/api/equipes/desenvolvimento`.
- **Navegador:**
  - `src/pages/Suporte/api/equipeTecnica.js` e `src/pages/Desenvolvimento/api/equipe.js` já são `async`: só trocar o import por `fetch`.
  - `src/components/Hero/reunioes/membrosEquipe.js` e `src/components/Hero/reunioes/holograma/HologramaPersonagem.jsx` importam o JSON de forma **síncrona**: precisam virar assíncronos (carregar uma vez e guardar num módulo ou store).
- **Atenção:** quem está desabilitado no Milldesk sai da equipe sozinho (em até 1 dia, a idade do cache), sem precisar mexer na lista. A rota manda essa pessoa em `former` (`{ id, name, role }`), e o quadro de /desenvolvimento continua contando os tickets dela, marcada como ex-membro, sem boneco nem card. Já um técnico que não é encontrado ou tem nome repetido faz `buildTeam` lançar erro, e o mesmo vale quando ninguém da lista está habilitado. Na API isso cai no "mostra o último dado com aviso" do cache.

## 2. Atendimentos ✅

- **Busca:** `showTicketsPerPeriod` (dia 1 do mês anterior até hoje) + `listTicketStatus` + um `showTicketsByStatus` por status aberto. Segundos no total.
  Lógica em `scripts/sync-atendimentos.mjs` e `scripts/lib/build-atendimentos.mjs` (`contarAtendimentos`).
- **Saída:** por técnico, `{ porDia: { 'AAAA-MM-DD': n }, chamadosAtribuidos }`. Assunto, descrição e cliente nunca saem do servidor.
- **Servidor:** `FONTES.atendimentos`, cache de 15 min; rota `/api/atendimentos`.
- **Navegador:** `src/pages/Suporte/api/atendimentosTecnico.js` já é `async` — só trocar o import por `fetch`.
- **Ganho imediato:** hoje, com o JSON velho, os dias recentes do gráfico aparecem zerados. Com a API isso acaba.
- **Opcional:** `src/pages/Suporte/api/resumoEquipe.js` tem números **inventados** (SLA, atendimentos de hoje, chamados abertos, `ficticio: true`). Com os dados reais de atendimentos dá para calcular parte deles.

## 3. Clientes (mapa) ✅

- **Busca:** `listLocals` (1 requisição). Lógica em `scripts/sync-clients.mjs`.
- **Transformação:** a cidade é deduzida do nome com `scripts/lib/resolve-city.mjs`, que usa `scripts/data/municipios.json` (188 KB) e as correções de `scripts/data/client-overrides.json`. Tudo isso vai junto com a função.
- **Saída:** `{ totals, cities: [{ id, city, uf, x, y, clients: [nomes] }] }` (e-mail, telefone e endereço já são descartados).
- **Servidor:** `FONTES.clientes`, cache de 1 dia; rota `/api/clientes`. Manter as proteções do script: resposta vazia ou nenhuma cidade reconhecida = erro (não grava lista vazia).
- **Navegador:** `src/components/Clients/Clients.jsx` importa o JSON de forma **síncrona** e está na home. Precisa de estado de carregando que não quebre as animações de entrada do mapa.

## 4. Chamados (o mais trabalhoso) ✅

**O problema.** O sync atual busca **todo o histórico desde 2017** em janelas de 90 dias (~37 janelas), com 2,5 s de pausa entre elas e esperas de 15 s × tentativa quando o Milldesk responde HTTP 429. Leva alguns minutos.
Uma função da Vercel no plano grátis roda no máximo **300 s** (o `vercel.json` hoje limita a 60 s), e um carregamento de página não pode esperar isso.

**A proposta: guardar o histórico em partes (uma por janela de 90 dias).**

- Cada janela vira uma linha no cache: `chamados:2017-10-01`, `chamados:2018-01-01`, …
- `GET /api/chamados` lê todas as janelas de uma vez (uma consulta: `cache?chave=like.chamados:*`) e junta as listas de cada desenvolvedor.
- **Janelas recentes** (a atual e a anterior): renovadas pelo próprio acesso, com o cache de 15 min — 1 ou 2 requisições ao Milldesk.
- **Janelas antigas:** renovadas por um **agendamento diário** da Vercel (o plano grátis permite 1 por dia), em rodízio: cada execução renova as ~10 janelas atualizadas há mais tempo. O histórico inteiro é revisto a cada ~4 dias, sempre dentro dos 300 s.
- **Primeira carga:** um script local (`npm run seed:chamados`) preenche todas as janelas no Supabase de uma vez, para o site não começar vazio.

**O que implementar:**

- [ ] `server/cache.mjs` / `server/supabase.mjs`: ler várias chaves por prefixo e listar as mais antigas (`order=gerado_em.asc&limit=10`).
- [ ] `FONTES` de chamados por janela: `showTicketsPerPeriod?start=<início>&end=<fim>` + `montarChamados` (de `scripts/lib/build-chamados.mjs`), com a mesma espera em HTTP 429 do sync atual.
- [ ] Rota `/api/chamados`: junta as janelas por desenvolvedor e devolve `{ desenvolvedores, geradoEm }` (o `geradoEm` mais antigo entre as janelas recentes).
- [ ] Rota do agendamento, ex.: `api/cron/chamados.js`, que só aceita `Authorization: Bearer <CRON_SECRET>`.
- [ ] `vercel.json`: `"crons": [{ "path": "/api/cron/chamados", "schedule": "0 9 * * *" }]` (hora em UTC; no Hobby pode rodar até 59 min depois) e `maxDuration: 300` para essa rota.
- [ ] Script `seed:chamados` para a primeira carga.
- [ ] Navegador: `src/pages/Desenvolvimento/api/chamados.js` já é `async` — trocar o import por `fetch`.

**Como ficou:** `server/chamados.mjs` (janelas, junção e rodízio), `api/chamados.js`,
`api/cron/chamados.js` (agendamento às 9h UTC, até 10 janelas por dia) e `scripts/seed-chamados.mjs`.
Os testes de /desenvolvimento leem `src/pages/Desenvolvimento/fixtures/`.

**Limite do Milldesk (HTTP 429).** Muitos pedidos seguidos fazem a API pedir para esperar. Toda
busca passa por `buscarMilldesk` (`server/fontes.mjs`), que espera e tenta de novo, e os
atendimentos fazem uma pausa entre os pedidos por status.

**Limitação conhecida.** Um chamado aberto há meses que mudar de status só é corrigido quando a janela dele passar pelo rodízio (até ~4 dias).
Se isso incomodar: em cada renovação, buscar também os tickets abertos (`showTicketsByStatus`, como o sync de atendimentos faz) e corrigir o status deles nas janelas antigas.

**Testes que leem o JSON.** `src/pages/Desenvolvimento/mappers/*.test.mjs` (chamados, visaoGeral, locais, categoria) leem `src/data/chamados.json`.
Antes de apagar o arquivo, mover para um fixture pequeno só para os testes (ex.: `src/pages/Desenvolvimento/mappers/fixtures/chamados.json`), com poucos tickets e sem nomes reais de clientes.

---

## Limpeza (ao final de cada fonte)

- [ ] Apagar `scripts/sync-<fonte>.mjs` e o `npm run sync:<fonte>` do `package.json`.
- [ ] Apagar `src/data/<fonte>.json` (deixa de ir no bundle e no git). Quando todos saírem, apagar a pasta `src/data/`.
- [ ] Manter os `scripts/lib/*.mjs` (o servidor usa) e os testes deles (`test:team`, `test:atendimentos`, `test:chamados-sync`, `test:resolver`).
- [ ] Atualizar comentários que ainda falam em "sync" e o `.env.example` (`MILLDESK_API_KEY` passa a ser usada pela API).
- [ ] Atualizar este documento, marcando o que já foi feito.

## Como conferir que deu certo

- [ ] `npm run test:api` e as demais suítes `npm run test:*` passando, e `npx vite build` sem erro.
- [ ] Em produção, para cada rota: `curl https://sino-organization.vercel.app/api/<rota>` → HTTP 200 e `"situacao"` = `"atualizado"` na primeira chamada e `"recente"` na seguinte.
- [ ] No Supabase (Table Editor → `cache`): uma linha por fonte (e por janela, nos chamados) com `gerado_em` recente.
- [ ] As páginas mostrando "Atualizado em …" com a hora da última busca.
- [ ] Nenhuma resposta da API e nenhum arquivo em `dist/` contendo a chave (`grep` pela chave no build, como foi feito com a senha do Sino.Licença).

## Referências no código

- Padrão completo de uma fonte: `server/api.mjs` (`FONTES`, `ROTAS`), `api/licencas.js`, `src/pages/Licencas/dados.js`.
- Cache e trava: `server/cache.mjs`, função SQL `pegar_trava` em `supabase/migrations/0001_cache.sql`.
- Acesso ao Milldesk: `scripts/lib/milldesk.mjs` (`fetchMilldesk`, `toRecords`, `MilldeskError`).
- Filtros e privacidade: `scripts/lib/build-team.mjs`, `build-atendimentos.mjs`, `build-chamados.mjs`, `resolve-city.mjs`.
