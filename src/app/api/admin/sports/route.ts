import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'sportsEvent', entity: 'sportsEvent',
  searchFields: ['title', 'category'],
  orderBy: { startsAt: 'desc' },
  fields: [
    { name: 'title', required: true },
    { name: 'category' },
    { name: 'homeTeam' },
    { name: 'awayTeam' },
    { name: 'startsAt', type: 'date', required: true },
    { name: 'status' },
    { name: 'channelId' },
  ],
}));
