'use client';

import { supabase } from './supabase';

// Chama uma API do site já com o login do usuário. Lança Error com a mensagem em português.
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  const res = await fetch(caminho, {
    method: metodo,
    cache: 'no-store',
    headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.error || 'Algo deu errado. Tente de novo.');
    e.status = res.status;
    e.dados = json;
    throw e;
  }
  return json;
}

// Envia um arquivo (multipart) para uma API do site já com o login do usuário.
export async function apiEnviar(caminho, formData) {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  const res = await fetch(caminho, { method: 'POST', cache: 'no-store', headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}, body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.error || 'Algo deu errado. Tente de novo.');
    e.status = res.status;
    throw e;
  }
  return json;
}
