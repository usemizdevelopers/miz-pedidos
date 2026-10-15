-- =============================================================
-- Miz · Gerador de pedidos — esquema inicial (Fase 1)
-- Dinheiro sempre em centavos (integer). Segurança via RLS.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- Tipos
-- -------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'vendedora');
create type public.disponibilidade_cor as enum ('pronta_entrega', 'programada', 'indisponivel');
create type public.status_documento as enum ('simulacao', 'confirmado');

-- -------------------------------------------------------------
-- Utilitário: atualizado_em
-- -------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '',
  email       text not null default '',
  whatsapp    text,
  papel       public.papel_usuario not null default 'vendedora',
  -- Nasce inativo: só o admin (ou o script de admin) ativa. Assim um cadastro
  -- público acidental pelo Auth não ganha acesso a nada.
  ativa       boolean not null default false,
  criado_em   timestamptz not null default now()
);

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Funções de papel usadas nas políticas (security definer evita recursão no RLS de profiles)
create or replace function public.is_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and ativa
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and ativa and papel = 'admin'
  );
$$;

-- -------------------------------------------------------------
-- Catálogo
-- -------------------------------------------------------------
create table public.grade_tipos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null unique,
  composicao       text not null,
  pecas_por_grade  integer not null check (pecas_por_grade > 0),
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

