import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

export const { PATCH, DELETE } = wireItem(makeCrud({
  model: 'coupon', entity: 'coupon', softField: 'status',
  fields: [
    { name: 'code' }, { name: 'type' }, { name: 'value', type: 'number' },
    { name: 'maxUses', type: 'number' }, { name: 'perCustomerLimit', type: 'number' },
    { name: 'minAmount', type: 'number' }, { name: 'planId' },
    { name: 'expiresAt', type: 'date' }, { name: 'status' },
  ],
}));
