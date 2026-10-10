/**
 * Which of a feed's posts to show: each once, without NSFW posts when they
 * are hidden, and without muted subreddits and words. The feed and the
 * swiper over it ask the same question, so they agree on what is there.
 */
import type { Feed } from '@/api/endpoints';

import { isVisual, type Post } from './posts';

export interface Filters {
  showNsfw: boolean;
  mutedSubreddits: readonly string[];
  mutedWords: readonly string[];
}

/** A subreddit as typed, or as Reddit names it, compared as one form: "r/Foo " is "foo". */
export function subredditKey(name: string): string {
  return name
    .trim()
    .replace(/^\/?r\//i, '')
    .toLowerCase();
}

/** A muted word or phrase in one form: trimmed, lower case, single spaces. */
export function wordKey(word: string): string {
  return word.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  // A letter in any alphabet with case, a digit, or an underscore.
  return ch.toLowerCase() !== ch.toUpperCase() || /[0-9_]/.test(ch);
}

/**
 * Whether `text` has `word` in it as a whole word or phrase, whatever its
 * case: "cat" mutes "Cat pictures" and "my cat!", not "concatenate". A word
 * that starts or ends with punctuation ("c++") matches at that edge as is.
 */
export function hasWord(text: string, word: string): boolean {
  const needle = wordKey(word);
  if (!needle) return false;
  const haystack = text.replace(/\s+/g, ' ').toLowerCase();
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return false;
    const end = at + needle.length;
    const before = !isWordChar(needle[0]) || !isWordChar(haystack[at - 1]);
    const after = !isWordChar(needle[needle.length - 1]) || !isWordChar(haystack[end]);
    if (before && after) return true;
    from = at + 1;
  }
}

/**
 * Whether a post is muted here. A muted subreddit's posts leave Home and
 * Popular, but the subreddit itself still shows them: opening it is asking
 * for them. Muted words apply everywhere, to titles and flair.
 */
export function isMuted(post: Post, feed: Feed, filters: Filters): boolean {
  if (feed.kind !== 'subreddit') {
    const subreddit = subredditKey(post.subreddit);
    if (filters.mutedSubreddits.some((muted) => subredditKey(muted) === subreddit)) return true;
  }
  const text = post.flair ? `${post.title} ${post.flair}` : post.title;
  return filters.mutedWords.some((word) => hasWord(text, word));
}

/** A feed's loaded pages as the posts to show, in order, each once. */
export function visiblePosts(
  pages: readonly { items: readonly Post[] }[],
  feed: Feed,
  filters: Filters,
  options: { visualOnly?: boolean } = {},
): Post[] {
  // Pages can overlap when posts move between fetches; show each once.
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const page of pages) {
    for (const post of page.items) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      if (post.nsfw && !filters.showNsfw) continue;
      if (options.visualOnly && !isVisual(post.media)) continue;
      if (isMuted(post, feed, filters)) continue;
      out.push(post);
    }
  }
  return out;
}
