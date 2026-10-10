/**
 * The parts of Reddit's responses the app depends on, checked with zod.
 *
 * Reddit publishes no machine-readable spec, so these are written by hand
 * from what the API returns. Every object is loose (extra fields pass
 * through untouched), and most fields Reddit sometimes leaves out are
 * optional, so a new or missing field never breaks a screen. A listing's
 * children are checked one at a time (see `listingChildren`): one odd post
 * is dropped, not the whole page.
 *
 * Every request asks for `raw_json=1`, so text and URLs arrive unescaped
 * (no `&amp;`).
 */
import { z } from 'zod';

const nullableString = z.string().nullish();

/** One rendition of an image: a URL and its size in pixels. */
export const ImageSource = z.looseObject({
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

export const RedditVideo = z.looseObject({
  hls_url: z.string().nullish(),
  fallback_url: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  duration: z.number().nullish(),
  is_gif: z.boolean().nullish(),
});

export const Preview = z.looseObject({
  images: z
    .array(
      z.looseObject({
        source: ImageSource,
        resolutions: z.array(ImageSource).default([]),
      }),
    )
    .default([]),
  /** A GIF or short clip Reddit converted to video. */
  reddit_video_preview: RedditVideo.nullish(),
});

/** One image of a gallery, or one embedded in a text post. */
export const MediaMetadata = z.looseObject({
  status: z.string().nullish(),
  /** "Image", "AnimatedImage", "RedditVideo"… */
  e: z.string().nullish(),
  /** The biggest: `u` for a still, `gif` and `mp4` for an animated one. */
  s: z
    .looseObject({
      u: z.string().nullish(),
      gif: z.string().nullish(),
      mp4: z.string().nullish(),
      x: z.number().nullish(),
      y: z.number().nullish(),
    })
    .nullish(),
  /** Smaller renditions, smallest first. */
  p: z.array(z.looseObject({ u: z.string(), x: z.number(), y: z.number() })).nullish(),
});

/** A post: a "t3" thing. */
export const RawPostSchema = z.looseObject({
  id: z.string(),
  /** The fullname, "t3_<id>", which save and unsave take. */
  name: z.string(),
  title: z.string(),
  subreddit: z.string(),
  author: z.string(),
  created_utc: z.number(),
  score: z.number().default(0),
  num_comments: z.number().default(0),
  over_18: z.boolean().default(false),
  spoiler: z.boolean().default(false),
  is_self: z.boolean().default(false),
  selftext: z.string().default(''),
  url: nullableString,
  domain: nullableString,
  permalink: z.string(),
  thumbnail: nullableString,
  saved: z.boolean().default(false),
  stickied: z.boolean().default(false),
  locked: z.boolean().default(false),
  link_flair_text: nullableString,
  post_hint: nullableString,
  upvote_ratio: z.number().nullish(),
  is_gallery: z.boolean().nullish(),
  is_video: z.boolean().default(false),
  preview: Preview.nullish(),
  media: z.looseObject({ reddit_video: RedditVideo.nullish() }).nullish(),
  media_metadata: z.record(z.string(), MediaMetadata).nullish(),
  gallery_data: z
    .looseObject({
      items: z.array(
        z.looseObject({ media_id: z.string(), caption: nullableString, id: z.number().nullish() }),
      ),
    })
    .nullish(),
  /** A crosspost's original, which holds the media. Checked when used. */
  crosspost_parent_list: z.array(z.unknown()).nullish(),
  removed_by_category: nullableString,
});
export type RawPost = z.infer<typeof RawPostSchema>;

/** A comment: a "t1" thing. Its replies are checked as the tree is walked. */
export const RawCommentSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  author: z.string(),
  body: z.string().default(''),
  score: z.number().default(0),
  score_hidden: z.boolean().default(false),
  created_utc: z.number(),
  depth: z.number().nullish(),
  /** A listing of replies, or "" when there are none. */
  replies: z.unknown().optional(),
  is_submitter: z.boolean().default(false),
  distinguished: nullableString,
  author_flair_text: nullableString,
  saved: z.boolean().default(false),
  stickied: z.boolean().default(false),
  collapsed: z.boolean().default(false),
  parent_id: nullableString,
  link_id: nullableString,
  permalink: nullableString,
  /** On a saved comment: the post it belongs to. */
  link_title: nullableString,
  subreddit: nullableString,
});
export type RawComment = z.infer<typeof RawCommentSchema>;

