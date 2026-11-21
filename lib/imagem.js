'use client';

import { supabase } from './supabase';

// Reduz a foto no próprio celular (lado maior 900 px, JPEG) antes de enviar:
// economiza dados, acelera o site e respeita o limite de 1 MB da pasta de fotos.
export async function prepararImagem(arquivo, maxLado = 900, qualidade = 0.82, maxBytes = 1024 * 1024) {
  if (!arquivo || !arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade));
  if (!blob) throw new Error('Não consegui processar essa imagem.');
  if (blob.size > maxBytes) throw new Error('A imagem ficou grande demais. Tente outra foto.');
  return blob;
}

// Envia para a pasta pública do próprio usuário e devolve o endereço da foto.
export async function enviarImagem(arquivo, userId, opcoes) {
  const blob = await prepararImagem(arquivo, opcoes?.maxLado);
  const caminho = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('dl-imagens')
    .upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error('Não consegui enviar a foto. Tente de novo.');
  return supabase.storage.from('dl-imagens').getPublicUrl(caminho).data.publicUrl;
}

// Foto de documento: lado maior 1600 px (para o texto continuar legível) e até 3 MB. Fica só no armazenamento privado.
export const prepararDocumento = (arquivo) => prepararImagem(arquivo, 1600, 0.85, 3 * 1024 * 1024);
