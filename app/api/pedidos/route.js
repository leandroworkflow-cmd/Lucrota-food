import { validarPedido } from '../../../lib/pedido';
import { enviarPush, pushConfigurado } from '../../../lib/push-servidor';
import { clienteServico } from '../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const erro = (error, status) => Response.json({ error }, { status });

// Limite simples por IP (por instância do servidor): freia quem dispara pedidos em massa.
const recentes = new Map();
function limitado(ip) {
  const agora = Date.now();
  const lista = (recentes.get(ip) || []).filter((t) => agora - t < 10 * 60 * 1000);
  if (lista.length >= 8) {
    recentes.set(ip, lista);
    return true;
  }
  lista.push(agora);
  recentes.set(ip, lista);
  if (recentes.size > 5000) recentes.clear();
  return false;
}

export async function POST(request) {
  const admin = clienteServico();
  if (!admin) return erro('O serviço de pedidos ainda não está configurado.', 503);

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconhecido';
  if (limitado(ip)) return erro('Muitos pedidos em pouco tempo. Aguarde alguns minutos.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return erro('Requisição inválida.', 400);
  }
  if (body?.site) return erro('Requisição inválida.', 400); // campo-isca: só robôs preenchem

  const slug = String(body?.slug || '');
  const { data: loja, error: eLoja } = await admin
    .from('dl_lojas')
    .select('id,dono_id,nome,ativa,aberta,pedido_minimo,taxa_entrega,comissao_pct')
    .eq('slug', slug)
    .maybeSingle();
  if (eLoja) return erro('Não consegui enviar o pedido agora.', 502);
  if (!loja) return erro('Loja não encontrada.', 404);

  const { data: produtos, error: eProd } = await admin
    .from('dl_produtos')
    .select('id,nome,preco,ativo')
    .eq('loja_id', loja.id);
  if (eProd) return erro('Não consegui enviar o pedido agora.', 502);

  const v = validarPedido(loja, produtos, body);
  if (v.erro) return erro(v.erro, 400);

  const { data: pedido, error: eIns } = await admin
    .from('dl_pedidos')
    .insert({ loja_id: loja.id, ...v.pedido })
    .select('numero,token')
    .single();
  if (eIns) {
    console.error('Erro ao criar pedido:', eIns.message);
    return erro('Não consegui enviar o pedido agora. Tente de novo.', 502);
  }

  // Avisa o celular da loja (se ela ativou os avisos). Falha aqui não derruba o pedido.
  try {
    if (pushConfigurado()) {
      const { data: subs } = await admin
        .from('dl_push_inscricoes')
        .select('id,endpoint,p256dh,auth')
        .eq('user_id', loja.dono_id);
      const total = v.pedido.total.toFixed(2).replace('.', ',');
      for (const sub of subs || []) {
        const r = await enviarPush(sub, {
          titulo: `Novo pedido #${pedido.numero}`,
          corpo: `R$ ${total}${v.pedido.bairro ? ` · ${v.pedido.bairro}` : ''}`,
          url: '/painel',
        });
        if (r.expirada) await admin.from('dl_push_inscricoes').delete().eq('id', sub.id);
      }
    }
  } catch (e) {
    console.error('Aviso de pedido novo falhou:', e?.message || e);
  }

  return Response.json({ ok: true, numero: pedido.numero, token: pedido.token });
}
