import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer } from 'expo-audio';

const DEFAULT_MAX_MS = 15000;

/**
 * Plays one short audio preview at a time.
 *
 * The player lives in a ref (not state), so timers, listeners and the unmount
 * cleanup always see the current player and can actually stop and release it.
 *
 *   const { playingKey, toggle, stop } = useAudioPreview();
 *   toggle(url)            // start/stop a preview keyed by its url
 *   toggle(url, post._id)  // or key it by something else, e.g. a post id
 */
export function useAudioPreview({ maxMs = DEFAULT_MAX_MS } = {}) {
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const [playingKey, setPlayingKey] = useState(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      try {
        player.pause();
      } catch (e) {}
      try {
        player.release();
      } catch (e) {}
    }
    setPlayingKey(null);
  }, []);

  const play = useCallback(
    (url, key = url) => {
      if (!url) return;
      stop();
      try {
        const player = createAudioPlayer(url);
        playerRef.current = player;
        player.addListener('playbackStatusUpdate', (status) => {
          if (status?.didJustFinish && playerRef.current === player) {
            stop();
          }
        });
        player.play();
        setPlayingKey(key);
        timerRef.current = setTimeout(() => {
          if (playerRef.current === player) stop();
        }, maxMs);
      } catch (e) {
        console.warn('Audio preview error', e);
        stop();
      }
    },
    [maxMs, stop]
  );

  const toggle = useCallback(
    (url, key = url) => {
      if (playerRef.current && playingKey === key) {
        stop();
      } else {
        play(url, key);
      }
    },
    [play, stop, playingKey]
  );

  // Release the player when the screen unmounts.
  useEffect(() => stop, [stop]);

  return { playingKey, play, toggle, stop };
}
