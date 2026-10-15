# Miz · Gerador de pedidos

Sistema interno para montar simulações e pedidos confirmados da Miz, com PDF na identidade da marca.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres + RLS, Auth, Storage).

## Primeira configuração

1. `npm install`
2. Preencha o `.env.local` (modelo em `.env.example`). Para o `SUPABASE_DB_URL`: no painel do Supabase,
   **Connect → Session pooler**, copie a URI e troque `[YOUR-PASSWORD]` pela senha do banco.
3. `npm run db:push`: aplica as migrações de `supabase/migrations` (esquema, RLS e catálogo inicial).
4. `npm run admin:criar`: cria o admin do `ADMIN_EMAIL` e mostra uma senha temporária.
5. `npm run dev` e acesse http://localhost:3000.

No painel do Supabase, em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
As vendedoras são cadastradas pelo admin dentro do sistema. Mesmo que alguém se cadastre por fora, o perfil nasce inativo e não acessa nada.

## Comandos

> **Atenção:** `test:rls`, `test:fluxo`, `test:tela`, `test:fases45` e `pdfs:dulcinea` criam e apagam usuárias, documentos e versões do modelo no banco do `.env.local`. **Não rode contra o banco de produção.** Use um projeto Supabase de testes.


| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:fluxo` | Fase 2 no banco real: caso Dulcinéa, conversão, vencida, CNPJ, imutabilidade, duplicar (limpa tudo no fim) |
| `npm run test:tela [-- pasta]` | Com o `npm run dev` rodando: vendedora monta a Dulcinéa pela interface, converte e salva prints |
| `npm run pdfs:dulcinea [-- pasta]` | Com o `npm run dev` rodando: gera os PDFs do caso Dulcinéa (simulação e pedido, A4 e celular) e verifica fonte mínima e páginas meio vazias |
| `npm run modelo:seed` | Cria a versão 1 do modelo do PDF a partir de `src/lib/modelo/padrao.ts` |
| `npm run test:fases45 [-- pasta]` | Com o `npm run dev` rodando: editor do modelo (versões, imutabilidade, restauração), WhatsApp, painel e CSV |
| `npm run test:rls` | Testa as regras de acesso direto na API do Supabase (cria e apaga usuárias de teste) |
| `npm run typecheck` / `npm run lint` | Checagens estáticas |
| `npm run db:push` | Aplica migrações pendentes |
| `npm run admin:criar [-- email]` | Cria ou promove um admin e gera senha temporária |

## PDFs

- A página `/impressao/[id]?formato=a4|celular` é o documento. O Chromium headless imprime essa página (`src/lib/pdf/gerar.ts`). Com `&tela=1`, ela vira a pré-visualização.
- `src/components/pdf/paginador.tsx` distribui os blocos pelas folhas sem cortar nenhum item.
- Fotos e logo de `public/modelo/` são do protótipo, extraídos do PDF do Canva. Os definitivos vêm do upload do admin (Fase 4).
- Fonte cursiva: Mrs Saint Delafield (Google Fonts), no lugar da Hello Paris Script do Canva.
- Editor do modelo: `/admin/modelo`. Cada salvamento cria uma versão (`modelo_pdf_versoes`); a simulação grava a versão vigente ao ser salva e o pedido confirmado mantém a dela.
- Deploy na Vercel: trocar o Chromium local pelo `@sparticuz/chromium` em `gerar.ts`.

## Regras importantes

- Dinheiro sempre em **centavos inteiros** (`preco_centavos`, `total_centavos`…). Formatação só na exibição (`src/lib/dinheiro.ts`).
- A segurança fica no banco (RLS em todas as tabelas). As server actions também checam o papel, mas isso é uma camada extra.
- A secret key (`SUPABASE_SECRET_KEY`) só é usada no servidor, para gerenciar usuários no Auth (`src/lib/supabase/admin.ts`).
