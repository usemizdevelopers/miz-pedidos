-- =============================================================
-- Fase 3: cada documento guarda a versão do modelo do PDF.
-- Simulação: carimba a versão vigente a cada salvamento.
-- Pedido confirmado: mantém a versão da simulação (o PDF não muda depois).
-- =============================================================

create or replace function public.carimbar_versao_modelo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'simulacao' then
    select id into new.modelo_versao_id
      from public.modelo_pdf_versoes
     order by versao desc
     limit 1;
  end if;
  return new;
end;
$$;

create trigger documentos_versao_modelo
  before insert or update on public.documentos
  for each row execute function public.carimbar_versao_modelo();
