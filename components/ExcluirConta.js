'use client';

import { useState } from 'react';
import { api } from '../lib/api-cliente';
import { sair } from '../lib/auth';

// Exclusão da própria conta (exigida pela App Store). Pede confirmação antes.
export default function ExcluirConta() {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');

  async function excluir() {
    if (!window.confirm('Excluir sua conta? Seus dados pessoais serão apagados e isso não pode ser desfeito.')) return;
    setOcupado(true);
    setMsg('');
    try {
      const r = await api('/api/conta/excluir', { metodo: 'POST', corpo: { confirmar: 'EXCLUIR' } });
      if (r.excluida) {
        await sair();
        window.location.href = '/';
        return;
      }
      setMsg('Pedido enviado. Como sua conta tem loja ou entregas, nossa equipe confere pedidos e saldo e conclui a exclusão em até 7 dias. Avisamos pelo WhatsApp.');
    } catch (e) {
      setMsg(e.message);
    }
    setOcupado(false);
  }

  return (
    <div className="bloco" style={{ display: 'grid', gap: 8 }}>
      <strong>Excluir minha conta</strong>
      <small className="muted">Apaga seu acesso e seus dados pessoais. Registros de pedidos e pagamentos podem ser mantidos pelo prazo exigido por lei.</small>
      <div>
        <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={excluir}>
          {ocupado ? 'Enviando…' : 'Excluir minha conta'}
        </button>
      </div>
      {msg && <div className="aviso" role="status">{msg}</div>}
    </div>
  );
}
