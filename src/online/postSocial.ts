import { supabase } from './supabase';
import { useAccount } from './account';

/*
 * Likes and comments on Daily Thoughts (tables post_likes / post_comments).
 * Everything here needs a signed-in reader and a connection.
 */

export interface PostComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar: string;
  mine: boolean;
}

const me = () => useAccount.getState().session?.user.id;

/** How many people liked the post, and whether you did. */
export async function getLikes(postId: string): Promise<{ count: number; mine: boolean } | null> {
  if (!supabase || !me()) return null;
  const [all, mine] = await Promise.all([
    supabase.from('post_likes').select('post_id', { count: 'exact', head: true }).eq('post_id', postId),
    supabase.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', me()!).maybeSingle(),
  ]);
  if (all.error) return null;
  return { count: all.count ?? 0, mine: Boolean(mine.data) };
}

export async function setLiked(postId: string, liked: boolean): Promise<void> {
  if (!supabase || !me()) throw new Error('signed out');
  const { error } = liked
    ? await supabase.from('post_likes').upsert({ post_id: postId, user_id: me()! }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    : await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me()!);
  if (error) throw error;
}

export async function listComments(postId: string): Promise<PostComment[] | null> {
  if (!supabase || !me()) return null;
  const { data, error } = await supabase.rpc('post_comments_for', { p_post: postId });
  if (error) return null;
  return (data as PostComment[]) ?? [];
}

export async function addComment(postId: string, body: string): Promise<void> {
  if (!supabase || !me()) throw new Error('signed out');
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: me()!, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('post_comments').delete().eq('id', id);
  if (error) throw error;
}

/** For Admin -> Thoughts: likes and comments per post. */
export async function postStats(): Promise<Record<string, { likes: number; comments: number }>> {
  if (!supabase) return {};
  const [likes, comments] = await Promise.all([
    supabase.from('post_likes').select('post_id'),
    supabase.from('post_comments').select('post_id'),
  ]);
  const out: Record<string, { likes: number; comments: number }> = {};
  for (const r of (likes.data ?? []) as { post_id: string }[]) (out[r.post_id] ??= { likes: 0, comments: 0 }).likes++;
  for (const r of (comments.data ?? []) as { post_id: string }[]) (out[r.post_id] ??= { likes: 0, comments: 0 }).comments++;
  return out;
}
