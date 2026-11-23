import { distanciaM, noBrasil } from './geo';

// Nominatim (OpenStreetMap): grátis, mas exige identificação e no máximo 1 consulta por segundo.
// Aqui só se consulta quando um pedido novo chega ou a loja salva o endereço, então o volume é baixo.
export async function geocodificar(texto, limiteMs = 3000) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Broke/1.0 (lucrota@gmail.com)', 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(limiteMs),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const [a] = await r.json();
    const lat = Number(a?.lat);
    const lng = Number(a?.lon);
    return noBrasil(lat, lng) ? { lat, lng, nome: String(a.display_name || '').slice(0, 160) } : null;
  } catch {
    return null;
  }
}

// Distância de carro/moto entre dois pontos, em km, pelo OSRM público (grátis, sem garantia de resposta).
// Se a rota online falhar, usa a linha reta com 30% a mais (mesma estimativa que o app já usa).
export async function distanciaDeRotaKm(de, para, limiteMs = 2500) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${de.lng},${de.lat};${para.lng},${para.lat}?overview=false`;
    const r = await fetch(url, { signal: AbortSignal.timeout(limiteMs), cache: 'no-store' });
    if (!r.ok) throw new Error('rota');
    const j = await r.json();
    const m = j.routes?.[0]?.distance;
    if (!Number.isFinite(m)) throw new Error('sem rota');
    return { km: m / 1000, aproximada: false };
  } catch {
    return { km: (distanciaM(de, para) * 1.3) / 1000, aproximada: true };
  }
}
