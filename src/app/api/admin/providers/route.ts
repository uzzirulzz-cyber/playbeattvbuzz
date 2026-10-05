import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'contentProvider', entity: 'contentProvider',
  searchFields: ['name'],
  orderBy: { name: 'asc' },
  fields: [
    { name: 'name', required: true },
    { name: 'type' },
    { name: 'status' },
    { name: 'notes' },
  ],
}));
