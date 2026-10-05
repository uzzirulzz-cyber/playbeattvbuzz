import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, rateLimit, requireAuth } from '@/lib/auth';

/** Validates a coupon for a given plan+user; returns discount breakdown. */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    rateLimit(req, 'coupon-validate', 20, 60_000);
    const { code, planId, amount } = (await req.json()) as { code: string; planId?: string; amount?: number };

    const coupon = await db.coupon.findUnique({ where: { code: (code || '').trim().toUpperCase() } });
    if (!coupon || coupon.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'This coupon code is not valid.');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(410, 'EXPIRED', 'This coupon has expired.');
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new ApiError(410, 'EXHAUSTED', 'This coupon has reached its usage limit.');
    if (coupon.planId && coupon.planId !== planId) {
      const p = await db.plan.findUnique({ where: { id: coupon.planId } });
      throw new ApiError(400, 'PLAN_MISMATCH', `This coupon only applies to the ${p?.name || 'specific'} plan.`);
    }
    const prevUses = await db.order.count({ where: { userId: session.id, couponId: coupon.id, status: { notIn: ['CANCELLED', 'FAILED'] } } });
    if (prevUses >= coupon.perCustomerLimit) {
      throw new ApiError(400, 'LIMIT_REACHED', 'You have already used this coupon the maximum number of times.');
    }
    const subtotal = typeof amount === 'number' ? amount : 0;
    if (subtotal > 0 && subtotal < coupon.minAmount) {
      throw new ApiError(400, 'MIN_AMOUNT', `This coupon requires a minimum order of $${coupon.minAmount.toFixed(2)}.`);
    }
    const discount = coupon.type === 'PERCENT' ? Math.round(subtotal * (coupon.value / 100) * 100) / 100 : Math.min(coupon.value, subtotal);
    return jsonOk({ code: coupon.code, type: coupon.type, value: coupon.value, discount, description: coupon.type === 'PERCENT' ? `${coupon.value}% off` : `$${coupon.value} off` });
  } catch (e) {
    return jsonErr(e);
  }
}
