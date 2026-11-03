-- Números das planilhas de Atualizações da /compilacao (importados por
-- scripts/importar-planilhas.mjs). Só números e sinais: nunca notas, links,
-- títulos nem texto livre das planilhas.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > cole este arquivo > Run.
--
-- Só o servidor (chave secreta) acessa estas tabelas.
-- RLS ligado e sem políticas: a chave pública (anon) não lê nem escreve nada.

-- Uma linha por pessoa x mês x cidade x sigla. A chave natural permite reimportar.
create table if not exists public.compilacao_planilhas (
  personagem       text     not null,              -- id da pessoa no /compilacao (ex.: 'nathalia')
  ano              smallint not null,
  mes              smallint not null check (mes between 1 and 12),
  cidade           text     not null,              -- nome normalizado
  uf               text     not null default '',   -- '' quando a planilha não diz
  sigla_planilha   text     not null,              -- como está na planilha (ex.: 'L', 'R SEFIN')
  cidade_id        integer,                        -- nulo até existir a resolução cidade -> cidadeId
  cidade_status    text     not null check (cidade_status in ('ativa', 'saiu')),
  modulo_id        integer,                        -- nulo em "outros" sem tipo no sistema
  balde            text     not null check (balde in
                     ('leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros')),
  total_planilha   integer  not null check (total_planilha >= 0),
  deficit          integer  not null check (deficit >= 0),
  compiladas       integer  not null check (compiladas >= 0),
  faltantes        integer  not null default 0,    -- números distintos em D e F (união)
  faltantes_do     integer  not null default 0,
  faltantes_siscam integer  not null default 0,
  faltantes_numeros jsonb   not null default '[]', -- lista de [número, ano | null]
  par_em_alerta    boolean  not null default false,
  sigla_duvidosa   boolean  not null default false,
  nao_municipal    boolean  not null default false,
  primary key (personagem, ano, mes, cidade, uf, sigla_planilha)
);

-- Uma linha por pessoa x mês: conferências e rastro da importação.
create table if not exists public.compilacao_planilhas_abas (
  personagem           text        not null,
  ano                  smallint    not null,
  mes                  smallint    not null check (mes between 1 and 12),
  titulo_confere       boolean     not null,       -- false: aba de outra pessoa, não conta
  total_formula        integer,                    -- valor guardado da fórmula do Total
  deficit_formula      integer,
  fragmentos_ilegiveis integer     not null default 0,
  numeros_suspeitos    integer     not null default 0,
  avisos               jsonb       not null default '[]',
  arquivo_sha256       text        not null,
  conteudo_sha256      text        not null,       -- do que foi gravado: igual = nada mudou
  importado_em         timestamptz not null default now(),
  primary key (personagem, ano, mes)
);

-- Nome da planilha -> cidadeId do sistema (abreviações, cidades sem UF). Preenchida depois.
create table if not exists public.compilacao_cidades_alias (
  nome_planilha text    not null,                  -- normalizado: sem acento, minúsculo
  uf            text    not null default '',
  cidade_id     integer not null,
  primary key (nome_planilha, uf)
);

alter table public.compilacao_planilhas enable row level security;
alter table public.compilacao_planilhas_abas enable row level security;
alter table public.compilacao_cidades_alias enable row level security;
revoke all on public.compilacao_planilhas from anon, authenticated;
revoke all on public.compilacao_planilhas_abas from anon, authenticated;
revoke all on public.compilacao_cidades_alias from anon, authenticated;

-- Troca tudo o que há da pessoa naquele mês, numa transação só (reimportar não deixa sobra).
-- Se o conteúdo é idêntico ao já gravado, não mexe em nada.
create or replace function public.compilacao_importar_aba(p_aba jsonb, p_linhas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pessoa text     := p_aba->>'personagem';
  v_ano    smallint := (p_aba->>'ano')::smallint;
  v_mes    smallint := (p_aba->>'mes')::smallint;
begin
  if exists (
    select 1 from public.compilacao_planilhas_abas a
    where a.personagem = v_pessoa and a.ano = v_ano and a.mes = v_mes
      and a.conteudo_sha256 = p_aba->>'conteudo_sha256'
  ) then
    return;
  end if;

  delete from public.compilacao_planilhas
   where personagem = v_pessoa and ano = v_ano and mes = v_mes;

  insert into public.compilacao_planilhas (
    personagem, ano, mes, cidade, uf, sigla_planilha, cidade_id, cidade_status, modulo_id, balde,
    total_planilha, deficit, compiladas, faltantes, faltantes_do, faltantes_siscam, faltantes_numeros,
    par_em_alerta, sigla_duvidosa, nao_municipal
  )
  select
    l.personagem, l.ano, l.mes, l.cidade, l.uf, l.sigla_planilha, l.cidade_id, l.cidade_status, l.modulo_id, l.balde,
    l.total_planilha, l.deficit, l.compiladas, l.faltantes, l.faltantes_do, l.faltantes_siscam, l.faltantes_numeros,
    l.par_em_alerta, l.sigla_duvidosa, l.nao_municipal
  from jsonb_populate_recordset(null::public.compilacao_planilhas, p_linhas) l;

  insert into public.compilacao_planilhas_abas as a (
    personagem, ano, mes, titulo_confere, total_formula, deficit_formula,
    fragmentos_ilegiveis, numeros_suspeitos, avisos, arquivo_sha256, conteudo_sha256, importado_em
  )
  select
    x.personagem, x.ano, x.mes, x.titulo_confere, x.total_formula, x.deficit_formula,
    x.fragmentos_ilegiveis, x.numeros_suspeitos, x.avisos, x.arquivo_sha256, x.conteudo_sha256, now()
  from jsonb_populate_record(null::public.compilacao_planilhas_abas, p_aba) x
  on conflict (personagem, ano, mes) do update set
    titulo_confere       = excluded.titulo_confere,
    total_formula        = excluded.total_formula,
    deficit_formula      = excluded.deficit_formula,
    fragmentos_ilegiveis = excluded.fragmentos_ilegiveis,
    numeros_suspeitos    = excluded.numeros_suspeitos,
    avisos               = excluded.avisos,
    arquivo_sha256       = excluded.arquivo_sha256,
    conteudo_sha256      = excluded.conteudo_sha256,
    importado_em         = now();
end;
$$;

revoke execute on function public.compilacao_importar_aba(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.compilacao_importar_aba(jsonb, jsonb) to service_role;
