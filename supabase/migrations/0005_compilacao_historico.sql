-- /compilacao, fase F6: o "Todo o Tempo" de quem faz Projetos Novos, em normas
-- distintas. Normas distintas não somam dia a dia (a mesma norma pode ganhar versão
-- em dois dias), então o histórico guarda CADA norma de cada pessoa, uma vez.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
-- Depois, a carga inicial na máquina do líder:
--   node --env-file=.env scripts/carregar-historico-compilacao.mjs
--
-- Só o servidor (chave secreta) lê e grava. RLS ligado e sem políticas.

-- Uma linha por norma distinta da pessoa. `chave` é um resumo (SHA-256) de
-- cidade + tipo + número/ano: nenhum texto do sistema fica guardado aqui.
create table if not exists public.compilacao_historico_normas (
  personagem    text not null,                     -- id público do /compilacao (ex.: 'leonardo')
  chave         text not null check (chave ~ '^[0-9a-f]{64}$'),
  balde         text not null check (balde in ('leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros')),
  primeira_data date not null,                     -- primeira versão nova da pessoa nessa norma (Brasília)
  primary key (personagem, chave)
);

-- Até que dia o histórico de cada pessoa está completo. Sem linha aqui, o
-- Todo o Tempo da pessoa fica "—" (a carga inicial ainda não rodou).
create table if not exists public.compilacao_historico_carga (
  personagem    text primary key,
  carregado_ate date        not null,
  atualizado_em timestamptz not null default now()
);

-- Totais por pessoa e tipo: o que a rota lê (no máximo 7 linhas por pessoa).
create or replace view public.compilacao_historico_totais
  with (security_invoker = true) as
  select personagem, balde, count(*)::integer as normas
  from public.compilacao_historico_normas
  group by personagem, balde;

alter table public.compilacao_historico_normas enable row level security;
alter table public.compilacao_historico_carga enable row level security;
revoke all on public.compilacao_historico_normas from anon, authenticated;
revoke all on public.compilacao_historico_carga from anon, authenticated;
revoke all on public.compilacao_historico_totais from anon, authenticated;
