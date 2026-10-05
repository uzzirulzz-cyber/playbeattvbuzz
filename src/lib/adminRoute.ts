import type { makeCrud } from '@/lib/adminCrud';
import { jsonErr, requireAdmin } from '@/lib/auth';

type Crud = ReturnType<typeof makeCrud>;

/** Wire a makeCrud instance into list/create route handlers */
export function wireListCreate(crud: Crud) {
  return {
    async GET(req: Request) {
      try {
        await requireAdmin(req);
        return Response.json({ ok: true, data: await crud.GET(req) });
      } catch (e) {
        return jsonErr(e);
      }
    },
    async POST(req: Request) {
      try {
        const actor = await requireAdmin(req);
        return Response.json({ ok: true, data: await crud.POST(req, actor) }, { status: 201 });
      } catch (e) {
        return jsonErr(e);
      }
    },
  };
}

/** Wire a makeCrud instance into item PATCH/DELETE handlers */
export function wireItem(crud: Crud) {
  return {
    async PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
      try {
        const actor = await requireAdmin(req);
        const { id } = await ctx.params;
        return Response.json({ ok: true, data: await crud.PATCH(req, actor, id) });
      } catch (e) {
        return jsonErr(e);
      }
    },
    async DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
      try {
        const actor = await requireAdmin(req);
        const { id } = await ctx.params;
        return Response.json({ ok: true, data: await crud.DELETE(req, actor, id) });
      } catch (e) {
        return jsonErr(e);
      }
    },
  };
}
