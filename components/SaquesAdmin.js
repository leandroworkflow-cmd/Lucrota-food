'use client';

import { useState } from 'react';
import { api } from '../lib/api-cliente';
import { brl } from '../lib/format';
import { STATUS_SAQUE } from '../lib/saque';

const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const minutos = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const espera = (iso) => {
  const m = minutos(iso);
  return m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : `há ${Math.floor(m / 1440)} d`;
};

// Fila de saques por Pix: você paga no seu banco e marca aqui.
export default function SaquesAdmin({ dados, recarregar, setAviso, setErro }) {
  const [ocupado, setOcupado] = useState('');
  const [copiado, setCopiado] = useState('');

  async function copiar(texto, id) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(''), 1800);
    } catch {
      setErro('Não consegui copiar. Selecione e copie à mão.');
    }
  }

  async function resolver(s, acao) {
    let motivo = '';
    if (acao === 'saque_pago') {
      if (!window.confirm(`Confirma que você já enviou ${brl(s.valor)} por Pix para ${s.nome}?\n\nChave: ${s.chave_pix}\n\nIsso baixa o valor da conta dele.`)) return;
    } else {
      motivo = (window.prompt('Por que o saque não será pago? A pessoa vai ver esse texto.') || '').trim();
      if (motivo.length < 3) return;
    }
    setOcupado(s.id);
    setErro('');
    try {
      await api('/api/admin/acao', { metodo: 'POST', corpo: { acao, id: s.id, motivo } });
      setAviso(acao === 'saque_pago' ? `Saque de ${s.nome} marcado como pago. Ele foi avisado.` : `Saque de ${s.nome} recusado. Ele foi avisado.`);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado('');
  }

  if (!dados) return <p className="muted">Carregando os saques…</p>;
  const { pendentes, total, recentes } = dados;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="aviso" role="status">
        {pendentes.length === 0 ? 'Nenhum saque esperando. Quando alguém pedir, aparece aqui e chega um aviso no seu celular.' : (
          <><b>{pendentes.length} saque{pendentes.length > 1 ? 's' : ''} para pagar</b> · total {brl(total)}</>
        )}
      </div>

      {pendentes.map((s) => (
        <div key={s.id} className="cartao" style={{ display: 'grid', gap: 8, borderLeft: '6px solid var(--amarelo)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <strong style={{ fontSize: 18 }}>{s.nome} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>· {s.conta === 'loja' ? 'loja' : 'entregador'}</span></strong>
            <strong style={{ fontSize: 26 }}>{brl(s.valor)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Chave Pix: <strong style={{ wordBreak: 'break-all' }}>{s.chave_pix}</strong></span>
            <button type="button" className="btn btn-pequeno" onClick={() => copiar(s.chave_pix, `${s.id}-c`)}>{copiado === `${s.id}-c` ? 'Copiada ✓' : 'Copiar chave'}</button>
            <button type="button" className="btn btn-pequeno" onClick={() => copiar(s.valor.toFixed(2), `${s.id}-v`)}>{copiado === `${s.id}-v` ? 'Copiado ✓' : 'Copiar valor'}</button>
          </div>
          <small className="muted">Pedido {espera(s.criado_em)} ({quando(s.criado_em)}){s.contato ? ` · contato ${s.contato}` : ''}</small>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-amarelo" disabled={Boolean(ocupado)} onClick={() => resolver(s, 'saque_pago')}>Já paguei</button>
            <button type="button" className="btn" disabled={Boolean(ocupado)} onClick={() => resolver(s, 'saque_recusado')}>Recusar</button>
          </div>
        </div>
      ))}

      {recentes.length > 0 && (
        <section style={{ display: 'grid', gap: 6 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Últimos saques resolvidos</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="tabela-simples">
              <thead><tr><th>Quando</th><th>Quem</th><th>Chave Pix</th><th className="d">Valor</th><th>Situação</th></tr></thead>
              <tbody>
                {recentes.map((s) => (
                  <tr key={s.id}>
                    <td>{quando(s.resolvido_em || s.criado_em)}</td>
                    <td>{s.nome}</td>
                    <td style={{ wordBreak: 'break-all' }}>{s.chave_pix}</td>
                    <td className="d">{brl(s.valor)}</td>
                    <td>{STATUS_SAQUE[s.status]}{s.motivo ? ` (${s.motivo})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
