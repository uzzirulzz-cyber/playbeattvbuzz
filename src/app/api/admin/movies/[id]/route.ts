import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';

export const { PATCH, DELETE } = wireItem(makeCrud({
  model: 'movie', entity: 'movie', softField: 'status',
  fields: [
    { name: 'title' }, { name: 'description' }, { name: 'posterSeed' }, { name: 'genres', type: 'csv' },
    { name: 'language' }, { name: 'year', type: 'number' }, { name: 'durationMin', type: 'number' },
    { name: 'quality' }, { name: 'rating' }, { name: 'trailerUrl' }, { name: 'playbackUrl' },
    { name: 'featured', type: 'boolean' }, { name: 'trending', type: 'number' }, { name: 'status' },
  ],
}));
