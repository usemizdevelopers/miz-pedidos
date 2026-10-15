-- =============================================================
-- Seed inicial: tipos de grade, condições comerciais e catálogo.
-- Idempotente: pode rodar de novo sem duplicar.
-- Hex das cores estimados a partir do PDF de referência (ajustáveis no admin).
-- =============================================================

insert into public.grade_tipos (nome, composicao, pecas_por_grade) values
  ('Grade 5', '2P + 2M + 1G', 5),
  ('Grade 4', '2 PP/P + 2 M/G', 4)
on conflict (nome) do nothing;

insert into public.condicoes_comerciais (id) values (1)
on conflict (id) do nothing;

with g5 as (select id from public.grade_tipos where nome = 'Grade 5')
insert into public.pecas (referencia, nome, preco_centavos, grade_tipo_id)
select v.referencia, v.nome, v.preco, g5.id
from g5, (values
  ('BL0001', 'Blusa Mia',                    4999),
  ('BL0006', 'Blusa Mia Tule',               5999),
  ('CT0001', 'Camiseta Oversize Liz',        5999),
  ('BL0003', 'Blusa Renda Maria',            7999),
  ('BL0004', 'Blusa Barrada Olívia',         7999),
  ('RE0001', 'Regata Chloé',                 5499),
  ('VD002',  'Vestido Detalhe Ribana Chloé', 9999),
  ('RE0002', 'Regata Canelada Basic',        3699)
) as v (referencia, nome, preco)
on conflict (referencia) do nothing;

insert into public.peca_cores (peca_id, nome, hex, disponibilidade, previsao, ordem)
select p.id, c.nome, c.hex, c.disp::public.disponibilidade_cor, c.previsao::date, c.ordem
from (values
  ('BL0001', 'Azul bebê',     '#C9DCEB', 'pronta_entrega', null, 1),
  ('BL0001', 'Verde musgo',   '#6A8F2E', 'pronta_entrega', null, 2),
  ('BL0001', 'Preto',         '#111111', 'pronta_entrega', null, 3),

  ('BL0006', 'Marrom cacau',  '#6B4433', 'pronta_entrega', null, 1),
  ('BL0006', 'Off white',     '#F4F1EA', 'pronta_entrega', null, 2),
  ('BL0006', 'Preta',         '#111111', 'pronta_entrega', null, 3),
  ('BL0006', 'Verde musgo',   '#6A8F2E', 'pronta_entrega', null, 4),

  ('CT0001', 'Off white',     '#F4F1EA', 'pronta_entrega', null, 1),
  ('CT0001', 'Marrom',        '#6B4433', 'pronta_entrega', null, 2),
  ('CT0001', 'Azul bebê',     '#C9DCEB', 'pronta_entrega', null, 3),
  ('CT0001', 'Verde menta',   '#9CCBB0', 'pronta_entrega', null, 4),

  ('BL0003', 'Branco',        '#FFFFFF', 'pronta_entrega', null, 1),
  ('BL0003', 'Preto',         '#111111', 'pronta_entrega', null, 2),

  ('BL0004', 'Branco',        '#FFFFFF', 'pronta_entrega', null, 1),
  ('BL0004', 'Preto',         '#111111', 'pronta_entrega', null, 2),

  ('RE0001', 'Off white',     '#F4F1EA', 'pronta_entrega', null, 1),
  ('RE0001', 'Marrom',        '#6B4433', 'pronta_entrega', null, 2),
  ('RE0001', 'Verde',         '#6A8F2E', 'pronta_entrega', null, 3),
  ('RE0001', 'Preto',         '#111111', 'pronta_entrega', null, 4),

  ('VD002',  'Marrom',        '#6B4433', 'pronta_entrega', null, 1),
  ('VD002',  'Verde menta',   '#9CCBB0', 'pronta_entrega', null, 2),
  ('VD002',  'Preto',         '#111111', 'pronta_entrega', null, 3),

  ('RE0002', 'Marrom',        '#6B4433', 'programada', '2026-10-20', 1),
  ('RE0002', 'Azul marinho',  '#1F2D4D', 'programada', '2026-10-20', 2),
  ('RE0002', 'Off white',     '#F4F1EA', 'programada', '2026-10-20', 3),
  ('RE0002', 'Preto',         '#111111', 'programada', '2026-10-20', 4)
) as c (referencia, nome, hex, disp, previsao, ordem)
join public.pecas p on p.referencia = c.referencia
on conflict (peca_id, nome) do nothing;
