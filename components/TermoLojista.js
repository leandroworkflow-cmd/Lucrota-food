'use client';

import { useRef, useState } from 'react';
import { TERMO, TERMO_VERSAO } from '../lib/termo-lojista';

// Termo de parceria com rolagem e, no final, a caixa de aceite.
export default function TermoLojista({ aceito, aoMudar }) {
  const caixa = useRef(null);
  const [leu, setLeu] = useState(false);

  function aoRolar() {
    const c = caixa.current;
    if (c && c.scrollTop + c.clientHeight >= c.scrollHeight - 8) setLeu(true);
  }

  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
      <legend style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Termo de parceria para lojistas</legend>
      <div
        ref={caixa}
        onScroll={aoRolar}
        tabIndex={0}
        role="region"
        aria-label="Texto do termo de parceria"
        style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--linha)', borderRadius: 12, padding: 14, background: '#fff', display: 'grid', gap: 10, fontSize: 14, lineHeight: 1.5 }}
      >
        {TERMO.map((s) => (
          <section key={s.t}>
            <strong>{s.t}</strong>
            {s.p.map((x) => (
              <p key={x.slice(0, 30)} style={{ margin: '4px 0 0' }}>{x}</p>
            ))}
          </section>
        ))}
        <small className="muted">Versão {TERMO_VERSAO}. Leia também os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</small>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15 }}>
        <input type="checkbox" checked={aceito} onChange={(e) => aoMudar(e.target.checked)} style={{ marginTop: 4, width: 20, height: 20 }} />
        <span>
          Li e estou de acordo com o termo de parceria, com os Termos de Uso e com a Política de Privacidade.
          {!leu && !aceito && <small className="muted" style={{ display: 'block' }}>Role o texto até o fim para ler tudo.</small>}
        </span>
      </label>
    </fieldset>
  );
}
