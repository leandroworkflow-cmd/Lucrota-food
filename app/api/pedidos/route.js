import { randomInt } from 'node:crypto';
import { gerarCodigo } from '../../../lib/codigo';
import { distanciaM, noBrasil } from '../../../lib/geo';
import { geocodificar } from '../../../lib/geo-servidor';
import { validarEntradaCartao, mensagemRecusa } from '../../../lib/cartao';
import { clienteMPDoPerfil, perfilDoCliente } from '../../../lib/conta-servidor';
import { criarCartao, criarPix, listarCartoes, mpConfigurado, salvarCartaoMP } from '../../../lib/mp-servidor';
import { emailDoPagador, pagamentoValido } from '../../../lib/partilha';
import { validarPedido } from '../../../lib/pedido';
import { enviarPush, pushConfigurado } from '../../../lib/push-servidor';
import { sincronizarPagamento } from '../../../lib/pagamento-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const erro = (error, status) => Response.json({ error }, { status });

// Limite simples por IP (por instância do servidor): freia quem dispara pedidos em massa.
const recentes = new Map();
const tentativasCartao = new Map(); // mais curto: freia quem testa cartões em massa
function limitado(ip, mapa = recentes, max = 8) {
  const agora = Date.now();
  const lista = (mapa.get(ip) || []).filter((t) => agora - t < 10 * 60 * 1000);
  if (lista.length >= max) {
    mapa.set(ip, lista);
    return true;
  }
  lista.push(agora);
  mapa.set(ip, lista);
  if (mapa.size > 5000) mapa.clear();
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

  // Cliente com conta (opcional): o pedido entra no histórico dele e ele pode usar cartões salvos.
  let usuario = null;
  if (request.headers.get('authorization')) {
    const u = await usuarioDaRequisicao(request);
    if (u.user) usuario = u.user;
  }

  const slug = String(body?.slug || '');
  const { data: loja, error: eLoja } = await admin
    .from('dl_lojas')
    .select('id,dono_id,nome,ativa,aberta,pedido_minimo,taxa_entrega,comissao_pct,cidade,lat,lng,aceita_pix_app')
    .eq('slug', slug)
    .maybeSingle();
  if (eLoja) return erro('Não consegui enviar o pedido agora.', 502);
  if (!loja) return erro('Loja não encontrada.', 404);

  const { data: produtos, error: eProd } = await admin
    .from('dl_produtos')
    .select('id,nome,preco,ativo')
    .eq('loja_id', loja.id);
  if (eProd) return erro('Não consegui enviar o pedido agora.', 502);

  const v = validarPedido({ ...loja, aceita_pix_app: Boolean(loja.aceita_pix_app) && mpConfigurado(), aceita_cartao_app: Boolean(loja.aceita_pix_app) && mpConfigurado() }, produtos, body);
  if (v.erro) return erro(v.erro, 400);

  // Onde entregar: GPS do cliente (se mandou e for plausível) ou o endereço digitado.
  let destino = null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const pertoDaLoja = (p) => !(Number.isFinite(loja.lat) && Number.isFinite(loja.lng)) || distanciaM(p, { lat: loja.lat, lng: loja.lng }) < 60000;
  if (body?.lat != null && noBrasil(lat, lng) && pertoDaLoja({ lat, lng })) destino = { lat, lng };
  if (!destino) {
    const g = await geocodificar([v.pedido.endereco, v.pedido.bairro, loja.cidade, 'Brasil'].filter(Boolean).join(', '), 2500);
    if (g && pertoDaLoja(g)) destino = { lat: g.lat, lng: g.lng };
  }

  const cartaoApp = v.pedido.forma_pagamento === 'cartao_app';
  const pixApp = v.pedido.forma_pagamento === 'pix_app';
  let cartao = null;
  if (cartaoApp) {
    if (limitado(ip, tentativasCartao, 5)) return erro('Muitas tentativas de cartão. Aguarde alguns minutos ou pague com Pix.', 429);
    const c = validarEntradaCartao(body?.cartao);
    if (c.erro) return erro(c.erro, 400);
    cartao = c.dados;
    if (cartao.salvo) {
      // Cartão salvo: precisa ser de quem está logado. A bandeira e o banco vêm do Mercado Pago, não do navegador.
      if (!usuario) return erro('Entre na sua conta para usar um cartão salvo.', 401);
      const perfilCartao = await perfilDoCliente(admin, usuario);
      const lista = perfilCartao?.mp_customer_id ? await listarCartoes(perfilCartao.mp_customer_id) : null;
      const achado = lista?.find((x) => x.id === cartao.cardId);
      if (!achado || !achado.metodo) return erro('Esse cartão não está mais salvo. Escolha outro ou digite os dados.', 400);
      cartao = { ...cartao, metodo: achado.metodo, emissor: achado.emissor, clienteId: perfilCartao.mp_customer_id };
    }
  }
  if (pixApp || cartaoApp) {
    if (!mpConfigurado()) return erro('O pagamento pelo app não está disponível agora.', 503);
    if (!pagamentoValido(v.pedido.total)) return erro('Este valor não pode ser pago pelo app. Escolha outra forma de pagamento.', 400);
  }

  const { data: pedido, error: eIns } = await admin
    .from('dl_pedidos')
    .insert({
      loja_id: loja.id,
      ...v.pedido,
      codigo_entrega: gerarCodigo(randomInt(0, 10000)),
      destino_lat: destino?.lat ?? null,
      destino_lng: destino?.lng ?? null,
      ...(pixApp || cartaoApp ? { pagamento_status: 'pendente' } : {}),
      ...(usuario ? { cliente_user_id: usuario.id } : {}),
    })
    .select('id,numero,token')
    .single();
  if (eIns) {
    console.error('Erro ao criar pedido:', eIns.message);
    return erro('Não consegui enviar o pedido agora. Tente de novo.', 502);
  }

  if (cartaoApp) {
    // Cobra o cartão na conta da plataforma (a taxa do cartão é da plataforma).
    const cobranca = await criarCartao({
      valor: v.pedido.total,
      descricao: `Pedido ${pedido.numero} - ${loja.nome}`.slice(0, 100),
      referencia: pedido.id,
      email: emailDoPagador(body?.cliente?.email, pedido.numero),
      nome: v.pedido.cliente_nome.split(' ')[0],
      chave: pedido.token,
      token: cartao.token,
      metodo: cartao.metodo,
      emissor: cartao.emissor,
      cpf: cartao.cpf,
      clienteId: cartao.clienteId,
    });
    const aprovavel = !cobranca.erro && ['approved', 'in_process', 'pending'].includes(cobranca.status);
    if (!aprovavel) {
      await admin.from('dl_pedidos').delete().eq('id', pedido.id);
      return erro(cobranca.erro ? 'Não consegui cobrar o cartão agora. Tente de novo ou pague com Pix.' : mensagemRecusa(cobranca.detalhe), cobranca.erro ? 502 : 402);
    }
    await admin
      .from('dl_pedidos')
      .update({ mp_payment_id: cobranca.id })
      .eq('id', pedido.id);
    // Cliente pediu para guardar o cartão digitado: só depois de o pagamento passar. Falhar aqui não derruba o pedido.
    if (usuario && cartao.salvarToken && !cartao.salvo) {
      try {
        const perfilNovo = await perfilDoCliente(admin, usuario);
        const idCliente = await clienteMPDoPerfil(admin, usuario, perfilNovo);
        if (idCliente) await salvarCartaoMP(idCliente, cartao.salvarToken);
      } catch (e) {
        console.error('Cartão não salvo:', e?.message || e);
      }
    }
    if (cobranca.status === 'approved') await sincronizarPagamento(admin, pedido.id); // confere no Mercado Pago, marca como pago e avisa a loja
    return Response.json({ ok: true, numero: pedido.numero, token: pedido.token });
  }

  if (pixApp) {
    // Gera o Pix na conta da plataforma (o repasse à loja e ao entregador vai para a conta corrente na entrega).
    // Se falhar, o pedido não fica pendurado.
    const pix = await criarPix({
      valor: v.pedido.total,
      descricao: `Pedido ${pedido.numero} - ${loja.nome}`.slice(0, 100),
      referencia: pedido.id,
      email: emailDoPagador(body?.cliente?.email, pedido.numero),
      nome: v.pedido.cliente_nome.split(' ')[0],
      chave: pedido.token,
    });
    if (pix.erro) {
      await admin.from('dl_pedidos').delete().eq('id', pedido.id);
      return erro('Não consegui gerar o Pix agora. Tente de novo ou escolha outra forma de pagamento.', 502);
    }
    await admin
      .from('dl_pedidos')
      .update({
        mp_payment_id: pix.id,
        pix_copia_cola: pix.copiaECola,
        pix_qr_base64: pix.qrBase64,
        pix_expira_em: new Date(Date.now() + 30 * 60000).toISOString(),
      })
      .eq('id', pedido.id);
    return Response.json({ ok: true, numero: pedido.numero, token: pedido.token });
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
