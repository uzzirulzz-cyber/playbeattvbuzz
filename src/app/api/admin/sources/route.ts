import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'streamingSource', entity: 'streamingSource',
  searchFields: ['label'],
  include: { provider: true },
  orderBy: { label: 'asc' },
  fields: [
    { name: 'label', required: true },
    { name: 'providerId' },
    { name: 'protocol' },
    { name: 'baseUrl' },
    { name: 'credentialsRef' },
    { name: 'status' },
  ],
}));
