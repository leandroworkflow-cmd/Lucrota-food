'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AvisosPush from '../../../components/AvisosPush';
import Marca from '../../../components/Marca';
import PixPagamento from '../../../components/PixPagamento';
import RastreioEntrega from '../../../components/RastreioEntrega';
import BotaoAjuda from '../../../components/BotaoAjuda';
import Rodape from '../../../components/Rodape';
import { brl, hora, linkWhatsApp } from '../../../lib/format';
import { PCT_PRODUTOS } from '../../../lib/cancelamento';
import { FORMAS } from '../../../lib/pedido';

const ETAPAS = [
  ['novo', 'Pedido enviado, aguardando a loja'],
  ['aceito', 'A loja aceitou o pedido'],
  ['preparo', 'Em preparo'],
  ['saiu', 'Saiu para entrega'],
  ['entregue', 'Entregue'],
];

function CancelarPedido({ token, cancelamento, aoMudar }) {
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const c = cancelamento;

  async function cancelar() {
    setOcupado(true);
    setMsg('');
    try {
      const res = await fetch(`/api/pedidos/${token}/cancelar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taxa_vista: c.taxa }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Não consegui cancelar agora.');
      setConfirmando(false);
    } catch (e) {
      setMsg(e.message);
    }
    await aoMudar();
    setOcupado(false);
  }

  if (!confirmando) {
    return (
      <div className="bloco">
        {c.gratis_ate && <p className="muted" style={{ margin: 0 }}>Cancelamento grátis até as {hora(c.gratis_ate)}. Depois disso, cobramos uma taxa de {PCT_PRODUTOS}% dos produtos até as {hora(c.sem_taxa_apos)}; passando desse horário, o cancelamento volta a ser grátis.</p>}
        {!c.gratis_ate && c.taxa > 0 && c.sem_taxa_apos && <p className="muted" style={{ margin: 0 }}>Se o pedido não sair até as {hora(c.sem_taxa_apos)}, você cancela sem taxa.</p>}
        {msg && <div className="aviso aviso-erro" role="alert">{msg}</div>}
        <div>
          <button type="button" className="btn btn-pequeno" onClick={() => setConfirmando(true)}>
            Cancelar pedido
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bloco" role="alertdialog" aria-label="Confirmar cancelamento">
      <h3 style={{ margin: 0 }}>Cancelar este pedido?</h3>
      {c.taxa > 0 ? (
        <p style={{ margin: 0 }}>
          A loja já está preparando o seu pedido. Se cancelar agora, será cobrada uma <strong>taxa de cancelamento de {brl(c.taxa)}</strong> ({PCT_PRODUTOS}% dos produtos
          {c.taxa_entregador > 0 ? ' mais a taxa de entrega, porque um entregador já aceitou a corrida' : ''}). Devolvemos <strong>{brl(c.reembolso)}</strong> ao seu pagamento.
        </p>
      ) : (
        <p style={{ margin: 0 }}>{c.reembolso > 0 ? `Sem custo: devolvemos os ${brl(c.reembolso)} pagos pelo app.` : 'Sem custo para você.'}</p>
      )}
      {msg && <div className="aviso aviso-erro" role="alert">{msg}</div>}
      <div className="opcoes">
        <button type="button" className="btn btn-primario" disabled={ocupado} onClick={cancelar}>
          {ocupado ? 'Cancelando…' : c.taxa > 0 ? `Cancelar e pagar ${brl(c.taxa)}` : 'Sim, cancelar'}
        </button>
        <button type="button" className="btn" disabled={ocupado} onClick={() => setConfirmando(false)}>
          Manter pedido
        </button>
      </div>
    </div>
  );
}

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

  const pg = pedido?.pagamento;
  const cartao = pg?.forma === 'cartao_app';
  const pixPendente = pg?.status === 'pendente' && !cartao;
  const cartaoAnalise = pg?.status === 'pendente' && cartao;
  const pixMorto = pg && ['expirado', 'reembolsado', 'recusado', 'reembolsado_parcial', 'cancelado'].includes(pg.status);
  const aguardando = pixPendente || cartaoAnalise;
  const final = pedido && (pedido.status === 'entregue' || pedido.status === 'cancelado' || pixMorto);
  useEffect(() => {
    if (final) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, aguardando ? 4000 : pedido?.status === 'saiu' ? 5000 : 10000);
    return () => clearInterval(id);
  }, [final, carregar, pedido?.status, aguardando]);

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

            {pixPendente && <PixPagamento pagamento={pg} total={pedido.total} />}
            {cartaoAnalise && (
              <div className="aviso" role="status">
                Estamos confirmando o pagamento no cartão. Pode levar alguns minutos. Esta tela atualiza sozinha e a loja recebe o pedido assim que for aprovado.
              </div>
            )}
            {pg?.status === 'recusado' && (
              <div className="aviso aviso-erro" role="status">
                O pagamento no cartão não foi aprovado e o pedido não foi enviado à loja. Volte à loja e faça um novo pedido.
              </div>
            )}
            {pg?.status === 'expirado' && (
              <div className="aviso aviso-erro" role="status">
                O Pix expirou e o pedido não foi enviado à loja. Volte à loja e faça um novo pedido.
              </div>
            )}
            {pg?.status === 'pago' && (
              <div className="aviso" role="status">
                ✅ {cartao ? 'Cartão' : 'Pix'} pago pelo app. Não precisa pagar nada na entrega.
              </div>
            )}
            {pg?.status === 'reembolsado' && (
              <div className="aviso" role="status">
                O pedido foi cancelado e o seu pagamento foi devolvido. O dinheiro volta {cartao ? 'para a fatura do cartão' : 'para a sua conta'} pelo Mercado Pago.
              </div>
            )}

            {pg?.status === 'reembolsado_parcial' && (
              <div className="aviso" role="status">
                Você cancelou o pedido. Foi cobrada a taxa de cancelamento de {brl(pedido.taxa_cancelamento)} e devolvemos {brl(Number(pedido.total) - Number(pedido.taxa_cancelamento))} {cartao ? 'para a fatura do cartão' : 'para a sua conta'} pelo Mercado Pago.
              </div>
            )}
            {pg?.status === 'cancelado' && (
              <div className="aviso" role="status">
                Você cancelou o pedido. Nenhuma cobrança foi feita.
              </div>
            )}
            {pedido.status === 'cancelado' && pedido.cancelado_por === 'cliente' && !pg && (
              <div className="aviso" role="status">
                Você cancelou este pedido.
              </div>
            )}

            {aguardando || pixMorto ? null : pedido.status === 'cancelado' ? (
              pedido.cancelado_por === 'cliente' ? null : (
                <div className="aviso aviso-erro" role="status">
                  A loja cancelou este pedido. Fale com ela pelo WhatsApp para entender o motivo.
                </div>
              )
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

            {!final && pedido.codigo_entrega && pedido.status !== 'novo' && (
              <section className="bloco" aria-label="Código de entrega" style={{ textAlign: 'center' }}>
                <div className="muted">Código de entrega</div>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '0.2em', fontFamily: 'var(--font-display, inherit)' }}>{pedido.codigo_entrega}</div>
                <small className="muted">Informe ao entregador só quando receber o pedido. É com este código que a entrega é concluída.</small>
              </section>
            )}
            {!final && pedido.cancelamento?.pode && <CancelarPedido token={token} cancelamento={pedido.cancelamento} aoMudar={carregar} />}
            {!final && pedido.cancelamento && !pedido.cancelamento.pode && ['preparo'].includes(pedido.status) && (
              <p className="muted" style={{ margin: 0 }}>{pedido.cancelamento.motivo}</p>
            )}

            <BotaoAjuda papel="cliente" numero={pedido.numero} loja={loja?.nome} bloco rotulo="Ajuda do Brokê no WhatsApp" />

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
