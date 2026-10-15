/** URL pública de um arquivo do bucket "midia". */
export function urlMidia(caminho: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/midia/${caminho}`;
}
