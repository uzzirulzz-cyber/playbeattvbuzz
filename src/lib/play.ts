import { db } from '@/lib/db';
import { ApiError, getSessionUser } from '@/lib/auth';
import { getEntitlement, registerPlaybackDevice, type Entitlement } from '@/lib/adminCrud';
import { sig } from '@/lib/streamSign';

/**
 * Build a signed, credential-free proxy URL for items sourced from the owner's
 * Xtream distribution line (internal `xtream://` scheme). The browser only ever
 * sees /api/stream/* — the provider host/user/pass stay in server env vars.
 */
function proxied(kind: 'live' | 'vod' | 'ep', id: string, uid: string, ext = 'm3u8') {
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
  const k = sig(`${kind}|${id}|${uid}|${exp}`);
  return { url: `/api/stream/${kind}/${id}.${ext}?e=${exp}&k=${k}`, type: kind === 'live' ? 'HLS' : 'MP4' };
}

/** Parse internal `xtream://<kind>/<id>[/<ext>]` references. */
function parseXtream(ref: string): { kind: string; id: string; ext: string } | null {
  const m = ref.match(/^xtream:\/\/(live|vod|ep)\/([A-Za-z0-9_-]+)(?:\/([a-z0-9]+))?$/i);
  return m ? { kind: m[1].toLowerCase(), id: m[2], ext: m[3] || '' } : null;
}

/**
 * Playback gate: returns the authorized stream reference ONLY to entitled viewers.
 * - Free channels play for anyone signed-in (or anonymous? → require sign-in to keep device accounting meaningful)
 * - Everything else requires an ACTIVE subscription
 */
export async function resolvePlayback(
  req: Request,
  kind: 'channel' | 'movie' | 'episode',
  refId: string,
): Promise<Response> {
  const session = await getSessionUser(req);
  if (!session) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sign in and subscribe to start watching.');
  }
  let ent: Entitlement = { hasActive: false, quality: 'HD', devicesLimit: 0 };
  let streamUrl = '';
  let streamType = 'HLS';
  let label = '';
  let historyRef: { channelId?: string; refType: 'CHANNEL' | 'MOVIE' | 'EPISODE'; refId: string } | null = null;

  if (kind === 'channel') {
    const ch = await db.channel.findFirst({
      where: { OR: [{ id: refId }, { slug: refId }], status: 'ACTIVE' },
    });
    if (!ch) throw new ApiError(404, 'NOT_FOUND', 'Channel not found.');
    if (!ch.isFree) {
      ent = await getEntitlement(session.id);
      if (!ent.hasActive) {
        throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch this channel.');
      }
    }
    const xref = parseXtream(ch.streamUrl);
    if (xref && xref.kind === 'live') {
      const p = proxied('live', xref.id, session.id, 'm3u8');
      streamUrl = p.url;
      streamType = p.type;
    } else {
      streamUrl = ch.streamUrl;
      streamType = ch.streamType;
    }
    label = ch.name;
    historyRef = { channelId: ch.id, refType: 'CHANNEL', refId: ch.id };
  } else if (kind === 'movie') {
    const mv = await db.movie.findFirst({ where: { OR: [{ id: refId }, { slug: refId }], status: 'PUBLISHED' } });
    if (!mv) throw new ApiError(404, 'NOT_FOUND', 'Movie not found.');
    ent = await getEntitlement(session.id);
    if (!ent.hasActive) throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch movies.');
    const mref = parseXtream(mv.playbackUrl);
    if (mref && mref.kind === 'vod') {
      const p = proxied('vod', mref.id, session.id, mref.ext || 'mp4');
      streamUrl = p.url;
      streamType = p.type;
    } else {
      streamUrl = mv.playbackUrl;
      streamType = 'HLS';
    }
    label = mv.title;
    historyRef = { refType: 'MOVIE', refId: mv.id };
  } else {
    const ep = await db.episode.findUnique({ where: { id: refId }, include: { season: { include: { series: true } } } });
    if (!ep) throw new ApiError(404, 'NOT_FOUND', 'Episode not found.');
    ent = await getEntitlement(session.id);
    if (!ent.hasActive) throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch series.');
    const eref = parseXtream(ep.playbackUrl);
    if (eref && eref.kind === 'ep') {
      const p = proxied('ep', eref.id, session.id, eref.ext || 'mp4');
      streamUrl = p.url;
      streamType = p.type;
    } else {
      streamUrl = ep.playbackUrl;
      streamType = 'HLS';
    }
    label = `${ep.season.series.title} — S${ep.season.number}:E${ep.number}`;
    historyRef = { refType: 'EPISODE', refId: ep.id };
  }

  if (!streamUrl) throw new ApiError(503, 'NO_SOURCE', 'No stream source is configured for this item yet.');

  // Device accounting (respects plan device limits)
  const deviceName = req.headers.get('x-pbtv-device') || undefined;
  await registerPlaybackDevice(session.id, req, deviceName);

  // Watch history upsert
  if (historyRef) {
    await db.watchHistory.upsert({
      where: { userId_refType_refId: { userId: session.id, refType: historyRef.refType, refId: historyRef.refId } },
      create: { userId: session.id, channelId: historyRef.channelId ?? null, refType: historyRef.refType, refId: historyRef.refId, label, secondsWatched: 0 },
      update: { updatedAt: new Date() },
    });
  }

  return Response.json({
    ok: true,
    data: {
      stream: { url: streamUrl, type: streamType },
      label,
      entitlement: { plan: ent.planName || 'Free', quality: ent.quality },
    },
  });
}
