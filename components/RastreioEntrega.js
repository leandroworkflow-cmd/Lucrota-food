'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VEICULOS } from '../lib/entrega';
import { distanciaM, posicaoAntiga, rotaOSRM, textoDistancia, textoTempo } from '../lib/geo';
import Mapa from './Mapa';

// Mapa ao vivo para o cliente (e para a loja): loja, destino e a moto se movendo.
export default function RastreioEntrega({ pedido }) {
  const loja = pedido.dl_lojas;
  const e = pedido.entregador;
  const saiu = pedido.status === 'saiu';
  const moto = e && Number.isFinite(e.lat) ? { lat: e.lat, lng: e.lng } : null;
  const destino = Number.isFinite(pedido.destino_lat) ? { lat: pedido.destino_lat, lng: pedido.destino_lng } : null;
  const origem = Number.isFinite(loja?.lat) ? { lat: loja.lat, lng: loja.lng } : null;

  const [rota, setRota] = useState(null);
  const ultima = useRef({ ponto: null, quando: 0 });

  // Recalcula a rota quando a moto andou mais de 150 m ou passaram 40 s (poupa o serviço gratuito).
  useEffect(() => {
    if (!saiu || !moto || !destino) {
      setRota(null);
      return undefined;
    }
    const agora = Date.now();
    const u = ultima.current;
    if (u.ponto && distanciaM(u.ponto, moto) < 150 && agora - u.quando < 40000) return undefined;
    ultima.current = { ponto: moto, quando: agora };
    const ctl = new AbortController();
    rotaOSRM(moto, destino, ctl.signal).then(setRota);
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saiu, moto?.lat, moto?.lng, destino?.lat, destino?.lng]);

  const pontos = useMemo(() => {
    const l = [];
    if (origem) l.push({ id: 'loja', tipo: 'loja', ...origem, rotulo: loja?.nome });
    if (destino) l.push({ id: 'cliente', tipo: 'cliente', ...destino, rotulo: 'Entrega' });
    if (saiu && moto) l.push({ id: 'moto', tipo: 'moto', ...moto, rotulo: e?.nome });
    return l;
  }, [origem?.lat, origem?.lng, destino?.lat, destino?.lng, moto?.lat, moto?.lng, saiu, loja?.nome, e?.nome]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!e) return null;

  const veiculo = (VEICULOS[e.veiculo] || '').toLowerCase();
  const antiga = saiu && posicaoAntiga(e.atualizado_em);

  return (
    <section aria-label="Acompanhe a entrega" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="entrega-info" aria-live="polite">
        {!saiu ? (
          <span>
            <strong>{e.nome}</strong> ({veiculo}) vai retirar o seu pedido.
          </span>
        ) : moto && !antiga ? (
          <>
            <span>
              <strong>{e.nome}</strong> está a caminho
            </span>
            {rota && (
              <span>
                {textoTempo(rota.segundos)}
                {rota.aproximada ? ' (estimativa)' : ''} · {textoDistancia(rota.metros)}
              </span>
            )}
          </>
        ) : (
          <span>
            <strong>{e.nome}</strong> saiu com o seu pedido. {antiga ? 'Estamos esperando o sinal do GPS dele.' : 'A localização aparece aqui em instantes.'}
          </span>
        )}
      </div>
      {pontos.length > 0 && (saiu || origem || destino) && <Mapa pontos={pontos} linha={rota?.linha} altura={300} rotuloMapa="Mapa com a posição do entregador" />}
    </section>
  );
}
