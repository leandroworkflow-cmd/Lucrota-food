// Cartão pelo app (funções puras, usadas no navegador e no servidor).
// O número do cartão NUNCA passa pelo nosso servidor: o navegador troca os dados por um token direto com o Mercado Pago.

export const FORMAS_ONLINE = ['pix_app', 'cartao_app'];
export const formaOnline = (forma) => FORMAS_ONLINE.includes(forma);

export function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

export function cpfValido(valor) {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dig = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(c[9]) && dig(10) === Number(c[10]);
}

export function luhnValido(numero) {
  const n = soDigitos(numero);
  if (n.length < 13 || n.length > 19) return false;
  let soma = 0;
  let dobra = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dobra) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}

export const mascaraNumero = (v) => soDigitos(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
export const mascaraCpf = (v) =>
  soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
export const mascaraValidade = (v) => {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Confere os dados digitados antes de falar com o Mercado Pago. Devolve { erro } ou { ok, mes, ano }.
export function validarCartaoDigitado(c, agora = new Date()) {
  if (!luhnValido(c?.numero)) return { erro: 'Confira o número do cartão.' };
  if (String(c?.nome || '').trim().length < 3) return { erro: 'Digite o nome como está no cartão.' };
  const [m, a] = String(c?.validade || '').split('/');
  const mes = Number(m);
  const ano = 2000 + Number(a);
  if (!(mes >= 1 && mes <= 12) || !(ano >= 2000 && ano <= 2100)) return { erro: 'Confira a validade do cartão (MM/AA).' };
  if (ano < agora.getFullYear() || (ano === agora.getFullYear() && mes < agora.getMonth() + 1)) return { erro: 'Este cartão está vencido.' };
  const cvv = soDigitos(c?.cvv);
  if (cvv.length < 3 || cvv.length > 4) return { erro: 'Confira o código de segurança (CVV).' };
  if (!cpfValido(c?.cpf)) return { erro: 'Confira o CPF do titular.' };
  return { ok: true, mes, ano };
}

// O que o servidor aceita do navegador: só o token e identificadores (nada de número de cartão).
export function validarEntradaCartao(e) {
  const token = String(e?.token || '');
  if (e?.salvo) {
    const id = String(e?.card_id ?? '');
    if (!/^\d{1,20}$/.test(id)) return { erro: 'Cartão salvo inválido. Escolha outro.' };
    if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { erro: 'Digite o código de segurança (CVV) do cartão.' };
    return { dados: { salvo: true, cardId: id, token } };
  }
  const salvarToken = e?.salvar_token ? String(e.salvar_token) : null;
  if (salvarToken && !/^[A-Za-z0-9]{16,64}$/.test(salvarToken)) return { erro: 'Não consegui ler os dados do cartão. Digite de novo.' };
  const metodo = String(e?.payment_method_id || '');
  const emissor = e?.issuer_id == null || e?.issuer_id === '' ? null : String(e.issuer_id);
  const cpf = soDigitos(e?.cpf);
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { erro: 'Não consegui ler os dados do cartão. Digite de novo.' };
  if (!/^[a-z0-9_]{2,30}$/i.test(metodo)) return { erro: 'Não reconheci a bandeira do cartão.' };
  if (emissor && !/^\d{1,10}$/.test(emissor)) return { erro: 'Não reconheci o banco do cartão.' };
  if (!cpfValido(cpf)) return { erro: 'Confira o CPF do titular.' };
  return { dados: { token, metodo, emissor, cpf, salvarToken } };
}

// Traduz o motivo da recusa do Mercado Pago para algo que o cliente entende e pode resolver.
export function mensagemRecusa(detalhe) {
  const d = String(detalhe || '');
  if (d === 'cc_rejected_insufficient_amount') return 'Saldo ou limite insuficiente. Tente outro cartão ou pague com Pix.';
  if (d === 'cc_rejected_bad_filled_security_code') return 'Código de segurança (CVV) incorreto. Confira e tente de novo.';
  if (d === 'cc_rejected_bad_filled_date') return 'Validade incorreta. Confira e tente de novo.';
  if (d === 'cc_rejected_bad_filled_card_number') return 'Número do cartão incorreto. Confira e tente de novo.';
  if (d === 'cc_rejected_bad_filled_other') return 'Algum dado do cartão está incorreto. Confira e tente de novo.';
  if (d === 'cc_rejected_call_for_authorize') return 'O banco pede autorização para este pagamento. Ligue para o banco ou use outro cartão.';
  if (d === 'cc_rejected_card_disabled') return 'Este cartão está desativado. Ative-o no app do banco ou use outro.';
  if (d === 'cc_rejected_duplicated_payment') return 'Você já fez um pagamento igual há pouco. Veja em Meus pedidos.';
  if (d === 'cc_rejected_high_risk') return 'Por segurança, este pagamento não foi aprovado. Tente com Pix ou outro cartão.';
  if (d === 'cc_rejected_max_attempts') return 'Limite de tentativas atingido. Tente outro cartão ou pague com Pix.';
  if (d === 'cc_rejected_invalid_installments') return 'Este cartão não aceita pagamento à vista neste valor. Tente outro.';
  return 'O cartão foi recusado. Tente outro cartão ou pague com Pix.';
}
