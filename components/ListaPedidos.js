'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brl } from '../lib/format';
import { lerPedidos } from '../lib/meus-pedidos';
import { STATUS } from '../lib/pedido';

export default function ListaPedidos() {
  const [lista, setLista] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const guardados = lerPedidos();
      const dados = await Promise.all(
        guardados.map(async (p) => {
          try {
            const r = await fetch(`/api/pedidos/${p.token}`, { cache: 'no-store' });
            return { ...p, dados: r.ok ? await r.json() : null };
          } catch {
            return { ...p, dados: null };
          }
        })
      );
      if (vivo) setLista(dados);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (lista === null) return <p className="muted">Carregando…</p>;
  if (lista.length === 0) {
    return (
      <section className="vazio">
        <h2>Você ainda não fez pedidos neste aparelho.</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Escolha uma loja, monte a sacola e faça o primeiro pedido. Ele aparece aqui para você acompanhar.
        </p>
        <Link href="/" className="btn btn-primario">
          Ver lojas
        </Link>
      </section>
    );
  }
  return (
    <ul className="lista-lojas">
      {lista.map((p) => (
        <li key={p.token}>
          <Link href={`/pedido/${p.token}`} className="loja-card">
            <div className="loja-card-corpo" style={{ paddingRight: 0 }}>
              <div className="loja-card-nome">{p.dados?.dl_lojas?.nome || p.loja}</div>
              <div className="loja-card-sub">
                {p.dados ? `Pedido nº ${p.dados.numero} · ${brl(p.dados.total)}` : 'Toque para abrir o pedido'}
              </div>
              <div className="loja-card-info">
                <span>{new Date(p.dados?.criado_em || p.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {p.dados && <span className={p.dados.status === 'entregue' ? 'selo aberta' : 'selo'}>{STATUS[p.dados.status] || p.dados.status}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
