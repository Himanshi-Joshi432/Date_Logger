/**
 * Music search (Deezer, with iTunes as a fallback where Deezer has no previews)
 * and preview-link refreshing for saved soundtracks.
 */

function mapDeezerTrack(t) {
  return {
    id: String(t.id),
    trackId: String(t.id),
    title: t.title || t.title_short,
    artist: t.artist?.name || 'Unknown Artist',
    album: t.album?.title || '',
    albumCover: t.album?.cover_medium || t.album?.cover || t.artist?.picture_medium,
    preview: t.preview,
    duration: 15,
    source: 'deezer',
  };
}

function mapItunesTrack(t) {
  return {
    id: String(t.trackId),
    trackId: String(t.trackId),
    title: t.trackName,
    artist: t.artistName,
    album: t.collectionName || '',
    albumCover: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '300x300bb') : null,
    preview: t.previewUrl,
    duration: 15,
    source: 'itunes',
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json();
}

export async function searchDeezerTracks(query) {
  if (!query || !query.trim()) return [];
  const q = encodeURIComponent(query.trim());

  // 1. Primary: Deezer
  try {
    const data = await fetchJson(`https://api.deezer.com/search?q=${q}&limit=15`);
    const tracks = (Array.isArray(data?.data) ? data.data : [])
      .filter((t) => t.preview)
      .map(mapDeezerTrack);
    if (tracks.length > 0) return tracks;
  } catch (err) {
    console.warn('Deezer search failed, trying fallback...', err);
  }

  // 2. Fallback: iTunes Search (covers regions where Deezer returns no previews)
  try {
    const data = await fetchJson(
      `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=15`
    );
    return (Array.isArray(data?.results) ? data.results : [])
      .filter((t) => t.previewUrl)
      .map(mapItunesTrack);
  } catch (err) {
    console.warn('Music fallback search error:', err);
  }

  return [];
}

/**
 * Some catalogues sign preview links with an expiry time (e.g. "...?hdnea=exp=1731500000~...").
 * Returns true when such a link has expired; links without an expiry never expire.
 */
export function isPreviewExpired(url, now = Date.now()) {
  const match = /[?&~]exp=(\d{9,11})/.exec(url || '');
  if (!match) return false;
  return Number(match[1]) * 1000 <= now + 30000;
}

const freshUrlCache = new Map();

/**
 * Returns a playable preview link for a saved soundtrack ({audioUrl, trackId, source, title, artist}).
 * If the saved link has expired (or `force` is set after a failed playback), a fresh
 * one is fetched by track id, or by searching for the title and artist on older posts.
 */
export async function resolvePreviewUrl(music, { force = false } = {}) {
  const saved = music?.audioUrl || music?.preview || null;
  if (!music) return null;
  if (saved && !force && !isPreviewExpired(saved)) return saved;

  const cacheKey = music.trackId ? `${music.source}:${music.trackId}` : `${music.title}|${music.artist}`;
  const cached = freshUrlCache.get(cacheKey);
  if (cached && !isPreviewExpired(cached)) return cached;

  let fresh = null;
  try {
    if (music.trackId && music.source === 'deezer') {
      const t = await fetchJson(`https://api.deezer.com/track/${encodeURIComponent(music.trackId)}`);
      fresh = t?.preview || null;
    } else if (music.trackId && music.source === 'itunes') {
      const data = await fetchJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(music.trackId)}`);
      fresh = data?.results?.[0]?.previewUrl || null;
    }
  } catch (err) {
    console.warn('Could not refresh preview by track id', err);
  }

  // Older posts have no track id: find the same song again by name.
  if (!fresh && music.title) {
    try {
      const results = await searchDeezerTracks(`${music.title} ${music.artist || ''}`);
      const wanted = music.title.toLowerCase();
      const best = results.find((r) => (r.title || '').toLowerCase() === wanted) || results[0];
      fresh = best?.preview || null;
    } catch (err) {}
  }

  if (fresh) freshUrlCache.set(cacheKey, fresh);
  return fresh || saved;
}

/** The fields of a search result that get saved with a date log. */
export function toSavedMusic(song) {
  if (!song?.preview) return null;
  return {
    audioUrl: song.preview,
    title: song.title || null,
    artist: song.artist || null,
    albumCover: song.albumCover || null,
    source: song.source || null,
    trackId: song.trackId || null,
    duration: 15,
  };
}

/** Suggested popular date soundtrack ideas */
export const POPULAR_DATE_SONGS = [
  'Ed Sheeran Perfect',
  'Coldplay Yellow',
  'Taylor Swift Lover',
  'Daft Punk Something About Us',
  'Leon Bridges Beyond',
  'Frank Ocean Thinkin Bout You',
];
