import { noBrasil } from './geo';

// Nominatim (OpenStreetMap): grátis, mas exige identificação e no máximo 1 consulta por segundo.
// Aqui só se consulta quando um pedido novo chega ou a loja salva o endereço, então o volume é baixo.
export async function geocodificar(texto, limiteMs = 3000) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'MeuDelivery/1.0 (lucrota@gmail.com)', 'Accept-Language': 'pt-BR' },
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
