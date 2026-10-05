import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

export const { PATCH, DELETE } = wireItem(makeCrud({
  model: 'channel', entity: 'channel', softField: 'status',
  include: { category: true },
  fields: [
    { name: 'name' }, { name: 'description' }, { name: 'logoSeed' }, { name: 'categoryId' },
    { name: 'country' }, { name: 'language' }, { name: 'quality' }, { name: 'epgId' },
    { name: 'streamType' }, { name: 'streamUrl' }, { name: 'isFree', type: 'boolean' }, { name: 'status' },
  ],
}));
