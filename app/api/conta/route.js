import { contaDaRequisicao, perfilDoCliente } from '../../../lib/conta-servidor';
import { listarCartoes, mpConfigurado } from '../../../lib/mp-servidor';
import { erro, lerJson } from '../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const texto = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max) || null;
function telefoneBR(t) {
  const d = String(t ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}
const publico = (p, user) => ({ nome: p?.nome || '', telefone: p?.telefone || '', endereco: p?.endereco || '', bairro: p?.bairro || '', complemento: p?.complemento || '', email: user.email || '' });

export async function GET(request) {
  const r = await contaDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const perfil = await perfilDoCliente(r.admin, r.user);
  const cartoes = perfil?.mp_customer_id && mpConfigurado() ? await listarCartoes(perfil.mp_customer_id) : [];
  return Response.json({ perfil: publico(perfil, r.user), cartoes: cartoes || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request) {
  const r = await contaDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const b = await lerJson(request);
  if (!b) return erro('Requisição inválida.', 400);
  const telefone = b.telefone ? telefoneBR(b.telefone) : null;
  if (b.telefone && !telefone) return erro('Informe um telefone com DDD.', 400);
  await perfilDoCliente(r.admin, r.user);
  const { error } = await r.admin
    .from('dl_clientes')
    .update({ nome: texto(b.nome, 60), telefone, endereco: texto(b.endereco, 120), bairro: texto(b.bairro, 60), complemento: texto(b.complemento, 60) })
    .eq('user_id', r.user.id);
  if (error) return erro('Não consegui salvar agora. Tente de novo.', 502);
  return Response.json({ ok: true });
}
