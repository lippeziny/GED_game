// Busca de imagens em provedores gratuitos (sem chave de API) e proxy das miniaturas.
// O navegador só fala com o nosso servidor: assim o recorte no <canvas> funciona (mesma origem)
// e a lista de hosts acessíveis é fixa (sem SSRF).
const UA = 'DriveHuntGED/1.2 (jogo educacional)';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 3 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function getJson(url, f, ms = 6000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await f(url, { signal: ctl.signal, headers: { 'user-agent': UA, accept: 'application/json' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); } finally { clearTimeout(t); }
}

export const cleanQuery = (q) => String(q ?? '').normalize('NFC').replace(/[^\p{L}\p{N} _.\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export async function searchImages(rawQuery, { f = fetch, providers = ['openverse'] } = {}) {
  const q = cleanQuery(rawQuery); if (q.length < 2) return { ok: false, error: 'Digite pelo menos 2 letras para buscar.' };
  const out = []; const errors = [];
  if (providers.includes('openverse')) {
    try {
      const d = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=24&mature=false&category=photograph,illustration,digitized_artwork`, f);
      for (const r of d.results || []) if (UUID.test(r.id || '')) out.push({ id: `ov-${r.id}`, title: String(r.title || q).slice(0, 80), credit: `${String(r.creator || 'autor desconhecido').slice(0, 40)} · ${String(r.license || '').toUpperCase()} ${r.license_version || ''}`.trim(), provider: 'Openverse', src: `/api/imagem?p=ov&r=${r.id}` });
    } catch (e) { errors.push(`openverse: ${e.message}`); }
  }
  if (providers.includes('wikimedia') && out.length < 8) {
    try {
      const d = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=16&gsrsearch=${encodeURIComponent(`filetype:bitmap ${q}`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&format=json&origin=*`, f);
      for (const pg of Object.values(d.query?.pages || {})) {
        const ii = pg.imageinfo?.[0]; if (!ii?.thumburl) continue; let u; try { u = new URL(ii.thumburl); } catch { continue; }
        if (u.protocol !== 'https:' || u.hostname !== 'upload.wikimedia.org') continue;
        out.push({ id: `wm-${pg.pageid}`, title: String(pg.title || q).replace(/^File:/, '').slice(0, 80), credit: `Wikimedia Commons · ${String(ii.extmetadata?.LicenseShortName?.value || 'licença livre').slice(0, 30)}`, provider: 'Wikimedia Commons', src: `/api/imagem?p=wm&r=${encodeURIComponent(u.pathname)}` });
      }
    } catch (e) { errors.push(`wikimedia: ${e.message}`); }
  }
  if (!out.length && errors.length) return { ok: false, error: 'Não foi possível buscar imagens agora. Você pode enviar uma foto do aparelho.', detail: errors };
  return { ok: true, results: out };
}

// Devolve { mime, bytes } da miniatura pedida ou { error, status }.
export async function fetchThumb(provider, ref, { f = fetch } = {}) {
  let url;
  if (provider === 'ov' && UUID.test(ref || '')) url = `https://api.openverse.org/v1/images/${ref}/thumb/`;
  else if (provider === 'wm' && /^\/wikipedia\/commons\/thumb\/[\w%.\-/()]+$/.test(ref || '') && !ref.includes('..')) url = `https://upload.wikimedia.org${ref}`;
  else return { error: 'Imagem inválida.', status: 400 };
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await f(url, { signal: ctl.signal, headers: { 'user-agent': UA } });
    if (!r.ok) return { error: 'Imagem indisponível.', status: 404 };
    const mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!OK_TYPES.includes(mime)) return { error: 'Formato de imagem não suportado.', status: 415 };
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > MAX_BYTES) return { error: 'Imagem muito grande.', status: 413 };
    return { mime, bytes };
  } catch { return { error: 'Imagem indisponível.', status: 504 }; } finally { clearTimeout(t); }
}