create table public.pecas (
  id                 uuid primary key default gen_random_uuid(),
  referencia         text not null unique,
  nome               text not null,
  preco_centavos     integer not null check (preco_centavos > 0),
  grade_tipo_id      uuid not null references public.grade_tipos (id),
  composicao_tecido  text,
  ativa              boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create trigger pecas_atualizado_em
  before update on public.pecas
  for each row execute function public.tocar_atualizado_em();

create table public.peca_fotos (
  id            uuid primary key default gen_random_uuid(),
  peca_id       uuid not null references public.pecas (id) on delete cascade,
  storage_path  text not null,
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now()
);

create table public.peca_cores (
  id               uuid primary key default gen_random_uuid(),
  peca_id          uuid not null references public.pecas (id) on delete cascade,
  nome             text not null,
  hex              text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  disponibilidade  public.disponibilidade_cor not null default 'pronta_entrega',
  previsao         date,
  ordem            integer not null default 0,
  unique (peca_id, nome),
  constraint programada_exige_previsao
    check (disponibilidade <> 'programada' or previsao is not null)
);

-- -------------------------------------------------------------
-- Condições comerciais (linha única, editável pelo admin)
-- -------------------------------------------------------------
create table public.condicoes_comerciais (
  id                                    smallint primary key default 1 check (id = 1),
  markup                                numeric(5, 2) not null default 2.20 check (markup > 1),
  -- 80% na etiqueta + 20% com 30% off = 0,94
  fator_conservador                     numeric(4, 3) not null default 0.940 check (fator_conservador > 0 and fator_conservador <= 1),
  despacho_horas                        integer not null default 24 check (despacho_horas > 0),
  expedicao                             text not null default 'Itajaí (SC)',
  primeiro_pedido_minimo                text not null default 'Nenhum',
  primeiro_frete_gratis                 boolean not null default true,
  primeiro_parcelas_max                 integer not null default 6 check (primeiro_parcelas_max between 1 and 24),
  recompra_pedido_minimo                text not null default 'Nenhum (grade fechada obrigatória)',
  recompra_frete_gratis_minimo_centavos integer not null default 300000 check (recompra_frete_gratis_minimo_centavos >= 0),
  recompra_parcelas_max                 integer not null default 6 check (recompra_parcelas_max between 1 and 24),
  outras_formas_pagamento               text not null default 'PIX ou boleto à vista',
  atualizado_em                         timestamptz not null default now(),
  atualizado_por                        uuid references public.profiles (id)
);

create trigger condicoes_atualizado_em
  before update on public.condicoes_comerciais
  for each row execute function public.tocar_atualizado_em();

-- -------------------------------------------------------------
-- Modelo do PDF (versões imutáveis; a vigente é a de maior número)
-- -------------------------------------------------------------
create table public.modelo_pdf_versoes (
  id           uuid primary key default gen_random_uuid(),
  versao       integer not null unique,
  blocos       jsonb not null,
  mensagens    jsonb not null default '{}'::jsonb,
  observacao   text,
  criado_por   uuid references public.profiles (id),
  criado_em    timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Clientes, simulações e pedidos
-- -------------------------------------------------------------
create table public.clientes (
  id            uuid primary key default gen_random_uuid(),
  vendedora_id  uuid not null default auth.uid() references public.profiles (id),
  proprietaria  text not null,
  loja          text not null,
  cidade_uf     text not null,
  cnpj          text,
  criado_em     timestamptz not null default now()
);

create table public.documentos (
  id                        uuid primary key default gen_random_uuid(),
  vendedora_id              uuid not null default auth.uid() references public.profiles (id),
  cliente_id                uuid not null references public.clientes (id),
  status                    public.status_documento not null default 'simulacao',
  numero                    text unique,
  primeiro_pedido           boolean not null,
  validade                  date,
  n_parcelas                integer not null check (n_parcelas >= 1),
  modelo_versao_id          uuid references public.modelo_pdf_versoes (id),
  condicoes_snapshot        jsonb,
  total_imediato_centavos   integer,
  total_reservado_centavos  integer,
  total_centavos            integer,
  confirmado_em             timestamptz,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);

create index documentos_vendedora_idx on public.documentos (vendedora_id, criado_em desc);

create trigger documentos_atualizado_em
  before update on public.documentos
  for each row execute function public.tocar_atualizado_em();

create table public.documento_itens (
  id                uuid primary key default gen_random_uuid(),
  documento_id      uuid not null references public.documentos (id) on delete cascade,
  peca_id           uuid not null references public.pecas (id),
  cor_id            uuid not null references public.peca_cores (id),
  n_grades          integer not null check (n_grades > 0),
  ordem             integer not null default 0,
  -- Fotografia do catálogo no momento do documento (congelada no confirmado)
  peca_referencia   text,
  peca_nome         text,
  cor_nome          text,
  cor_hex           text,
  preco_centavos    integer,
  pecas_por_grade   integer,
  grade_composicao  text,
  disponibilidade   public.disponibilidade_cor,
  previsao          date
);

create index documento_itens_documento_idx on public.documento_itens (documento_id);

-- -------------------------------------------------------------
-- Permissões e RLS
-- -------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on function public.is_admin(), public.is_ativo() to authenticated;

alter table public.profiles             enable row level security;
alter table public.grade_tipos          enable row level security;
alter table public.pecas                enable row level security;
alter table public.peca_fotos           enable row level security;
alter table public.peca_cores           enable row level security;
alter table public.condicoes_comerciais enable row level security;
alter table public.modelo_pdf_versoes   enable row level security;
alter table public.clientes             enable row level security;
alter table public.documentos           enable row level security;
alter table public.documento_itens      enable row level security;

-- profiles: cada um vê o próprio; admin vê e altera todos
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Catálogo: leitura para usuários ativos, escrita só admin
create policy grade_tipos_select on public.grade_tipos for select to authenticated
  using (public.is_ativo());
create policy grade_tipos_admin on public.grade_tipos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy pecas_select on public.pecas for select to authenticated
  using (public.is_admin() or (public.is_ativo() and ativa));
create policy pecas_admin on public.pecas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy peca_fotos_select on public.peca_fotos for select to authenticated
  using (public.is_ativo());
create policy peca_fotos_admin on public.peca_fotos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Cor indisponível não aparece para a vendedora
create policy peca_cores_select on public.peca_cores for select to authenticated
  using (public.is_admin() or (public.is_ativo() and disponibilidade <> 'indisponivel'));
create policy peca_cores_admin on public.peca_cores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy condicoes_select on public.condicoes_comerciais for select to authenticated
  using (public.is_ativo());
create policy condicoes_admin_update on public.condicoes_comerciais for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Versões do modelo: todos leem (PDF precisa), só admin cria; nunca se altera uma versão
create policy modelo_select on public.modelo_pdf_versoes for select to authenticated
  using (public.is_ativo());
create policy modelo_admin_insert on public.modelo_pdf_versoes for insert to authenticated
  with check (public.is_admin());

-- Clientes: vendedora só os próprios; admin lê todos
create policy clientes_select on public.clientes for select to authenticated
  using (public.is_admin() or (public.is_ativo() and vendedora_id = (select auth.uid())));
create policy clientes_insert on public.clientes for insert to authenticated
  with check (public.is_ativo() and vendedora_id = (select auth.uid()));
create policy clientes_update on public.clientes for update to authenticated
  using (public.is_ativo() and vendedora_id = (select auth.uid()))
  with check (vendedora_id = (select auth.uid()));
create policy clientes_delete on public.clientes for delete to authenticated
  using (public.is_ativo() and vendedora_id = (select auth.uid()));

-- Documentos: vendedora cria/edita/exclui só as próprias simulações.
-- A passagem para "confirmado" acontece apenas por função do banco (Fase 2).
create policy documentos_select on public.documentos for select to authenticated
  using (public.is_admin() or (public.is_ativo() and vendedora_id = (select auth.uid())));
create policy documentos_insert on public.documentos for insert to authenticated
  with check (public.is_ativo() and vendedora_id = (select auth.uid()) and status = 'simulacao');
create policy documentos_update on public.documentos for update to authenticated
  using (public.is_ativo() and vendedora_id = (select auth.uid()) and status = 'simulacao')
  with check (vendedora_id = (select auth.uid()) and status = 'simulacao');
create policy documentos_delete on public.documentos for delete to authenticated
  using (public.is_ativo() and vendedora_id = (select auth.uid()) and status = 'simulacao');

create policy itens_select on public.documento_itens for select to authenticated
  using (exists (
    select 1 from public.documentos d
    where d.id = documento_id
      and (public.is_admin() or (public.is_ativo() and d.vendedora_id = (select auth.uid())))
  ));
create policy itens_escrita on public.documento_itens for all to authenticated
  using (exists (
    select 1 from public.documentos d
    where d.id = documento_id and public.is_ativo()
      and d.vendedora_id = (select auth.uid()) and d.status = 'simulacao'
  ))
  with check (exists (
    select 1 from public.documentos d
    where d.id = documento_id and public.is_ativo()
      and d.vendedora_id = (select auth.uid()) and d.status = 'simulacao'
  ));

-- -------------------------------------------------------------
-- Storage: fotos e logo (leitura pública, escrita só admin)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do nothing;

create policy midia_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and public.is_admin());
create policy midia_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'midia' and public.is_admin());
create policy midia_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'midia' and public.is_admin());
