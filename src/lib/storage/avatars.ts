import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type AnySchemaClient =
  | SupabaseClient
  | SupabaseClient<Database, keyof Omit<Database, '__InternalSupabase'>>;

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const TARGET_DIMENSION = 800;
export const JPEG_QUALITY = 0.85;
export const POST_RESIZE_LIMIT_BYTES = 1024 * 1024;

export function validateMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export async function resizeImage(file: File): Promise<Blob> {
  if (!validateMime(file.type)) {
    throw new Error('Formato no soportado. Usa JPG, PNG o WebP.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Archivo muy grande. Máximo 5MB antes de procesar.');
  }
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ratio = Math.min(TARGET_DIMENSION / img.width, TARGET_DIMENSION / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context no disponible');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
  if (blob.size > POST_RESIZE_LIMIT_BYTES) {
    throw new Error(
      `Imagen demasiado grande después de procesar (${Math.round(blob.size / 1024)}KB). Intenta una foto más pequeña.`
    );
  }
  return blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

// Use for F5 admin edit + F33 self-service. Wizard step 10 must use
// uploadOnboardingAvatarAction (server action) because user is not yet authenticated.
export async function uploadAvatar(
  client: AnySchemaClient,
  personId: string,
  blob: Blob
): Promise<string> {
  const path = `${personId}/current.jpg`;
  const { error } = await client.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload falló: ${error.message}`);
  return `avatars/${path}`;
}

export async function getAvatarSignedUrl(
  client: AnySchemaClient,
  path: string,
  ttlSeconds = 3600
): Promise<string> {
  const cleanPath = path.startsWith('avatars/') ? path.slice('avatars/'.length) : path;
  const { data, error } = await client.storage.from('avatars').createSignedUrl(cleanPath, ttlSeconds);
  if (error || !data) throw new Error(`Signed URL falló: ${error?.message}`);
  return data.signedUrl;
}
