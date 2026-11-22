import { erro, entregadorDaRequisicao } from '../../../../lib/entrega-servidor';
import { ehJpeg } from '../../../../lib/documentos';
import { exigeSelfieDia, diaDaSelfie, caminhoSelfieDia, diaLimiteApagar, MAX_BYTES_SELFIE } from '../../../../lib/selfie-dia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A selfie de hoje já foi enviada? (o app pergunta antes de ligar)
export async function GET(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const dia = diaDaSelfie();
  if (!exigeSelfieDia(ent)) return Response.json({ necessaria: false, feita: true, dia });
  const { data } = await admin.from('dl_selfies_dia').select('dia').eq('entregador_id', ent.id).eq('dia', dia).maybeSingle();
  return Response.json({ necessaria: true, feita: !!data, dia }, { headers: { 'Cache-Control': 'no-store' } });
}

// Recebe a selfie ao vivo do dia e guarda no bucket privado.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  if (!exigeSelfieDia(ent)) return erro('Entregadores de loja não precisam da selfie diária.', 400);

  let form;
  try { form = await request.formData(); } catch { return erro('Envio inválido.', 400); }
  const arquivo = form.get('arquivo');
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return erro('Tire a selfie.', 400);
  if (arquivo.size > MAX_BYTES_SELFIE) return erro('A foto ficou grande demais. Tire outra.', 413);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!ehJpeg(bytes)) return erro('Tire a selfie com a câmera.', 400);

  const dia = diaDaSelfie();
  const caminho = caminhoSelfieDia(ent.id, dia);
  const { error: e1 } = await admin.storage.from('dl-documentos').upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
  if (e1) return erro('Não consegui guardar a selfie. Tente de novo.', 502);
  const { error: e2 } = await admin.from('dl_selfies_dia').upsert({ entregador_id: ent.id, dia, caminho, criado_em: new Date().toISOString() }, { onConflict: 'entregador_id,dia' });
  if (e2) return erro('Não consegui guardar a selfie. Rode o SQL 19 no Supabase.', 502);

  // Faxina: apaga selfies diárias com mais de 30 dias (não bloqueia a resposta se falhar).
  try {
    const { data: velhas } = await admin.from('dl_selfies_dia').select('caminho,dia').eq('entregador_id', ent.id).lt('dia', diaLimiteApagar());
    if (velhas?.length) {
      await admin.storage.from('dl-documentos').remove(velhas.map((v) => v.caminho));
      await admin.from('dl_selfies_dia').delete().eq('entregador_id', ent.id).lt('dia', diaLimiteApagar());
    }
  } catch {}
  return Response.json({ ok: true, dia });
}
