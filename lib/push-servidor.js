import webpush from 'web-push';

let configurado = false;

export function pushConfigurado() {
  if (configurado) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !assunto) return false;
  webpush.setVapidDetails(assunto, pub, priv);
  configurado = true;
  return true;
}

export async function enviarPush(inscricao, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 30, urgency: 'high' }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, expirada: e?.statusCode === 404 || e?.statusCode === 410 };
  }
}
