import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

export const { PATCH, DELETE } = wireItem(makeCrud({
  model: 'channelCategory', entity: 'channelCategory',
  fields: [ { name: 'name' }, { name: 'slug' }, { name: 'sortOrder', type: 'number' } ],
}));
