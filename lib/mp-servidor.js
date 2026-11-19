import { expiracaoMP } from './partilha';

// Mercado Pago: o Pix pelo app cai na conta da PLATAFORMA (uma só). Chave: MP_ACCESS_TOKEN (credencial de produção, Vercel).
const API = 'https://api.mercadopago.com';

export const tokenDaPlataforma = () => process.env.MP_ACCESS_TOKEN || null;
export const mpConfigurado = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.NEXT_PUBLIC_SITE_URL);

const site = () => String(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
export const urlWebhookMP = () => `${site()}/api/mp/webhook`;

async function chamar(caminho, { metodo = 'GET', corpo, chaveIdempotencia, limiteMs = 12000 } = {}) {
  const res = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenDaPlataforma()}`,
      ...(chaveIdempotencia ? { 'X-Idempotency-Key': chaveIdempotencia } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(limiteMs),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Cria o Pix do pedido. O dinheiro vai para a conta da plataforma, que repassa depois pela conta corrente.
export async function criarPix({ valor, descricao, referencia, email, nome, chave }) {
  const r = await chamar('/v1/payments', {
    metodo: 'POST',
    chaveIdempotencia: chave,
    corpo: {
      transaction_amount: valor,
      description: descricao,
      payment_method_id: 'pix',
      payer: { email, first_name: nome },
      external_reference: referencia,
      notification_url: urlWebhookMP(),
      date_of_expiration: expiracaoMP(30),
    },
  });
  const dados = r.json?.point_of_interaction?.transaction_data;
  if (!r.ok || !r.json?.id || !dados?.qr_code) {
    console.error('Mercado Pago recusou o Pix:', r.status, JSON.stringify(r.json).slice(0, 400));
    return { erro: r.json?.message || 'O Mercado Pago não gerou o Pix.' };
  }
  return { id: String(r.json.id), copiaECola: dados.qr_code, qrBase64: dados.qr_code_base64 || null };
}

// Cobra o cartão (crédito ou débito, à vista) com o token gerado no navegador. A taxa do Mercado Pago fica com a plataforma.
export async function criarCartao({ valor, descricao, referencia, email, nome, chave, token, metodo, emissor, cpf }) {
  const r = await chamar('/v1/payments', {
    metodo: 'POST',
    chaveIdempotencia: chave,
    limiteMs: 25000,
    corpo: {
      transaction_amount: valor,
      token,
      description: descricao,
      installments: 1,
      payment_method_id: metodo,
      ...(emissor ? { issuer_id: Number(emissor) } : {}),
      payer: { email, first_name: nome, identification: { type: 'CPF', number: cpf } },
      external_reference: referencia,
      statement_descriptor: 'MEUDELIVERY',
      notification_url: urlWebhookMP(),
    },
  });
  if (!r.json?.id) {
    console.error('Mercado Pago recusou o cartão:', r.status, JSON.stringify(r.json).slice(0, 400));
    return { erro: true, mensagem: r.json?.message || null };
  }
  return { id: String(r.json.id), status: r.json.status, detalhe: r.json.status_detail || null };
}

export async function lerPagamento(id) {
  const r = await chamar(`/v1/payments/${encodeURIComponent(id)}`);
  return r.ok ? r.json : null;
}

export async function reembolsar(id) {
  const r = await chamar(`/v1/payments/${encodeURIComponent(id)}/refunds`, { metodo: 'POST', chaveIdempotencia: `reembolso-${id}`, corpo: {} });
  return r.ok;
}

export async function cancelarPagamento(id) {
  const r = await chamar(`/v1/payments/${encodeURIComponent(id)}`, { metodo: 'PUT', corpo: { status: 'cancelled' } });
  return r.ok;
}
