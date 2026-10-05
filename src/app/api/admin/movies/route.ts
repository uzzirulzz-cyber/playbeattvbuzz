import { makeCrud } from '@/lib/adminCrud';
import { wireListCreate } from '@/lib/adminRoute';

export const { GET, POST } = wireListCreate(makeCrud({
  model: 'movie', entity: 'movie', softField: 'status',
  searchFields: ['title', 'genres'],
  slugFrom: 'title',
  orderBy: { createdAt: 'desc' },
  fields: [
    { name: 'title', required: true },
    { name: 'description' },
    { name: 'posterSeed' },
    { name: 'genres', type: 'csv' },
    { name: 'language' },
    { name: 'year', type: 'number' },
    { name: 'durationMin', type: 'number' },
    { name: 'quality' },
    { name: 'rating' },
    { name: 'trailerUrl' },
    { name: 'playbackUrl' },
    { name: 'featured', type: 'boolean' },
    { name: 'trending', type: 'number' },
    { name: 'status' },
  ],
}));
