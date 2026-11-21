import { adminDaRequisicao } from '../../../../lib/admin-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fila de saques: pendentes (mais antigos primeiro) e os últimos resolvidos.
export async function GET(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const cols = 'id,conta_tipo,valor,chave_pix,status,motivo,criado_em,resolvido_em,dl_lojas(nome,whatsapp),dl_entregadores(nome,telefone)';
  const [pend, rec] = await Promise.all([
    r.admin.from('dl_saques').select(cols).eq('status', 'pendente').order('criado_em'),
    r.admin.from('dl_saques').select(cols).neq('status', 'pendente').order('resolvido_em', { ascending: false }).limit(30),
  ]);
  if (pend.error || rec.error) return Response.json({ error: 'Não consegui carregar os saques. Confira se o SQL 18 foi rodado.' }, { status: 502 });
  const f = (s) => ({
    id: s.id,
    conta: s.conta_tipo,
    nome: (s.conta_tipo === 'loja' ? s.dl_lojas?.nome : s.dl_entregadores?.nome) || '(removido)',
    contato: s.conta_tipo === 'loja' ? s.dl_lojas?.whatsapp : s.dl_entregadores?.telefone,
    valor: Number(s.valor),
    chave_pix: s.chave_pix,
    status: s.status,
    motivo: s.motivo,
    criado_em: s.criado_em,
    resolvido_em: s.resolvido_em,
  });
  const pendentes = pend.data.map(f);
  return Response.json(
    { pendentes, total: Math.round(pendentes.reduce((t, s) => t + s.valor, 0) * 100) / 100, recentes: rec.data.map(f) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
