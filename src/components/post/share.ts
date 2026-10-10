import { Share } from 'react-native';

import type { Post } from '@/utils/posts';

/** The post's address on reddit.com, for sharing or opening elsewhere. */
export function postUrl(post: Pick<Post, 'permalink'>): string {
  return `https://www.reddit.com${post.permalink}`;
}

/** iOS's share sheet, with the post's address. */
export function sharePost(post: Pick<Post, 'permalink' | 'title'>) {
  Share.share({ url: postUrl(post), message: post.title }).catch(() => undefined);
}
