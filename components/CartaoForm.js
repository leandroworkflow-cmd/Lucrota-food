'use client';

import { mascaraCpf, mascaraNumero, mascaraValidade } from '../lib/cartao';

// Campos do cartão. Os dados ficam só na memória desta tela e nunca vão para o nosso servidor.
export default function CartaoForm({ valor, onChange }) {
  const set = (k, f) => (e) => onChange({ ...valor, [k]: f ? f(e.target.value) : e.target.value });
  return (
    <div className="cartao-form">
      <div className="opcoes" role="group" aria-label="Tipo de cartão">
        {[
          ['credit_card', 'Crédito'],
          ['debit_card', 'Débito'],
        ].map(([id, rotulo]) => (
          <button key={id} type="button" className="opcao" aria-pressed={valor.tipo === id} onClick={() => onChange({ ...valor, tipo: id })}>
            {rotulo}
          </button>
        ))}
      </div>
      <div className="campo">
        <label htmlFor="cc-num">Número do cartão</label>
        <input id="cc-num" className="input" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" required value={valor.numero} onChange={set('numero', mascaraNumero)} />
      </div>
      <div className="campo">
        <label htmlFor="cc-nome">Nome no cartão</label>
        <input id="cc-nome" className="input" autoComplete="cc-name" required value={valor.nome} onChange={set('nome')} />
      </div>
      <div className="linha-campos">
        <div className="campo">
          <label htmlFor="cc-val">Validade</label>
          <input id="cc-val" className="input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" required value={valor.validade} onChange={set('validade', mascaraValidade)} />
        </div>
        <div className="campo">
          <label htmlFor="cc-cvv">CVV</label>
          <input id="cc-cvv" className="input" inputMode="numeric" autoComplete="cc-csc" maxLength={4} required value={valor.cvv} onChange={set('cvv', (v) => v.replace(/\D/g, ''))} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="cc-cpf">CPF do titular</label>
        <input id="cc-cpf" className="input" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required value={valor.cpf} onChange={set('cpf', mascaraCpf)} />
      </div>
      <small className="muted">Pagamento à vista, processado pelo Mercado Pago. Os dados do cartão não ficam salvos.</small>
    </div>
  );
}
