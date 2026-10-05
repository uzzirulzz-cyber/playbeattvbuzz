'use client';

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

export function HlsPlayer({
  src,
  streamType,
  onProgress,
  autoPlay = true,
}: {
  src: string;
  streamType: string;
  onProgress?: (seconds: number) => void;
  autoPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setStatus('loading');

    let hls: Hls | null = null;
    if (streamType === 'HLS' && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setStatus('error');
          setError(`Stream error: ${data.details}. The operator's source may be offline — use “Report a problem”.`);
          hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && streamType === 'HLS') {
      // Safari native HLS
      video.src = src;
      if (autoPlay) video.play().catch(() => undefined);
    } else {
      video.src = src; // MP4 fallback
      if (autoPlay) video.play().catch(() => undefined);
    }

    const onPlaying = () => setStatus('playing');
    const onError = () => {
      setStatus('error');
      setError('Playback failed. The source may be offline or unsupported in this browser.');
    };
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    // progress ping every 30s
    const ping = onProgress
      ? setInterval(() => {
          if (video.currentTime > 0 && !video.paused) onProgress(Math.round(video.currentTime));
        }, 30000)
      : null;

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      if (ping) clearInterval(ping);
      hls?.destroy();
    };
  }, [src, streamType, autoPlay, onProgress]);

  return (
    <div className="pb-player-shell">
      <video ref={videoRef} controls playsInline muted={muted} aria-label="Video player" />
      {status === 'loading' && !error && (
        <div className="text-center py-2 pb-muted" style={{ fontSize: 13 }}>
          <span className="pb-spinner" style={{ width: 22, height: 22, margin: '10px auto', borderWidth: 2 }} />
          <div className="mb-2">Connecting to stream…</div>
        </div>
      )}
      {error && (
        <div className="p-3 text-center" style={{ background: 'rgba(255,59,72,0.08)' }}>
          <i className="bi bi-exclamation-triangle text-danger me-2" />
          <span style={{ fontSize: 13.5 }}>{error}</span>
        </div>
      )}
      <div className="d-flex justify-content-end px-3 py-2" style={{ borderTop: '1px solid var(--pb-line)' }}>
        <button className="btn btn-pb-ghost btn-sm" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
          <i className={`bi ${muted ? 'bi-volume-mute' : 'bi-volume-up'} me-1`} />
          {muted ? 'Muted' : 'Sound on'}
        </button>
      </div>
    </div>
  );
}
