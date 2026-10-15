import { z } from "zod";
import { paraCentavos } from "@/lib/dinheiro";

export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

/** Mensagem amigável para erros do Postgres/PostgREST. */
export function mensagemErroBanco(erro: { code?: string; message?: string } | null, padrao: string): string {
  if (!erro) return padrao;
  if (erro.code === "23505") return "Já existe um cadastro com esse valor.";
  if (erro.code === "23503") return "Esse cadastro está em uso e não pode ser excluído.";
  if (erro.code === "42501") return "Sem permissão para essa ação.";
  return padrao;
}

export const campoTexto = (rotulo: string) =>
  z.string({ error: `Preencha ${rotulo}.` }).trim().min(1, `Preencha ${rotulo}.`);

export const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

export const campoDinheiro = (rotulo: string) =>
  z
    .string({ error: `Preencha ${rotulo}.` })
    .transform((v, ctx) => {
      const c = paraCentavos(v);
      if (c === null) {
        ctx.addIssue({ code: "custom", message: `${rotulo}: valor inválido (ex.: 49,99).` });
        return z.NEVER;
      }
      return c;
    });

/** "2,2" → "2.20"; usado para numeric do Postgres sem passar por float. */
export const campoDecimal = (rotulo: string, casas: number) =>
  z
    .string({ error: `Preencha ${rotulo}.` })
    .trim()
    .transform((v, ctx) => {
      const m = new RegExp(`^(\\d+)(?:[.,](\\d{1,${casas}}))?$`).exec(v);
      if (!m) {
        ctx.addIssue({ code: "custom", message: `${rotulo}: valor inválido.` });
        return z.NEVER;
      }
      return `${m[1]}.${(m[2] ?? "").padEnd(casas, "0")}`;
    });

export const campoInteiro = (rotulo: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${rotulo}: número inválido.` })
    .int(`${rotulo}: use um número inteiro.`)
    .min(min, `${rotulo}: mínimo ${min}.`)
    .max(max, `${rotulo}: máximo ${max}.`);

export const campoCheckbox = z
  .union([z.literal("on"), z.null(), z.undefined()])
  .transform((v) => v === "on");

/** FormData → objeto simples (checkbox desmarcado vira ausente). */
export function dadosDoForm(dados: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(dados.entries());
}
