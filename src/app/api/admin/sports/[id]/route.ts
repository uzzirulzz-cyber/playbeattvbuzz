import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

export const { PATCH, DELETE } = wireItem(makeCrud({
  model: 'sportsEvent', entity: 'sportsEvent',
  fields: [
    { name: 'title' }, { name: 'category' }, { name: 'homeTeam' }, { name: 'awayTeam' },
    { name: 'startsAt', type: 'date' }, { name: 'status' }, { name: 'channelId' },
  ],
}));
