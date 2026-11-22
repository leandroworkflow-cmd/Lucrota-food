'use client';

import { useEffect, useState } from 'react';
import { authConfigured, supabase } from './supabase';

// status: 'loading' | 'in' | 'out' | 'off' (Supabase não configurado)
export function useSession() {
  const [state, setState] = useState({ status: authConfigured ? 'loading' : 'off', session: null });

  useEffect(() => {
    if (!supabase) return undefined;
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setState({ status: data.session ? 'in' : 'out', session: data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (ativo) setState({ status: session ? 'in' : 'out', session });
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function entrarComGoogle(destino = '/painel') {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${destino}`,
      queryParams: { prompt: 'select_account' },
    },
  });
}

// Entrar com Apple: exigido pela App Store quando há login de terceiros. Só aparece com NEXT_PUBLIC_APPLE_LOGIN=1
// (depois de configurar o provedor Apple no Supabase).
export const appleLigado = process.env.NEXT_PUBLIC_APPLE_LOGIN === '1';
export function entrarComApple(destino = '/painel') {
  return supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}${destino}` } });
}

export async function sair() {
  if (supabase) await supabase.auth.signOut();
}
