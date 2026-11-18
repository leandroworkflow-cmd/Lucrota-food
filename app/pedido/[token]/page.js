'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AvisosPush from '../../../components/AvisosPush';
import Marca from '../../../components/Marca';
import RastreioEntrega from '../../../components/RastreioEntrega';
import Rodape from '../../../components/Rodape';
import { brl, hora, linkWhatsApp } from '../../../lib/format';
import { FORMAS } from '../../../lib/pedido';

const ETAPAS = [
  ['novo', 'Pedido enviado, aguardando a loja'],
  ['aceito', 'A loja aceitou o pedido'],
  ['preparo', 'Em preparo'],
  ['saiu', 'Saiu para entrega'],
  ['entregue', 'Entregue'],
];

export default function Acompanhar() {
  const { token } = useParams();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos/${token}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Não consegui consultar o pedido.');
      setPedido(json);
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const final = pedido && (pedido.status === 'entregue' || pedido.status === 'cancelado');
  useEffect(() => {
    if (final) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, pedido?.status === 'saiu' ? 5000 : 10000);
    return () => clearInterval(id);
  }, [final, carregar, pedido?.status]);

  const loja = pedido?.dl_lojas;
  const indice = pedido ? ETAPAS.findIndex(([id]) => id === pedido.status) : -1;

  return (
    <>
      <header className="topo">
        <div className="pagina topo-in">
          <Marca />
        </div>
      </header>

      <main className="pagina" style={{ paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {erro && !pedido && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}

        {pedido && (
          <>
            <div>
              <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)' }}>Pedido {pedido.numero}</h1>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                {loja?.nome}, feito às {hora(pedido.criado_em)}
                {loja?.tempo_estimado && pedido.status !== 'entregue' && pedido.status !== 'cancelado'
                  ? `. Previsão: ${loja.tempo_estimado}.`
                  : '.'}
              </p>
            </div>

            {pedido.status === 'cancelado' ? (
              <div className="aviso aviso-erro" role="status">
                A loja cancelou este pedido. Fale com ela pelo WhatsApp para entender o motivo.
              </div>
            ) : (
              <ol className="etapas" aria-label="Andamento do pedido" aria-live="polite">
                {ETAPAS.map(([id, rotulo], i) => (
                  <li key={id} className={i < indice ? 'etapa feita' : i === indice ? 'etapa atual' : 'etapa'}>
                    {rotulo}
                  </li>
                ))}
              </ol>
            )}

            {!final && (
              <AvisosPush
                titulo="Avisos deste pedido"
                descricao="Receba um aviso no celular quando a loja aceitar, o pedido sair e quando chegar."
                inscrever={async (subscription) => {
                  const r = await fetch(`/api/pedidos/${token}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) });
                  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não consegui ativar os avisos.');
                }}
              />
            )}

            {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && <RastreioEntrega pedido={pedido} />}

            {loja?.whatsapp && (
              <a
                className="btn btn-primario btn-bloco"
                href={linkWhatsApp(loja.whatsapp, `Olá! Sobre o meu pedido ${pedido.numero}.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com a loja no WhatsApp
              </a>
            )}

            <section className="bloco" aria-label="Resumo do pedido">
              <h2 style={{ fontSize: 22 }}>O que você pediu</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {pedido.itens.map((i, n) => (
                  <li key={`${i.id}-${n}`} className="linha-sacola">
                    <span>
                      {i.qtd}x {i.nome}
                    </span>
                    <span>{brl(i.preco * i.qtd)}</span>
                  </li>
                ))}
              </ul>
              <div className="totais">
                <div>
                  <span>Produtos</span>
                  <span>{brl(pedido.subtotal)}</span>
                </div>
                <div>
                  <span>Entrega</span>
                  <span>{Number(pedido.taxa_entrega) > 0 ? brl(pedido.taxa_entrega) : 'Grátis'}</span>
                </div>
                <div className="total">
                  <span>Total</span>
                  <span>{brl(pedido.total)}</span>
                </div>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Pagamento: {FORMAS[pedido.forma_pagamento]}. Entrega em {pedido.endereco}.
              </p>
            </section>

            <p>
              <Link href="/" style={{ textUnderlineOffset: 3 }}>
                Ver outras lojas
              </Link>
            </p>
          </>
        )}
      </main>
      <Rodape />
    </>
  );
}