/** Replies not sent yet: "load more", or "continue this thread" when `count` is 0. */
export const RawMoreSchema = z.looseObject({
  id: z.string(),
  name: z.string().nullish(),
  count: z.number().default(0),
  children: z.array(z.string()).default([]),
  depth: z.number().nullish(),
  parent_id: nullableString,
});
export type RawMore = z.infer<typeof RawMoreSchema>;

/** A subreddit: a "t5" thing. */
export const RawSubredditSchema = z.looseObject({
  name: z.string(),
  display_name: z.string(),
  display_name_prefixed: z.string().nullish(),
  title: nullableString,
  public_description: nullableString,
  subscribers: z.number().nullish(),
  over18: z.boolean().nullish(),
  icon_img: nullableString,
  community_icon: nullableString,
  user_is_subscriber: z.boolean().nullish(),
  subreddit_type: nullableString,
});
export type RawSubreddit = z.infer<typeof RawSubredditSchema>;

export const Thing = z.looseObject({ kind: z.string(), data: z.unknown() });

export const ListingSchema = z.looseObject({
  kind: z.literal('Listing'),
  data: z.looseObject({
    after: z.string().nullish(),
    before: z.string().nullish(),
    children: z.array(Thing),
  }),
});
export type Listing = z.infer<typeof ListingSchema>;

/** GET /comments/<id>: the post, then its comments. */
export const CommentsResponse = z.tuple([ListingSchema, ListingSchema]);

/** GET /api/morechildren?api_type=json */
export const MoreChildrenResponse = z.looseObject({
  json: z.looseObject({
    errors: z.array(z.unknown()).default([]),
    data: z.looseObject({ things: z.array(Thing).default([]) }).optional(),
  }),
});

export const MeSchema = z.looseObject({
  name: z.string(),
  icon_img: nullableString,
  over_18: z.boolean().nullish(),
});
export type Me = z.infer<typeof MeSchema>;

/** POST /api/v1/access_token, for every grant. */
export const TokenResponseSchema = z.looseObject({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number(),
  scope: z.string().optional(),
  /** Only from the authorization code grant with duration=permanent. */
  refresh_token: z.string().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/** What the token endpoint says instead, with status 200 or 400. */
export const TokenError = z.looseObject({ error: z.string() });

type Kinds = {
  t1: RawComment;
  t3: RawPost;
  t5: RawSubreddit;
  more: RawMore;
};
const SCHEMAS = {
  t1: RawCommentSchema,
  t3: RawPostSchema,
  t5: RawSubredditSchema,
  more: RawMoreSchema,
} as const;

/**
 * The children of a listing that are of one kind and pass that kind's
 * schema. Others (an ad-free API has none, but a "more" in a post listing,
 * say) are skipped, as is any child that fails its schema.
 */
export function listingChildren<K extends keyof Kinds>(listing: Listing, kind: K): Kinds[K][] {
  const out: Kinds[K][] = [];
  for (const child of listing.data.children) {
    if (child.kind !== kind) continue;
    const parsed = SCHEMAS[kind].safeParse(child.data);
    if (parsed.success) out.push(parsed.data as Kinds[K]);
  }
  return out;
}

/** One thing of a known kind, or null. */
export function parseThing(
  thing: unknown,
):
  | { kind: 't1'; data: RawComment }
  | { kind: 't3'; data: RawPost }
  | { kind: 'more'; data: RawMore }
  | null {
  const parsed = Thing.safeParse(thing);
  if (!parsed.success) return null;
  const { kind, data } = parsed.data;
  if (kind === 't1') {
    const comment = RawCommentSchema.safeParse(data);
    return comment.success ? { kind, data: comment.data } : null;
  }
  if (kind === 't3') {
    const post = RawPostSchema.safeParse(data);
    return post.success ? { kind, data: post.data } : null;
  }
  if (kind === 'more') {
    const more = RawMoreSchema.safeParse(data);
    return more.success ? { kind, data: more.data } : null;
  }
  return null;
}
