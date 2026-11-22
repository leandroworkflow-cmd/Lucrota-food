'use client';

import { useState } from 'react';
import { apiEnviar } from '../../lib/api-cliente';
import { SelfieAoVivo } from './Documentos';

// Tela cheia: selfie ao vivo do dia, pedida antes de ficar online.
export default function SelfieDia({ aoConcluir, aoCancelar }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(blob) {
    setOcupado(true);
    setErro('');
    try {
      const f = new FormData();
      f.append('arquivo', blob, 'selfie.jpg');
      await apiEnviar('/api/entrega/selfie-dia', f);
      await aoConcluir();
    } catch (e) {
      setErro(e.message);
      setOcupado(false);
    }
  }

  return (
    <div className="ent-menu" role="dialog" aria-modal="true" aria-label="Selfie do dia">
      <div className="ent-menu-corpo" style={{ paddingTop: 24 }}>
        <h2 style={{ margin: 0 }}>Selfie do dia</h2>
        <p style={{ margin: 0 }}>Para ficar online, tire uma selfie agora: rosto inteiro, de frente, com boa luz, sem óculos escuros nem boné. Pedimos uma vez por dia, para garantir que é você mesmo que está na conta.</p>
        {ocupado ? <p>Enviando…</p> : <SelfieAoVivo aoCapturar={enviar} aoCancelar={aoCancelar} />}
        {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}
        <small style={{ color: 'var(--e-suave)' }}>A foto fica em área privada, só a nossa equipe vê, e é apagada depois de 30 dias.</small>
      </div>
    </div>
  );
}
