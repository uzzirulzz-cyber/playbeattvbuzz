import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'channel', entity: 'channel', softField: 'status',
  searchFields: ['name', 'country', 'epgId'],
  slugFrom: 'name',
  orderBy: { name: 'asc' },
  include: { category: true },
  fields: [
    { name: 'name', required: true },
    { name: 'description' },
    { name: 'logoSeed' },
    { name: 'categoryId', required: true },
    { name: 'country' },
    { name: 'language' },
    { name: 'quality' },
    { name: 'epgId' },
    { name: 'streamType' },
    { name: 'streamUrl' },
    { name: 'isFree', type: 'boolean' },
    { name: 'status' },
  ],
}));
