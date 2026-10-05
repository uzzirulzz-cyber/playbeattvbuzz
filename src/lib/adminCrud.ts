import { db } from '@/lib/db';
import { ApiError, type SessionUser, writeAudit } from '@/lib/auth';

export const ADMIN_ONLY = ['SUPERADMIN', 'ADMIN'];

export function requireRole(u: SessionUser, roles: string[]) {
  if (!roles.includes(u.role)) throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions.');
}

export type FieldSpec = {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'json' | 'csv' | 'date';
  required?: boolean;
  /** server-computed / client-readonly fields are ignored on write */
  ro?: boolean;
};

/**
 * Config-driven admin CRUD. Returns handlers for list/create and get/patch/delete.
 * Every mutation is audit-logged. Numeric/boolean/json/csv coercion handled by FieldSpec.
 */
export function makeCrud(cfg: {
  model: string;
  entity: string;
  fields: FieldSpec[];
  searchFields?: string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, unknown>;
  writeRoles?: string[];
  softField?: string; // status field to flip instead of delete when ?soft=1
  slugFrom?: string; // derive the `slug` field from this field on create
  upperField?: string; // force uppercase on this field (e.g. coupon code)
}) {
  const model = () => (db as unknown as Record<string, { [k: string]: never }>)[cfg.model];
  const writeRoles = cfg.writeRoles || ADMIN_ONLY;

  const coerce = (body: Record<string, unknown>) => {
    const data: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      if (f.ro) continue;
      if (!(f.name in body)) continue;
      const v = body[f.name];
      switch (f.type) {
        case 'number':
          data[f.name] = Number(v) || 0;
          break;
        case 'boolean':
          data[f.name] = Boolean(v);
          break;
        case 'json':
          data[f.name] = typeof v === 'string' ? v : JSON.stringify(v ?? {});
          break;
        case 'csv':
          data[f.name] = Array.isArray(v) ? v.join(',') : String(v ?? '');
          break;
        case 'date': {
          const d = new Date(String(v));
          if (isNaN(d.getTime())) throw new ApiError(400, 'VALIDATION', `Invalid date for ${f.name}.`);
          data[f.name] = d;
          break;
        }
        default:
          data[f.name] = v === '' ? '' : String(v ?? '');
      }
    }
    return data;
  };

  async function list(req: Request) {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10) || 20));
    const q = (url.searchParams.get('q') || '').trim();
    const where: Record<string, unknown> = {};
    if (q && cfg.searchFields?.length) {
      where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: q } }));
    }
    const m = model() as unknown as {
      findMany: (a: unknown) => Promise<unknown[]>;
      count: (a: unknown) => Promise<number>;
    };
    const [rows, total] = await Promise.all([
      m.findMany({
        where,
        include: cfg.include,
        orderBy: cfg.orderBy || { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      m.count({ where }),
    ]);
    return { rows, total, page, size };
  }

  return {
    async GET(req: Request) {
      const data = await list(req);
      return data;
    },
    async POST(req: Request, actor: SessionUser) {
      requireRole(actor, writeRoles);
      const body = (await req.json()) as Record<string, unknown>;
      const data = coerce(body);
      const missing = cfg.fields.filter((f) => f.required && !f.ro && (data[f.name] === undefined || data[f.name] === ''));
      if (missing.length) {
        throw new ApiError(400, 'VALIDATION', `Missing required field(s): ${missing.map((f) => f.name).join(', ')}`);
      }
      const m = model() as unknown as { create: (a: unknown) => Promise<Record<string, string>> };
      if (cfg.slugFrom && !data.slug) {
        const base = String(data[cfg.slugFrom] || cfg.entity)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        data.slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
      }
      if (cfg.upperField && typeof data[cfg.upperField] === 'string') {
        data[cfg.upperField] = (data[cfg.upperField] as string).toUpperCase();
      }
      const row = await m.create({ data, include: cfg.include });
      await writeAudit(req, actor, `${cfg.entity}.create`, cfg.entity, row.id, { name: (row as { name?: string }).name });
      return row;
    },
    async PATCH(req: Request, actor: SessionUser, id: string) {
      requireRole(actor, writeRoles);
      const body = (await req.json()) as Record<string, unknown>;
      const data = coerce(body);
      if (!Object.keys(data).length) throw new ApiError(400, 'VALIDATION', 'No editable fields supplied.');
      const m = model() as unknown as { update: (a: unknown) => Promise<Record<string, string>> };
      const row = await m.update({ where: { id }, data, include: cfg.include });
      await writeAudit(req, actor, `${cfg.entity}.update`, cfg.entity, id, { keys: Object.keys(data) });
      return row;
    },
    async DELETE(req: Request, actor: SessionUser, id: string) {
      requireRole(actor, writeRoles);
      const m = model() as unknown as { delete: (a: unknown) => Promise<unknown> };
      try {
        await m.delete({ where: { id } });
      } catch {
        // FK-constrained rows: soft-archive instead of hard delete
        if (cfg.softField) {
          await (model() as unknown as { update: (a: unknown) => Promise<unknown> }).update({
            where: { id },
            data: { [cfg.softField]: 'ARCHIVED' },
          });
          await writeAudit(req, actor, `${cfg.entity}.archive`, cfg.entity, id, {});
          return { archived: true };
        }
        throw new ApiError(409, 'CONFLICT', 'Row is referenced by other records and cannot be deleted.');
      }
      await writeAudit(req, actor, `${cfg.entity}.delete`, cfg.entity, id, {});
      return { deleted: true };
    },
  };
}

// ─── Entitlements & playback protection ─────────────────────

export type Entitlement = {
  hasActive: boolean;
  quality: 'SD' | 'HD' | 'FULL HD' | '4K';
  devicesLimit: number;
  subscriptionId?: string;
  planName?: string;
};

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const sub = await db.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
  if (!sub) return { hasActive: false, quality: 'HD', devicesLimit: 0 };
  return {
    hasActive: true,
    quality: (sub.plan.quality as Entitlement['quality']) || 'HD',
    devicesLimit: sub.devicesLimit,
    subscriptionId: sub.id,
    planName: sub.plan.name,
  };
}

