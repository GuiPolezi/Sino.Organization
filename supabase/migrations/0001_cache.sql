-- Cache das fontes de dados do sino.org (Milldesk, Sino.Licença).
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
--
-- Só o servidor (funções da Vercel, com a chave secreta) acessa esta tabela.
-- RLS ligado e sem políticas: a chave pública (anon) não lê nem escreve nada.

create table if not exists public.cache (
  chave           text primary key,      -- ex.: 'licencas'
  dados           jsonb,                 -- o dado já filtrado, como a API devolve
  gerado_em       timestamptz,           -- quando foi buscado na fonte
  atualizando_ate timestamptz            -- trava: alguém está buscando até esta hora
);

alter table public.cache enable row level security;
revoke all on public.cache from anon, authenticated;

-- Pega a trava da `p_chave` por `p_segundos`, se ninguém estiver com ela.
-- Devolve true para quem pegou; numa corrida, só um acesso recebe true.
create or replace function public.pegar_trava(p_chave text, p_segundos integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pegou boolean;
begin
  insert into public.cache (chave, atualizando_ate)
  values (p_chave, now() + make_interval(secs => p_segundos))
  on conflict (chave) do update
    set atualizando_ate = excluded.atualizando_ate
    where public.cache.atualizando_ate is null
       or public.cache.atualizando_ate < now()
  returning true into pegou;
  return coalesce(pegou, false);
end;
$$;

revoke execute on function public.pegar_trava(text, integer) from public, anon, authenticated;
grant execute on function public.pegar_trava(text, integer) to service_role;
