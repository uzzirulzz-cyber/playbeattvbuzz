import { db } from '@/lib/db';
import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'series', entity: 'series', softField: 'status',
  searchFields: ['title', 'genres'],
  slugFrom: 'title',
  orderBy: { createdAt: 'desc' },
  include: { seasons: { include: { episodes: true } } },
  fields: [
    { name: 'title', required: true },
    { name: 'description' },
    { name: 'posterSeed' },
    { name: 'genres', type: 'csv' },
    { name: 'language' },
    { name: 'year', type: 'number' },
    { name: 'quality' },
    { name: 'featured', type: 'boolean' },
    { name: 'trending', type: 'number' },
    { name: 'status' },
  ],
}));
