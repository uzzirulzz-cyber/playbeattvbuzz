import { jsonErr } from '@/lib/auth';
import { resolvePlayback } from '@/lib/play';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return await resolvePlayback(req, 'movie', id);
  } catch (e) {
    return jsonErr(e);
  }
}

export const POST = GET;
