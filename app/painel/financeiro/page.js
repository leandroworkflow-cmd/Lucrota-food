'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePainel } from '../../../components/PainelShell';
import SaqueSaldo from '../../../components/SaqueSaldo';
import { brl } from '../../../lib/format';
import { somaSaldo } from '../../../lib/partilha';
import { supabase } from '../../../lib/supabase';

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function Conta() {
  const { loja } = usePainel();
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const { data: d, error } = await supabase
        .from('dl_lancamentos')
        .select('id,tipo,valor,descricao,criado_em')
        .eq('loja_id', loja.id)
        .order('criado_em', { ascending: false })
        .limit(5000);
      if (error) setErro('Não consegui carregar a conta. Confira se o SQL 07 foi rodado.');
      else setLinhas(d);
    })();
  }, [loja.id]);

  const saldo = useMemo(() => somaSaldo(linhas || []), [linhas]);

  return (
    <>
      <h1 style={{ fontSize: 28 }}>Conta corrente</h1>
      <p className="muted" style={{ margin: 0, maxWidth: '62ch' }}>
        Pix pelo app: o dinheiro vai para a plataforma, que repassa a você os produtos menos a comissão de {Number(loja.comissao_pct)}%. Pedidos em dinheiro ficam com você, e a comissão
        entra aqui como valor a pagar. Tudo é somado: o saldo abaixo já é o resultado final. Os lançamentos acontecem quando o pedido é marcado como entregue.
      </p>

      {!loja.chave_pix && (
        <div className="aviso" role="status">
          Cadastre a sua chave Pix em <Link href="/painel/loja">Minha loja</Link> para receber os repasses.
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      {linhas === null && !erro ? (
        <p className="muted">Carregando…</p>
      ) : (
        linhas && (
          <>
            <section className="cartao">
              <h2>Saldo</h2>
              <div
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, color: saldo < 0 ? '#b3261e' : saldo > 0 ? 'var(--verde)' : 'inherit' }}
                aria-label={saldo < 0 ? `Você deve ${brl(-saldo)}` : `A receber ${brl(saldo)}`}
              >
                {saldo < 0 ? `− ${brl(-saldo)}` : brl(saldo)}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {saldo > 0 && 'Você pode pedir o saque por Pix a qualquer momento, a partir de R$ 10,00.'}
                {saldo < 0 && 'Você deve esse valor à plataforma. Ele é abatido dos seus próximos Pix pelo app ou cobrado por Pix.'}
                {saldo === 0 && 'Tudo acertado por enquanto.'}
              </p>
            </section>

            <SaqueSaldo conta="loja" chave={loja.chave_pix} />

            {linhas.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="tabela-simples">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Lançamento</th>
                      <th className="d">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.slice(0, 80).map((l) => (
                      <tr key={l.id}>
                        <td>{data(l.criado_em)}</td>
                        <td>{l.descricao || l.tipo}</td>
                        <td className="d" style={{ color: Number(l.valor) < 0 ? '#b3261e' : 'var(--verde)' }}>
                          <strong>{Number(l.valor) < 0 ? `− ${brl(-Number(l.valor))}` : `+ ${brl(l.valor)}`}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {linhas.length === 0 && <p className="muted">Ainda não há lançamentos. Eles aparecem quando você marca pedidos como entregues.</p>}
          </>
        )
      )}
    </>
  );
}
