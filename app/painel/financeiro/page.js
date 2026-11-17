'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePainel } from '../../../components/PainelShell';
import { brl, inicioDaSemana } from '../../../lib/format';
import { supabase } from '../../../lib/supabase';

const dia = (iso) => iso.split('-').reverse().slice(0, 2).join('/');

export default function Comissao() {
  const { loja } = usePainel();
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('dl_pedidos')
        .select('criado_em,subtotal,taxa_entrega,comissao_valor')
        .eq('loja_id', loja.id)
        .eq('status', 'entregue')
        .gte('criado_em', desde)
        .order('criado_em', { ascending: false })
        .limit(2000);
      if (error) setErro('Não consegui carregar os valores.');
      else setPedidos(data);
    })();
  }, [loja.id]);

  const semanas = useMemo(() => {
    const mapa = new Map();
    for (const p of pedidos || []) {
      const inicio = inicioDaSemana(p.criado_em);
      const s = mapa.get(inicio) || { inicio, pedidos: 0, vendas: 0, comissao: 0 };
      s.pedidos += 1;
      s.vendas += Number(p.subtotal);
      s.comissao += Number(p.comissao_valor);
      mapa.set(inicio, s);
    }
    return [...mapa.values()].sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
  }, [pedidos]);

  const atual = semanas[0] && semanas[0].inicio === inicioDaSemana(new Date().toISOString()) ? semanas[0] : null;

  return (
    <>
      <h1 style={{ fontSize: 28 }}>Comissão</h1>
      <p className="muted" style={{ margin: 0, maxWidth: '60ch' }}>
        Você paga {Number(loja.comissao_pct)}% sobre o valor dos produtos de cada pedido entregue. A taxa de entrega não entra
        na conta. Os valores abaixo contam só pedidos marcados como entregues.
      </p>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      {pedidos === null && !erro ? (
        <p className="muted">Carregando…</p>
      ) : (
        <>
          <section className="cartao">
            <h2>Esta semana</h2>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38 }}>{brl(atual?.comissao || 0)}</div>
            <p className="muted" style={{ margin: 0 }}>
              {atual ? `${atual.pedidos} pedidos entregues, ${brl(atual.vendas)} em produtos.` : 'Nenhum pedido entregue esta semana.'}
            </p>
          </section>

          {semanas.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabela-simples">
                <thead>
                  <tr>
                    <th>Semana de</th>
                    <th className="d">Pedidos</th>
                    <th className="d">Produtos</th>
                    <th className="d">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {semanas.map((s) => (
                    <tr key={s.inicio}>
                      <td>{dia(s.inicio)}</td>
                      <td className="d">{s.pedidos}</td>
                      <td className="d">{brl(s.vendas)}</td>
                      <td className="d">
                        <strong>{brl(s.comissao)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            A fatura da semana fechada é enviada por WhatsApp, com chave Pix para pagamento.
          </p>
        </>
      )}
    </>
  );
}
