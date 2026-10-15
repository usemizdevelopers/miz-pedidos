-- =============================================================
-- Fase 2: simulações e pedidos confirmados.
-- Regras críticas ficam no banco: preço vem do catálogo, conversão
-- valida validade/CNPJ/parcelas, pedido confirmado é imutável.
-- =============================================================

-- -------------------------------------------------------------
-- Dados da cliente no próprio documento (o PDF não muda se outro documento mudar)
-- -------------------------------------------------------------
alter table public.documentos
  add column proprietaria text not null default '',
  add column loja         text not null default '',
  add column cidade_uf    text not null default '',
  add column cnpj         text,
  alter column cliente_id drop not null;

alter table public.documentos
  alter column proprietaria drop default,
  alter column loja drop default,
  alter column cidade_uf drop default;

alter table public.documento_itens
  add constraint documento_itens_cor_unica unique (documento_id, cor_id);

-- -------------------------------------------------------------
-- Utilitários
-- -------------------------------------------------------------
create or replace function public.hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- CNPJ numérico ou alfanumérico (12 posições [A-Z0-9] + 2 DV). Recebe já normalizado.
create or replace function public.cnpj_valido(p text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  w1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  w2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  s int;
  r int;
  i int;
begin
  if p is null or p !~ '^[A-Z0-9]{12}[0-9]{2}$' or p ~ '^(.)\1{13}$' then
    return false;
  end if;
  s := 0;
  for i in 1..12 loop s := s + (ascii(substr(p, i, 1)) - 48) * w1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> (ascii(substr(p, 13, 1)) - 48) then return false; end if;
  s := 0;
  for i in 1..13 loop s := s + (ascii(substr(p, i, 1)) - 48) * w2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = (ascii(substr(p, 14, 1)) - 48);
end;
$$;

create or replace function public.normalizar_cnpj(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9]', '', 'g'), '');
$$;

-- -------------------------------------------------------------
-- Itens: snapshot do catálogo preenchido pelo banco (ignora o que vier do cliente)
-- -------------------------------------------------------------
create or replace function public.preencher_item_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.status_documento;
  r record;
begin
  select status into v_status from public.documentos where id = new.documento_id;
  if v_status = 'confirmado' then
    raise exception 'Pedido confirmado não pode ser alterado.' using errcode = 'P0001';
  end if;

  select p.referencia, p.nome as peca_nome, p.preco_centavos, p.ativa,
         g.pecas_por_grade, g.composicao,
         c.peca_id, c.nome as cor_nome, c.hex, c.disponibilidade, c.previsao
    into r
    from public.peca_cores c
    join public.pecas p on p.id = c.peca_id
    join public.grade_tipos g on g.id = p.grade_tipo_id
   where c.id = new.cor_id;

  if not found or r.peca_id <> new.peca_id then
    raise exception 'Cor não pertence à peça.' using errcode = 'P0001';
  end if;
  if not r.ativa then
    raise exception 'A peça % está inativa.', r.peca_nome using errcode = 'P0001';
  end if;
  if r.disponibilidade = 'indisponivel' then
    raise exception 'A cor % da peça % está indisponível.', r.cor_nome, r.peca_nome using errcode = 'P0001';
  end if;

  new.peca_referencia  := r.referencia;
  new.peca_nome        := r.peca_nome;
  new.cor_nome         := r.cor_nome;
  new.cor_hex          := r.hex;
  new.preco_centavos   := r.preco_centavos;
  new.pecas_por_grade  := r.pecas_por_grade;
  new.grade_composicao := r.composicao;
  new.disponibilidade  := r.disponibilidade;
  new.previsao         := r.previsao;
  return new;
end;
$$;

create trigger documento_itens_snapshot
  before insert or update on public.documento_itens
  for each row execute function public.preencher_item_documento();

-- Totais em cache (listagens e painel). A tela e o PDF recalculam pelo motor a partir dos itens.
create or replace function public.atualizar_totais_documento(p_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.documentos d
     set total_imediato_centavos  = t.imediato,
         total_reservado_centavos = t.reservado,
         total_centavos           = t.imediato + t.reservado
    from (
      select coalesce(sum(i.preco_centavos * i.pecas_por_grade * i.n_grades)
                        filter (where i.disponibilidade = 'pronta_entrega'), 0)::integer as imediato,
             coalesce(sum(i.preco_centavos * i.pecas_por_grade * i.n_grades)
                        filter (where i.disponibilidade = 'programada'), 0)::integer as reservado
        from public.documento_itens i
       where i.documento_id = p_id
    ) t
   where d.id = p_id;
$$;

-- -------------------------------------------------------------
-- Salvar simulação (cria ou edita) numa transação só. Roda com o RLS da vendedora.
-- -------------------------------------------------------------
create or replace function public.salvar_simulacao(p_id uuid, p_doc jsonb, p_itens jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id        uuid := p_id;
  v_primeiro  boolean := (p_doc ->> 'primeiro_pedido')::boolean;
  v_parcelas  integer := (p_doc ->> 'n_parcelas')::integer;
  v_validade  date := nullif(p_doc ->> 'validade', '')::date;
  v_cnpj      text := public.normalizar_cnpj(p_doc ->> 'cnpj');
  v_max       integer;
  c           public.condicoes_comerciais;
begin
  if not public.is_ativo() then
    raise exception 'Acesso desativado.' using errcode = '42501';
  end if;
  if coalesce(trim(p_doc ->> 'proprietaria'), '') = '' or coalesce(trim(p_doc ->> 'loja'), '') = ''
     or coalesce(trim(p_doc ->> 'cidade_uf'), '') = '' then
    raise exception 'Preencha proprietária, loja e cidade/UF.' using errcode = 'P0001';
  end if;
  if v_primeiro is null then
    raise exception 'Informe se é o primeiro pedido.' using errcode = 'P0001';
  end if;

  select * into c from public.condicoes_comerciais where id = 1;
  v_max := case when v_primeiro then c.primeiro_parcelas_max else c.recompra_parcelas_max end;
  if v_parcelas is null or v_parcelas < 1 or v_parcelas > v_max then
    raise exception 'Parcelamento máximo: %x sem juros.', v_max using errcode = 'P0001';
  end if;
  if v_validade is null or v_validade < public.hoje_sp() then
    raise exception 'Informe a validade da proposta (a partir de hoje).' using errcode = 'P0001';
  end if;
  if v_cnpj is not null and not public.cnpj_valido(v_cnpj) then
    raise exception 'CNPJ inválido.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item.' using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.documentos (proprietaria, loja, cidade_uf, cnpj, primeiro_pedido, validade, n_parcelas, condicoes_snapshot)
    values (trim(p_doc ->> 'proprietaria'), trim(p_doc ->> 'loja'), trim(p_doc ->> 'cidade_uf'), v_cnpj,
            v_primeiro, v_validade, v_parcelas, to_jsonb(c))
    returning id into v_id;
  else
    update public.documentos
       set proprietaria = trim(p_doc ->> 'proprietaria'),
           loja = trim(p_doc ->> 'loja'),
           cidade_uf = trim(p_doc ->> 'cidade_uf'),
           cnpj = v_cnpj,
           primeiro_pedido = v_primeiro,
           validade = v_validade,
           n_parcelas = v_parcelas,
           condicoes_snapshot = to_jsonb(c)
     where id = v_id and status = 'simulacao';
    if not found then
      raise exception 'Simulação não encontrada ou já confirmada.' using errcode = 'P0001';
    end if;
    delete from public.documento_itens where documento_id = v_id;
  end if;

  insert into public.documento_itens (documento_id, peca_id, cor_id, n_grades, ordem)
  select v_id, x.peca_id, x.cor_id, x.n_grades, coalesce(x.ordem, 0)
    from jsonb_to_recordset(p_itens) as x (peca_id uuid, cor_id uuid, n_grades integer, ordem integer);

  perform public.atualizar_totais_documento(v_id);
  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- Numeração dos pedidos: 2026-0001, 2026-0002…
-- -------------------------------------------------------------
create table public.numeracao_pedidos (
  ano     integer primary key,
  ultimo  integer not null default 0
);
alter table public.numeracao_pedidos enable row level security;
revoke all on public.numeracao_pedidos from anon, authenticated;

-- -------------------------------------------------------------
-- Converter simulação em pedido confirmado (congela preços e condições)
-- -------------------------------------------------------------
create or replace function public.converter_em_pedido(p_id uuid, p_cnpj text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d        public.documentos;
  c        public.condicoes_comerciais;
  v_cnpj   text;
  v_max    integer;
  v_ano    integer;
  v_n      integer;
  v_numero text;
begin
  if not public.is_ativo() then
    raise exception 'Acesso desativado.' using errcode = '42501';
  end if;

  select * into d from public.documentos where id = p_id for update;
  if not found or d.vendedora_id <> (select auth.uid()) then
    raise exception 'Simulação não encontrada.' using errcode = 'P0001';
  end if;
  if d.status <> 'simulacao' then
    raise exception 'Este documento já é um pedido confirmado.' using errcode = 'P0001';
  end if;
  if d.validade is null or d.validade < public.hoje_sp() then
    raise exception 'Simulação vencida: atualize a validade antes de converter.' using errcode = 'P0001';
  end if;

  v_cnpj := coalesce(public.normalizar_cnpj(p_cnpj), d.cnpj);
  if v_cnpj is null or not public.cnpj_valido(v_cnpj) then
    raise exception 'Informe um CNPJ válido para confirmar o pedido.' using errcode = 'P0001';
  end if;

  select * into c from public.condicoes_comerciais where id = 1;
  v_max := case when d.primeiro_pedido then c.primeiro_parcelas_max else c.recompra_parcelas_max end;
  if d.n_parcelas > v_max then
    raise exception 'Parcelamento máximo agora é %x. Edite a simulação.', v_max using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.documento_itens where documento_id = p_id) then
    raise exception 'O pedido não tem itens.' using errcode = 'P0001';
  end if;

  -- Congela com o catálogo atual (o trigger refaz o snapshot de cada item)
  update public.documento_itens set n_grades = n_grades where documento_id = p_id;
  perform public.atualizar_totais_documento(p_id);

  v_ano := extract(year from public.hoje_sp())::integer;
  insert into public.numeracao_pedidos as n (ano, ultimo) values (v_ano, 1)
  on conflict (ano) do update set ultimo = n.ultimo + 1
  returning ultimo into v_n;
  v_numero := v_ano::text || '-' || lpad(v_n::text, 4, '0');

  update public.documentos
     set status = 'confirmado',
         numero = v_numero,
         cnpj = v_cnpj,
         confirmado_em = now(),
         condicoes_snapshot = to_jsonb(c)
   where id = p_id;

  return v_numero;
end;
$$;

-- -------------------------------------------------------------
-- Duplicar (simulação ou pedido) → nova simulação sem validade
-- -------------------------------------------------------------
create or replace function public.duplicar_documento(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d    public.documentos;
  v_id uuid;
begin
  if not public.is_ativo() then
    raise exception 'Acesso desativado.' using errcode = '42501';
  end if;
  select * into d from public.documentos where id = p_id;
  if not found then
    raise exception 'Documento não encontrado.' using errcode = 'P0001';
  end if;

  insert into public.documentos (proprietaria, loja, cidade_uf, cnpj, primeiro_pedido, validade, n_parcelas, condicoes_snapshot)
  values (d.proprietaria, d.loja, d.cidade_uf, d.cnpj, d.primeiro_pedido, null, d.n_parcelas,
          (select to_jsonb(c) from public.condicoes_comerciais c where c.id = 1))
  returning id into v_id;

  -- Só itens ainda disponíveis (o RLS já esconde cores indisponíveis da vendedora)
  insert into public.documento_itens (documento_id, peca_id, cor_id, n_grades, ordem)
  select v_id, i.peca_id, i.cor_id, i.n_grades, i.ordem
    from public.documento_itens i
    join public.peca_cores c on c.id = i.cor_id and c.disponibilidade <> 'indisponivel'
    join public.pecas p on p.id = i.peca_id and p.ativa
   where i.documento_id = p_id;

  perform public.atualizar_totais_documento(v_id);
  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- Permissões das funções
-- -------------------------------------------------------------
revoke execute on function
  public.salvar_simulacao(uuid, jsonb, jsonb),
  public.converter_em_pedido(uuid, text),
  public.duplicar_documento(uuid),
  public.atualizar_totais_documento(uuid),
  public.cnpj_valido(text),
  public.normalizar_cnpj(text),
  public.hoje_sp(),
  public.is_admin(),
  public.is_ativo()
from public, anon;

grant execute on function
  public.salvar_simulacao(uuid, jsonb, jsonb),
  public.converter_em_pedido(uuid, text),
  public.duplicar_documento(uuid),
  public.atualizar_totais_documento(uuid),
  public.cnpj_valido(text),
  public.normalizar_cnpj(text),
  public.hoje_sp()
to authenticated;
