/**
 * Reduz a foto no navegador antes do upload: lado maior até `ladoMax` px, WebP.
 * Respeita a orientação EXIF (foto de celular "deitada").
 */
export async function reduzirImagem(arquivo: File, ladoMax = 2400, qualidade = 0.86): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não consegui ler essa imagem. Use JPG, PNG ou WebP.");
  }
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Navegador sem suporte a canvas.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao converter a imagem."))), "image/webp", qualidade),
  );
}
