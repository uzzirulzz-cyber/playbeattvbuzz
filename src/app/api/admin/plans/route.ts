import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'plan', entity: 'plan', softField: 'status',
  searchFields: ['name'],
  slugFrom: 'name',
  orderBy: { price: 'asc' },
  fields: [
    { name: 'name', required: true },
    { name: 'description' },
    { name: 'price', type: 'number', required: true },
    { name: 'currency' },
    { name: 'billingPeriod' },
    { name: 'deviceLimit', type: 'number' },
    { name: 'quality' },
    { name: 'features', type: 'json' },
    { name: 'trialDays', type: 'number' },
    { name: 'autoRenewal', type: 'boolean' },
    { name: 'status' },
  ],
}));
