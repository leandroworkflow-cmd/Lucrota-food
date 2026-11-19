'use client';

import { useEffect, useState } from 'react';
import { brl } from '../lib/format';

// Mostra o QR Code e o "copia e cola" do Pix, com a contagem do tempo que falta.
export default function PixPagamento({ pagamento, total }) {
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const restante = pagamento.expira_em ? Math.max(0, Math.floor((new Date(pagamento.expira_em).getTime() - agora) / 1000)) : null;
  const relogio = restante === null ? '' : `${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pagamento.copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="bloco pix" aria-label="Pagamento por Pix">
      <h2 style={{ fontSize: 22 }}>Pague {brl(total)} por Pix</h2>
      <p className="muted" style={{ margin: 0 }}>
        Abra o app do seu banco, escolha Pix e leia o QR Code, ou use o código copia e cola. O pedido vai para a loja assim que o pagamento for confirmado.
      </p>
      {pagamento.qr_base64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pix-qr" src={`data:image/png;base64,${pagamento.qr_base64}`} alt="QR Code do Pix" width={240} height={240} />
      )}
      <div className="pix-codigo" aria-label="Código Pix copia e cola">
        {pagamento.copia_cola}
      </div>
      <button type="button" className="btn btn-primario btn-bloco" onClick={copiar}>
        {copiado ? 'Código copiado!' : 'Copiar código Pix'}
      </button>
      {relogio && (
        <p className="muted" style={{ margin: 0 }} aria-live="off">
          Este Pix vale por mais {relogio}. Esta tela confirma o pagamento sozinha.
        </p>
      )}
    </section>
  );
}
