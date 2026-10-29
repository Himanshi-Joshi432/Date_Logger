/**
 * Music Search Service using Deezer Music API
 * With intelligent fallback to ensure previews always play regardless of regional licensing.
 */

export async function searchDeezerTracks(query) {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();

  // 1. Primary: Deezer API Search
  try {
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(cleanQuery)}&limit=15`;
    const res = await fetch(deezerUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const deezerTracks = data.data
          .filter((t) => t.preview && t.preview.length > 0)
          .map((t) => ({
            id: String(t.id),
            title: t.title || t.title_short,
            artist: t.artist?.name || 'Unknown Artist',
            album: t.album?.title || '',
            albumCover: t.album?.cover_medium || t.album?.cover || t.artist?.picture_medium,
            preview: t.preview,
            duration: 15, // 15 seconds playback requirement
            source: 'deezer',
          }));

        if (deezerTracks.length > 0) {
          return deezerTracks;
        }
      }
    }
  } catch (err) {
    console.warn('Deezer API fetch failed, attempting fallback...', err);
  }

  // 2. Global Fallback: iTunes Search API (ensures users outside Deezer-supported countries get working audio)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=song&limit=15`;
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        return data.results
          .filter((t) => t.previewUrl)
          .map((t) => ({
            id: String(t.trackId),
            title: t.trackName,
            artist: t.artistName,
            album: t.collectionName || '',
            albumCover: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '300x300bb') : null,
            preview: t.previewUrl,
            duration: 15,
            source: 'itunes',
          }));
      }
    }
  } catch (err) {
    console.warn('Music fallback search error:', err);
  }

  return [];
}

/**
 * Suggested popular date soundtrack ideas
 */
export const POPULAR_DATE_SONGS = [
  'Ed Sheeran Perfect',
  'Coldplay Yellow',
  'Taylor Swift Lover',
  'Daft Punk Something About Us',
  'Leon Bridges Beyond',
  'Frank Ocean Thinkin Bout You',
];