/** Parse a browser UA into a friendly device platform label */
export function platformFromUa(ua: string): string {
  const s = ua || '';
  if (/TV|Tizen|WebOS|SmartTV|GoogleTV|CrKey/i.test(s)) return 'Smart TV';
  if (/FireTV|Fire TV/i.test(s)) return 'Fire TV';
  if (/iPhone/i.test(s)) return 'iPhone';
  if (/iPad/i.test(s)) return 'iPhone';
  if (/Android/i.test(s)) return 'Android Phone';
  if (/Macintosh|Mac OS/i.test(s)) return 'macOS';
  if (/Windows/i.test(s)) return 'Windows';
  return 'Web';
}

/** Upsert the caller's device within the subscription device limit */
export async function registerPlaybackDevice(userId: string, req: Request, overrideName?: string) {
  const ua = req.headers.get('user-agent') || 'Unknown client';
  const platform = platformFromUa(ua);
  const name = overrideName?.trim() || `${platform} · ${getClientLabel(req)}`;
  const existing = await db.device.findFirst({ where: { userId, name } });
  if (existing) {
    await db.device.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date(), lastIp: lastIp(req), status: existing.status === 'REVOKED' ? 'ACTIVE' : existing.status },
    });
    return existing;
  }
  const ent = await getEntitlement(userId);
  if (ent.hasActive && ent.devicesLimit > 0) {
    const activeCount = await db.device.count({ where: { userId, status: 'ACTIVE' } });
    if (activeCount >= ent.devicesLimit) {
      throw new ApiError(403, 'DEVICE_LIMIT', `Device limit reached (${ent.devicesLimit}). Remove a device from Account → My Devices.`);
    }
  }
  return db.device.create({
    data: { userId, name, platform, lastIp: lastIp(req), lastActiveAt: new Date(), status: 'ACTIVE' },
  });
}

function lastIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
function getClientLabel(req: Request): string {
  const ua = req.headers.get('user-agent') || '';
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|SamsungBrowser)\/[\d.]+/);
  return m ? m[1] : 'Client';
}
