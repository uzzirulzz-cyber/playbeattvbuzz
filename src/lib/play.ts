import { db } from '@/lib/db';
import { ApiError, getSessionUser } from '@/lib/auth';
import { getEntitlement, registerPlaybackDevice, type Entitlement } from '@/lib/adminCrud';

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
    streamUrl = ch.streamUrl;
    streamType = ch.streamType;
    label = ch.name;
    historyRef = { channelId: ch.id, refType: 'CHANNEL', refId: ch.id };
  } else if (kind === 'movie') {
    const mv = await db.movie.findFirst({ where: { OR: [{ id: refId }, { slug: refId }], status: 'PUBLISHED' } });
    if (!mv) throw new ApiError(404, 'NOT_FOUND', 'Movie not found.');
    ent = await getEntitlement(session.id);
    if (!ent.hasActive) throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch movies.');
    streamUrl = mv.playbackUrl;
    streamType = 'HLS';
    label = mv.title;
    historyRef = { refType: 'MOVIE', refId: mv.id };
  } else {
    const ep = await db.episode.findUnique({ where: { id: refId }, include: { season: { include: { series: true } } } });
    if (!ep) throw new ApiError(404, 'NOT_FOUND', 'Episode not found.');
    ent = await getEntitlement(session.id);
    if (!ent.hasActive) throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch series.');
    streamUrl = ep.playbackUrl;
    streamType = 'HLS';
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
