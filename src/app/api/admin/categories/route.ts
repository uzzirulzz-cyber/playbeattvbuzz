import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'channelCategory', entity: 'channelCategory',
  searchFields: ['name'],
  slugFrom: 'name',
  orderBy: { sortOrder: 'asc' },
  fields: [
    { name: 'name', required: true },
    { name: 'slug' },
    { name: 'sortOrder', type: 'number' },
  ],
}));
