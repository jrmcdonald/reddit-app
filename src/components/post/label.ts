import { ageSpoken, plural } from '@/utils/format';
import type { Post } from '@/utils/posts';

import { describeMedia } from './media-thumb';

/** Everything a post row says, in one VoiceOver label. */
export function postLabel(
  post: Post,
  options: { subreddit?: boolean; opened?: boolean } = {},
): string {
  const parts = [post.title];
  if (options.subreddit !== false) parts.push(`r/${post.subreddit}`);
  parts.push(`by ${post.author}`, ageSpoken(post.createdUtc));
  parts.push(plural(post.score, 'point'), plural(post.comments, 'comment'));
  if (post.media.kind !== 'none') parts.push(describeMedia(post));
  if (post.stickied) parts.push('pinned');
  if (post.nsfw) parts.push('NSFW');
  if (post.spoiler) parts.push('spoiler');
  if (options.opened) parts.push('opened');
  return parts.join(', ');
}
