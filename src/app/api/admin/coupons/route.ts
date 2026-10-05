import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'coupon', entity: 'coupon', softField: 'status',
  searchFields: ['code'],
  upperField: 'code',
  orderBy: { code: 'asc' },
  fields: [
    { name: 'code', required: true },
    { name: 'type' },
    { name: 'value', type: 'number', required: true },
    { name: 'maxUses', type: 'number' },
    { name: 'perCustomerLimit', type: 'number' },
    { name: 'minAmount', type: 'number' },
    { name: 'planId' },
    { name: 'expiresAt', type: 'date' },
    { name: 'status' },
  ],
}));
