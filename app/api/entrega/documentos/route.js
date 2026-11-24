import { erro, entregadorDaRequisicao } from '../../../../lib/entrega-servidor';
import { TIPOS_DOC, TIPOS_COM_PDF, MAX_BYTES_DOC, ehJpeg, ehPdf, precisaDeDocumentos, tiposExigidos } from '../../../../lib/documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Situação dos documentos do próprio entregador (nunca devolve as imagens).
export async function GET(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const { data } = await admin.from('dl_documentos').select('tipo').eq('entregador_id', ent.id);
  return Response.json(
    {
      exigidos: tiposExigidos(ent.veiculo),
      enviados: (data || []).map((d) => d.tipo),
      status: ent.docs_status,
      motivo: ent.docs_status === 'reprovado' ? ent.docs_motivo : null,
      obrigatorio: precisaDeDocumentos(ent),
      dados: { cpf: ent.cpf, cnh_nome: ent.cnh_nome, cnh_validade: ent.cnh_validade, cnh_categoria: ent.cnh_categoria, placa: ent.placa, endereco: ent.endereco },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// Recebe UMA foto (cnh, crlv ou selfie) e guarda no bucket privado.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  if (ent.docs_status === 'aprovado') return erro('Seus documentos já foram aprovados.', 409);
  if (ent.docs_status === 'em_analise') return erro('Seus documentos estão em análise. Aguarde o resultado.', 409);

  let form;
  try { form = await request.formData(); } catch { return erro('Envio inválido.', 400); }
  const tipo = String(form.get('tipo') || '');
  const arquivo = form.get('arquivo');
  if (!TIPOS_DOC.includes(tipo) || !tiposExigidos(ent.veiculo).includes(tipo)) return erro('Documento não pedido para o seu veículo.', 400);
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return erro('Envie a foto.', 400);
  if (arquivo.size > MAX_BYTES_DOC) return erro('A foto ficou grande demais. Tire outra.', 413);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const pdf = TIPOS_COM_PDF.includes(tipo) && ehPdf(bytes);
  if (!pdf && !ehJpeg(bytes)) return erro(TIPOS_COM_PDF.includes(tipo) ? 'Envie uma foto ou um PDF.' : 'Envie uma foto (JPEG).', 400);

  const ext = pdf ? 'pdf' : 'jpg';
  const caminho = `${ent.id}/${tipo}.${ext}`;
  const { error: e1 } = await admin.storage.from('dl-documentos').upload(caminho, bytes, { contentType: pdf ? 'application/pdf' : 'image/jpeg', upsert: true });
  if (e1) return erro('Não consegui guardar o arquivo. Tente de novo.', 502);
  // Se trocou de foto para PDF (ou o contrário), apaga o arquivo antigo.
  if (TIPOS_COM_PDF.includes(tipo)) await admin.storage.from('dl-documentos').remove([`${ent.id}/${tipo}.${pdf ? 'jpg' : 'pdf'}`]);
  const { error: e2 } = await admin.from('dl_documentos').upsert({ entregador_id: ent.id, tipo, caminho, criado_em: new Date().toISOString() }, { onConflict: 'entregador_id,tipo' });
  if (e2) return erro('Não consegui guardar a foto. Tente de novo.', 502);
  return Response.json({ ok: true });
}
