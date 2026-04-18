import { supabase } from './supabase.js';

const MEDIA_BUCKET = 'polaroom-media';

export async function uploadMedia(file, path) {
  if (!supabase) {
    throw new Error('Supabase não configurado para upload.');
  }
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;
  return data;
}

export async function deleteMedia(path) {
  if (!supabase || !path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

export function getPublicMediaUrl(path) {
  if (!supabase || !path) return '';
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}
