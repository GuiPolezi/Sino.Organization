-- /compilacao, fase F3: em que cidade e tipo(s) cada pessoa de Projetos Novos está
-- (com a regra dos 2 dias e a correção manual), e o retrato diário do estoque.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
--
-- Só o servidor (chave secreta) lê e grava. RLS ligado e sem políticas.
--
-- CORREÇÃO MANUAL: para fixar o projeto de alguém, insira uma linha com
-- origem = 'manual' (personagem, cidade_uf como no sistema, ex.: 'Cidade A-SP',
-- cidade_id e modulo_ids). Ela vale enquanto `ate` estiver vazio; para
-- encerrar, preencha `ate` com a data de hoje.

create table if not exists public.compilacao_atribuicoes (
  id         bigint generated always as identity primary key,
  personagem text        not null,                 -- id público do /compilacao (ex.: 'leonardo')
  cidade_uf  text        not null,                 -- como na Auditoria: 'Nome-UF'
  cidade_id  integer,                              -- id da cidade no sistema (nulo se não achou)
  modulo_ids integer[]   not null check (cardinality(modulo_ids) between 1 and 3),
  origem     text        not null check (origem in ('inferida', 'manual')),
  desde      timestamptz not null,
  ate        timestamptz,                          -- vazio = em vigor
  motivo     text,
  criada_em  timestamptz not null default now()
);

-- No máximo uma atribuição inferida em vigor por pessoa.
create unique index if not exists compilacao_atribuicoes_inferida_aberta
  on public.compilacao_atribuicoes (personagem)
  where ate is null and origem = 'inferida';

create table if not exists public.compilacao_versionadas_diario (
  data            date        not null,            -- dia em Brasília
  cidade_id       integer     not null,
  modulo_id       integer     not null,
  cidade_uf       text        not null,
  total           integer     not null check (total >= 0),
  versionadas     integer     not null check (versionadas >= 0),
  nao_versionadas integer     not null check (nao_versionadas >= 0),
  capturado_em    timestamptz not null default now(),
  primary key (data, cidade_id, modulo_id)
);

alter table public.compilacao_atribuicoes enable row level security;
alter table public.compilacao_versionadas_diario enable row level security;
revoke all on public.compilacao_atribuicoes from anon, authenticated;
revoke all on public.compilacao_versionadas_diario from anon, authenticated;
