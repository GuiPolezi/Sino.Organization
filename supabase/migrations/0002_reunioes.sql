-- Reuniões do sino.org, compartilhadas entre todos (antes ficavam no
-- localStorage de cada navegador).
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
--
-- Só o servidor (funções da Vercel, com a chave secreta) acessa esta tabela,
-- e ele repete a validação da tela antes de gravar. RLS ligado e sem
-- políticas: a chave pública (anon) não lê nem escreve nada.
--
-- Apagar uma reunião só preenche apagada_em: para desfazer, limpe a coluna
-- (Table Editor > reunioes > apagada_em = NULL).

create table if not exists public.reunioes (
  id          text primary key check (id ~ '^[A-Za-z0-9-]{8,64}$'),
  titulo      text not null check (char_length(titulo) between 1 and 80),
  data_hora   text not null check (data_hora ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'), -- horário de Brasília
  hora_fim    text not null check (hora_fim ~ '^\d{2}:\d{2}$'),
  modalidade  text not null check (modalidade in ('presencial', 'digital')),
  membros     jsonb not null check (jsonb_typeof(membros) = 'array'),   -- [{ id, nome }]
  criada_em   timestamptz not null default now(),
  editada_em  timestamptz,
  apagada_em  timestamptz
);

create index if not exists reunioes_ativas_data on public.reunioes (data_hora) where apagada_em is null;

alter table public.reunioes enable row level security;
revoke all on public.reunioes from anon, authenticated;
