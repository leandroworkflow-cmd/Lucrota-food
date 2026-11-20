'use client';

// Fala direto do navegador com o Mercado Pago para trocar os dados do cartão por um token de uso único.
// O número do cartão não passa pelo nosso servidor.
import { soDigitos } from './cartao';

let carregando = null;
function carregarSDK() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'));
  if (window.MercadoPago) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.mercadopago.com/js/v2';
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => {
        carregando = null;
        falha(new Error('sdk'));
      };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

let instancia = null;
let chaveInstancia = null;
async function obterMP(chavePublica) {
  await carregarSDK();
  if (!instancia || chaveInstancia !== chavePublica) {
    instancia = new window.MercadoPago(chavePublica, { locale: 'pt-BR' });
    chaveInstancia = chavePublica;
  }
  return instancia;
}

// Campo seguro do CVV (o Mercado Pago desenha o campo; o código não passa por nós). Devolve uma função para remover.
export async function montarCvv(chavePublica, idContainer) {
  const mp = await obterMP(chavePublica);
  const campo = mp.fields.create('securityCode', { placeholder: 'CVV' }).mount(idContainer);
  return () => {
    try {
      campo.unmount();
    } catch {
      /* já removido */
    }
  };
}

// Token de um cartão salvo (usa o CVV digitado no campo seguro).
export async function tokenizarSalvo(chavePublica, cardId) {
  try {
    const mp = await obterMP(chavePublica);
    const t = await mp.fields.createCardToken({ cardId: String(cardId) });
    if (!t?.id) throw new Error('sem token');
    return { token: t.id, salvo: true, card_id: String(cardId) };
  } catch {
    throw new Error('Confira o código de segurança (CVV) do cartão salvo.');
  }
}

// tipo: 'credit_card' | 'debit_card'. Devolve { token, payment_method_id, issuer_id } ou lança Error em português.
export async function tokenizarCartao(chavePublica, { numero, nome, validade, cvv, cpf, tipo }) {
  try {
    await carregarSDK();
  } catch {
    throw new Error('Não consegui carregar o pagamento por cartão. Confira a internet e tente de novo.');
  }
  const mp = await obterMP(chavePublica);
  const n = soDigitos(numero);
  let metodo;
  try {
    const r = await mp.getPaymentMethods({ bin: n.slice(0, 8) });
    const lista = r?.results || [];
    metodo = lista.find((m) => m.payment_type_id === tipo) || null;
    if (!metodo) {
      throw new Error(tipo === 'debit_card' ? 'Este cartão não aceita débito pelo app. Tente crédito.' : 'Este cartão não aceita crédito pelo app. Tente débito.');
    }
  } catch (e) {
    if (e.message?.startsWith('Este cartão')) throw e;
    throw new Error('Não reconheci a bandeira do cartão. Confira o número.');
  }
  const [mes, ano] = String(validade).split('/');
  let t;
  try {
    t = await mp.createCardToken({
      cardNumber: n,
      cardholderName: String(nome).trim(),
      cardExpirationMonth: String(Number(mes)),
      cardExpirationYear: String(2000 + Number(ano)),
      securityCode: soDigitos(cvv),
      identificationType: 'CPF',
      identificationNumber: soDigitos(cpf),
    });
  } catch {
    throw new Error('Os dados do cartão não foram aceitos. Confira número, validade e CVV.');
  }
  if (!t?.id) throw new Error('Os dados do cartão não foram aceitos. Confira número, validade e CVV.');
  return { token: t.id, payment_method_id: metodo.id, issuer_id: metodo.issuer?.id ?? null, cpf: soDigitos(cpf) };
}
