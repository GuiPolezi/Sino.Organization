-- /compilacao: a responsabilidade de cada pessoa, escolhida no botão "Alterar" do
-- card. A página é pública (sem login): quem alterar, altera para todos.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
-- Antes disso a página segue com a função da configuração (COMPILACAO_EQUIPE).
--
-- Só o servidor (chave secreta) lê e grava. RLS ligado e sem políticas; a troca
-- passa pela função alterar_responsabilidade (abaixo), que só o servidor executa.
--
-- DESFAZER UMA TROCA: cada troca fica no histórico, da mais nova para a mais antiga:
--   select * from public.compilacao_responsabilidades_historico order by id desc limit 50;
-- `de` vazio = a pessoa estava com a função da configuração. Para voltar:
--   update public.compilacao_responsabilidades
--      set responsabilidade = '<valor de "de">', alterada_em = now()
--    where personagem = '<personagem>';
-- (ou, se `de` estava vazio: delete from public.compilacao_responsabilidades
--  where personagem = '<personagem>';)
-- O histórico guarda os últimos 90 dias e no máximo as 5.000 trocas mais novas.

create table if not exists public.compilacao_responsabilidades (
  personagem       text        primary key check (personagem ~ '^[a-z]{1,40}$'), -- id público (ex.: 'leonardo')
  responsabilidade text        not null check (responsabilidade in
                     ('atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas')),
  alterada_em      timestamptz not null default now()
);

-- Só acrescenta linhas: uma por troca feita pela página.
create table if not exists public.compilacao_responsabilidades_historico (
  id          bigint generated always as identity primary key,
  personagem  text        not null check (personagem ~ '^[a-z]{1,40}$'),
  de          text check (de is null or de in
                ('atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas')), -- vazio = função da configuração
  para        text        not null check (para in
                ('atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas')),
  alterada_em timestamptz not null default now()
);

create index if not exists compilacao_responsabilidades_historico_alterada_em
  on public.compilacao_responsabilidades_historico (alterada_em);

alter table public.compilacao_responsabilidades enable row level security;
alter table public.compilacao_responsabilidades_historico enable row level security;
revoke all on public.compilacao_responsabilidades from anon, authenticated;
revoke all on public.compilacao_responsabilidades_historico from anon, authenticated;
-- A lista (GET) lê a tabela direto com a chave do servidor.
grant select on public.compilacao_responsabilidades to service_role;

-- A troca inteira numa transação só, com uma trava: pedidos ao mesmo tempo (até a
-- primeira gravação de quem ainda não tem linha) passam um de cada vez.
-- Devolve { resultado, personagem?, responsabilidade?, alterada_em? }:
--   'igual'    a mesma escolha que já estava: nada é gravado
--   'cedo'     a pessoa mudou há menos de 3 segundos
--   'lotado'   já houve 60 trocas no último minuto (de toda a equipe)
--   'invalida' chave fora da lista (o servidor já confere antes)
--   'gravada'  trocou; o histórico ganhou uma linha e foi podado
create or replace function public.alterar_responsabilidade(p_personagem text, p_para text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_atual   public.compilacao_responsabilidades%rowtype;
  v_existe  boolean;
  v_agora   timestamptz;
begin
  if p_personagem is null or p_personagem !~ '^[a-z]{1,40}$' or p_para is null
     or p_para not in ('atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas') then
    return jsonb_build_object('resultado', 'invalida');
  end if;

  -- Uma troca por vez em toda a tabela (são poucas; a transação é curta). Fila longa
  -- não prende conexão: depois de 2 s esperando, desiste (erro 55P03, a rota dá 429).
  perform set_config('lock_timeout', '2s', true);
  perform pg_advisory_xact_lock(hashtext('compilacao_responsabilidades'));
  -- A hora depois da trava (now() seria a do começo da transação, antes da espera).
  v_agora := clock_timestamp();

  select * into v_atual from public.compilacao_responsabilidades where personagem = p_personagem;
  v_existe := found;

  if v_existe and v_atual.responsabilidade = p_para then
    return jsonb_build_object('resultado', 'igual', 'personagem', v_atual.personagem,
      'responsabilidade', v_atual.responsabilidade, 'alterada_em', v_atual.alterada_em);
  end if;

  -- Hora gravada no futuro (relógio adiantado, edição à mão) não trava a troca.
  if v_existe and v_atual.alterada_em <= v_agora and v_atual.alterada_em > v_agora - interval '3 seconds' then
    return jsonb_build_object('resultado', 'cedo');
  end if;

  if (select count(*) from public.compilacao_responsabilidades_historico
       where alterada_em > v_agora - interval '1 minute') >= 60 then
    return jsonb_build_object('resultado', 'lotado');
  end if;

  insert into public.compilacao_responsabilidades (personagem, responsabilidade, alterada_em)
  values (p_personagem, p_para, v_agora)
  on conflict (personagem) do update
    set responsabilidade = excluded.responsabilidade, alterada_em = excluded.alterada_em;

  insert into public.compilacao_responsabilidades_historico (personagem, de, para, alterada_em)
  values (p_personagem, case when v_existe then v_atual.responsabilidade end, p_para, v_agora);

  -- Poda: últimos 90 dias e no máximo as 5.000 trocas mais novas (a tabela fica pequena).
  delete from public.compilacao_responsabilidades_historico
   where alterada_em < v_agora - interval '90 days'
      or id <= (select max(id) from public.compilacao_responsabilidades_historico) - 5000;

  return jsonb_build_object('resultado', 'gravada', 'personagem', p_personagem,
    'responsabilidade', p_para, 'alterada_em', v_agora);
end;
$$;

revoke execute on function public.alterar_responsabilidade(text, text) from public, anon, authenticated;
grant execute on function public.alterar_responsabilidade(text, text) to service_role;
