import { geocodificar } from '../../../lib/geo-servidor';
import { usuarioDaRequisicao } from '../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Converte um endereço em coordenadas (OpenStreetMap/Nominatim, gratuito). Só para usuários logados.
export async function GET(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const q = new URL(request.url).searchParams.get('q') || '';
  if (q.trim().length < 6 || q.length > 200) return Response.json({ error: 'Informe o endereço completo.' }, { status: 400 });
  const ponto = await geocodificar(q);
  if (!ponto) return Response.json({ error: 'Não encontrei esse endereço. Marque o ponto no mapa.' }, { status: 404 });
  return Response.json(ponto);
}
