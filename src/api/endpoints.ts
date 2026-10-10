/**
 * Every Reddit endpoint the app uses, one function each. docs/API.md lists
 * them with what they are for; add a line there for each new one.
 */
import { toComment, parseTree, type Comment, type Node } from '@/utils/comments';
import { toPost, type Post } from '@/utils/posts';

import type { RedditClient } from './client';
import { ResponseError } from './errors';
import {
  CommentsResponse,
  listingChildren,
  ListingSchema,
  MeSchema,
  MoreChildrenResponse,
  parseThing,
  RawSubredditSchema,
  Thing,
  type Listing,
  type Me,
  type RawSubreddit as RawSubredditT,
} from './schemas';

export type Feed = { kind: 'home' } | { kind: 'popular' } | { kind: 'subreddit'; name: string };

export const SORTS = ['best', 'hot', 'new', 'top', 'rising'] as const;
export type Sort = (typeof SORTS)[number];

export const PERIODS = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export interface Page<T> {
  items: T[];
  after: string | null;
}

/** Posts per page. Larger pages mean fewer requests for the same scrolling. */
const PAGE_SIZE = 50;

export function feedPath(feed: Feed, sort: Sort): string {
  // "Best" is the home feed's own ordering; elsewhere it means hot.
  switch (feed.kind) {
    case 'home':
      return sort === 'best' ? '/best' : `/${sort}`;
    case 'popular':
      return `/r/popular/${sort === 'best' ? 'hot' : sort}`;
    case 'subreddit':
      return `/r/${encodeURIComponent(feed.name)}/${sort === 'best' ? 'hot' : sort}`;
  }
}

export async function fetchFeed(
  client: RedditClient,
  feed: Feed,
  sort: Sort,
  period: Period,
  after: string | null,
): Promise<Page<Post>> {
  const listing = await client.get(feedPath(feed, sort), ListingSchema, {
    limit: PAGE_SIZE,
    after,
    t: sort === 'top' ? period : undefined,
    // Popular everywhere, not the country Reddit guesses from the address.
    geo_filter: feed.kind === 'popular' ? 'GLOBAL' : undefined,
  });
  return {
    items: listingChildren(listing, 't3').map(toPost),
    after: listing.data.after ?? null,
  };
}

export const COMMENT_SORTS = ['confidence', 'top', 'new', 'controversial', 'old', 'qa'] as const;
export type CommentSort = (typeof COMMENT_SORTS)[number];

export interface Thread {
  post: Post;
  comments: Node[];
}

/**
 * A post and its comments. With `focus`, only that comment's thread, for
 * "Continue this thread".
 */
export async function fetchThread(
  client: RedditClient,
  postId: string,
  sort: CommentSort,
  focus?: string | null,
): Promise<Thread> {
  const path = focus
    ? `/comments/${encodeURIComponent(postId)}/_/${encodeURIComponent(focus)}`
    : `/comments/${encodeURIComponent(postId)}`;
  const [postListing, commentListing] = await client.get(path, CommentsResponse, {
    sort,
    limit: 200,
    depth: 10,
  });
  const [raw] = listingChildren(postListing, 't3');
  if (!raw) throw new ResponseError('Reddit sent comments without their post.');
  return { post: toPost(raw), comments: parseTree(commentListing) };
}

/** The comments behind a "load more" placeholder, as a flat list naming parents. */
export async function fetchMoreChildren(
  client: RedditClient,
  postId: string,
  children: string[],
  sort: CommentSort,
): Promise<unknown[]> {
  const response = await client.get('/api/morechildren', MoreChildrenResponse, {
    api_type: 'json',
    link_id: `t3_${postId}`,
    // Reddit takes at most 100 at a time.
    children: children.slice(0, 100).join(','),
    sort,
  });
  return response.json.data?.things ?? [];
}

export async function fetchMe(client: RedditClient): Promise<Me> {
  return client.get('/api/v1/me', MeSchema);
}

export type SavedItem = { kind: 'post'; post: Post } | { kind: 'comment'; comment: Comment };

export async function fetchSaved(
  client: RedditClient,
  username: string,
  type: 'links' | 'comments',
  after: string | null,
): Promise<Page<SavedItem>> {
  const listing = await client.get(`/user/${encodeURIComponent(username)}/saved`, ListingSchema, {
    type,
    limit: 100,
    after,
  });
  const items: SavedItem[] = [];
  for (const child of listing.data.children) {
    const thing = parseThing(child);
    if (thing?.kind === 't3') items.push({ kind: 'post', post: toPost(thing.data) });
    if (thing?.kind === 't1') items.push({ kind: 'comment', comment: toComment(thing.data) });
  }
  return { items, after: listing.data.after ?? null };
}

/** Saves or unsaves a post ("t3_…") or comment ("t1_…"). */
export async function setSaved(client: RedditClient, fullname: string, saved: boolean) {
  await client.post(saved ? '/api/save' : '/api/unsave', { id: fullname });
}

export interface Subreddit {
  name: string;
  title: string | null;
  description: string | null;
  subscribers: number | null;
  nsfw: boolean;
  icon: string | null;
  subscribed: boolean | null;
}

function toSubreddit(raw: RawSubredditT): Subreddit {
  // community_icon carries a query string Reddit needs; icon_img is the old one.
  const icon = raw.community_icon || raw.icon_img || null;
  return {
    name: raw.display_name,
    title: raw.title?.trim() || null,
    description: raw.public_description?.trim() || null,
    subscribers: raw.subscribers ?? null,
    nsfw: !!raw.over18,
    icon,
    subscribed: raw.user_is_subscriber ?? null,
  };
}

/** Everything the signed-in account subscribes to, alphabetically. */
export async function fetchSubscriptions(client: RedditClient): Promise<Subreddit[]> {
  const out: Subreddit[] = [];
  let after: string | null = null;
  // 100 a page; ten pages is more subscriptions than anyone reads.
  for (let page = 0; page < 10; page++) {
    const listing: Listing = await client.get('/subreddits/mine/subscriber', ListingSchema, {
      limit: 100,
      after,
    });
    out.push(...listingChildren(listing, 't5').map(toSubreddit));
    after = listing.data.after ?? null;
    if (!after) break;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function searchSubreddits(client: RedditClient, query: string): Promise<Subreddit[]> {
  const listing = await client.get('/subreddits/search', ListingSchema, {
    q: query,
    limit: 25,
    include_over_18: 'on',
  });
  return listingChildren(listing, 't5').map(toSubreddit);
}

export async function fetchSubreddit(client: RedditClient, name: string): Promise<Subreddit> {
  const thing = await client.get(`/r/${encodeURIComponent(name)}/about`, Thing);
  const parsed = RawSubredditSchema.safeParse(thing.data);
  if (!parsed.success) throw new ResponseError('Reddit sent a subreddit the app could not read.');
  return toSubreddit(parsed.data);
}
