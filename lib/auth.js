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

export function entrarComGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/painel`,
      queryParams: { prompt: 'select_account' },
    },
  });
}

export async function sair() {
  if (supabase) await supabase.auth.signOut();
}
