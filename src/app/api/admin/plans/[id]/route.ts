import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

const crud = makeCrud({
  model: 'plan', entity: 'plan', softField: 'status',
  fields: [
    { name: 'name' }, { name: 'description' }, { name: 'price', type: 'number' },
    { name: 'currency' }, { name: 'billingPeriod' }, { name: 'deviceLimit', type: 'number' },
    { name: 'quality' }, { name: 'features', type: 'json' }, { name: 'trialDays', type: 'number' },
    { name: 'autoRenewal', type: 'boolean' }, { name: 'status' },
  ],
});
export const { PATCH, DELETE } = wireItem(crud);
