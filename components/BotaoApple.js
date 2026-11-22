'use client';

import { appleLigado, entrarComApple } from '../lib/auth';

// Botão "Entrar com Apple" (só aparece quando o login Apple está configurado).
export default function BotaoApple({ destino = '/painel' }) {
  if (!appleLigado) return null;
  return (
    <button type="button" className="btn" style={{ background: '#000', color: '#fff', borderColor: '#000' }} onClick={() => entrarComApple(destino)}>
      Entrar com Apple
    </button>
  );
}
