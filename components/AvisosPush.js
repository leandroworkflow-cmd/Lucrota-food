'use client';

import { useCallback, useEffect, useState } from 'react';

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function chaveParaBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

// Botão de avisos no celular, reutilizável.
// inscrever(subscriptionJSON): salva no servidor. desinscrever(endpoint): remove (opcional).
export default function AvisosPush({ titulo, descricao, ligadoTexto = 'Ativados neste aparelho.', inscrever, desinscrever }) {
  const [estado, setEstado] = useState('carregando'); // carregando|sem-chave|sem-suporte|ios|negado|desligado|ligado
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');

  const verificar = useCallback(async () => {
    if (!CHAVE) return setEstado('sem-chave');
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return setEstado(ios && !instalado ? 'ios' : 'sem-suporte');
    }
    if (Notification.permission === 'denied') return setEstado('negado');
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub && Notification.permission === 'granted' ? 'ligado' : 'desligado');
    } catch {
      setEstado('sem-suporte');
    }
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  async function ativar() {
    setOcupado(true);
    setMsg('');
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') return setEstado(permissao === 'denied' ? 'negado' : 'desligado');
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE) }));
      await inscrever(sub.toJSON());
      setEstado('ligado');
    } catch (e) {
      setMsg(e.message || 'Não consegui ativar os avisos.');
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await desinscrever?.(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setEstado('desligado');
    } finally {
      setOcupado(false);
    }
  }

  if (estado === 'carregando' || estado === 'sem-chave') return null;

  return (
    <div className="aviso" role="status">
      <strong>{titulo}</strong>
      <div style={{ marginTop: 4 }}>
        {estado === 'ios' && 'No iPhone, instale na Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra por lá.'}
        {estado === 'sem-suporte' && 'Este navegador não permite avisos. Use o Chrome.'}
        {estado === 'negado' && 'Os avisos estão bloqueados. Libere as notificações nas configurações do navegador.'}
        {estado === 'desligado' && descricao}
        {estado === 'ligado' && ligadoTexto}
      </div>
      {estado === 'desligado' && (
        <button type="button" className="btn btn-primario btn-pequeno" style={{ marginTop: 10 }} onClick={ativar} disabled={ocupado}>
          {ocupado ? 'Ativando…' : 'Ativar avisos'}
        </button>
      )}
      {estado === 'ligado' && desinscrever && (
        <button type="button" className="btn btn-pequeno" style={{ marginTop: 10 }} onClick={desativar} disabled={ocupado}>
          Desativar
        </button>
      )}
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
