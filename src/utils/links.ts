/**
 * Where a link in a post or comment goes: a subreddit or a post opens in the
 * app; everything else opens in Safari's in-app browser.
 */
export type LinkTarget =
  | { kind: 'subreddit'; name: string }
  | { kind: 'post'; id: string; comment: string | null }
  | { kind: 'web'; url: string };

const REDDIT_HOST = /^(?:https?:\/\/)?(?:(?:www|old|new|np|m|i)\.)?reddit\.com(\/.*)?$/i;
const SHORT_HOST = /^(?:https?:\/\/)?redd\.it\/([a-z0-9]+)/i;

export function linkTarget(url: string): LinkTarget {
  const trimmed = url.trim();
  const short = SHORT_HOST.exec(trimmed);
  if (short?.[1]) return { kind: 'post', id: short[1], comment: null };

  let path: string | null = null;
  if (trimmed.startsWith('/')) path = trimmed;
  else {
    const host = REDDIT_HOST.exec(trimmed);
    if (host) path = host[1] ?? '/';
  }
  if (path === null) {
    return { kind: 'web', url: /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}` };
  }

  const clean = path.split(/[?#]/)[0] ?? '/';
  const post =
    /^\/(?:r\/[A-Za-z0-9_]+\/)?comments\/([a-z0-9]+)(?:\/[^/]*)?(?:\/([a-z0-9]+))?\/?$/i.exec(
      clean,
    );
  if (post?.[1]) return { kind: 'post', id: post[1], comment: post[2] ?? null };
  const subreddit = /^\/r\/([A-Za-z0-9_]{2,21})\/?$/i.exec(clean);
  if (subreddit?.[1]) return { kind: 'subreddit', name: subreddit[1] };
  return { kind: 'web', url: `https://www.reddit.com${path}` };
}
