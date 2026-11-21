// Guarda a resposta do entregador a cada corrida. Nunca lança erro: registro que falha não pode atrapalhar a entrega.
export async function registrarOferta(admin, entregadorId, pedidoId, resposta, { soSeNovo = false } = {}) {
  try {
    const linha = { entregador_id: entregadorId, pedido_id: pedidoId, resposta, atualizado_em: new Date().toISOString() };
    if (soSeNovo) await admin.from('dl_ofertas').upsert(linha, { onConflict: 'entregador_id,pedido_id', ignoreDuplicates: true });
    else await admin.from('dl_ofertas').upsert(linha, { onConflict: 'entregador_id,pedido_id' });
  } catch (e) {
    console.error('Registro da oferta falhou:', e?.message || e);
  }
}
