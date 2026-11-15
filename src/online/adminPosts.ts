import { compressionSteps, extensionFor, fitWithin, TARGET_BYTES } from '../engine/image';
import type { Post, PostDraft } from '../engine/posts';
import { supabase } from './supabase';
import { useAccount } from './account';
import { POST_COLUMNS, syncPosts } from './posts';

/*
 * Writing Daily Thoughts (Admin → Thoughts). The database decides who may do
 * this (profiles.is_admin + row level security); the app only hides the screens.
 */

const BUCKET = 'post-images';

function client() {
  if (!supabase || !useAccount.getState().session) throw new Error('offline');
  return supabase;
}

/** Every post: drafts, scheduled and published, newest date first. */
export async function listAllPosts(): Promise<Post[]> {
  const { data, error } = await client().from('posts').select(POST_COLUMNS).order('publish_on', { ascending: false }).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data as unknown as Post[]) ?? [];
}

/** Creates the post, or saves changes to it. Returns it as stored. */
export async function savePost(d: PostDraft): Promise<Post> {
  const row = {
    title_en: d.title_en.trim(),
    title_ta: d.title_ta.trim(),
    body_en: d.body_en.trim(),
    body_ta: d.body_ta.trim(),
    cover_url: d.cover_url || null,
    verse_ref: d.verse_ref || null,
    publish_on: d.publish_on,
    status: d.status,
  };
  const table = client().from('posts');
  const { data, error } = d.id ? await table.update(row).eq('id', d.id).select(POST_COLUMNS).single() : await table.insert(row).select(POST_COLUMNS).single();
  if (error) throw error;
  void syncPosts(); // readers on this phone see the change too
  return data as unknown as Post;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await client().from('posts').delete().eq('id', id);
  if (error) throw error;
  void syncPosts();
}

// ---------- Pictures ----------

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // Follows the photo's rotation tag (phones save portrait photos sideways).
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* some formats only decode through <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a photo on the phone: longest side 1600px, WebP (JPEG where the
 * browser can't write WebP), about 300 KB.
 */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const img = await decode(file);
  try {
    if (!img.width || !img.height) throw new Error('not a picture');
    const canvas = document.createElement('canvas');
    let best: Blob | null = null;
    let drawnAt = 0;
    for (const step of compressionSteps()) {
      const size = fitWithin(img.width, img.height, step.max);
      if (drawnAt !== size.width) {
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        // JPEG has no transparency: put white behind see-through pictures.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img.source, 0, 0, size.width, size.height);
        drawnAt = size.width;
      }
      let blob = await toBlob(canvas, 'image/webp', step.quality);
      // Browsers that can't write WebP hand back a PNG instead: use JPEG there.
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', step.quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!best) throw new Error('could not shrink the picture');
    return best;
  } finally {
    img.close();
  }
}

/** Shrinks a picture, uploads it to the post-images bucket and returns its public address. */
export async function uploadPostImage(file: Blob): Promise<string> {
  const sb = client();
  const small = await shrinkImage(file);
  const uid = useAccount.getState().session!.user.id;
  const name = `${uid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(small.type)}`;
  const { error } = await sb.storage.from(BUCKET).upload(name, small, { contentType: small.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
}
