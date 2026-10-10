/**
 * Reddit's post, as the screens want it: one `media` that says what to draw
 * (an image, a gallery, a video, a link or nothing), whichever of Reddit's
 * half-dozen overlapping fields it came from.
 */
import { RawPostSchema, type RawPost as RawPostType } from '@/api/schemas';

export interface Rendition {
  url: string;
  width: number;
  height: number;
}

/** One image in every size Reddit made of it, smallest first. */
export interface Picture {
  renditions: Rendition[];
  /** Width over height, for laying it out before it loads. */
  aspect: number;
}

export interface Clip {
  /** Adaptive stream, with sound when there is any. */
  hls: string | null;
  /** A plain MP4 with no sound, for when HLS is unavailable. */
  mp4: string | null;
  aspect: number;
  /** Seconds. */
  duration: number | null;
  /** A GIF converted to video: loops, silently. */
  gif: boolean;
}

export type Media =
  | { kind: 'none' }
  | { kind: 'image'; picture: Picture }
  | { kind: 'gallery'; items: { picture: Picture; caption: string | null }[] }
  | { kind: 'video'; clip: Clip; poster: Picture | null }
  | { kind: 'link'; url: string; domain: string; thumbnail: Picture | null };

export interface Post {
  id: string;
  /** "t3_<id>", which save and unsave take. */
  fullname: string;
  title: string;
  subreddit: string;
  author: string;
  createdUtc: number;
  score: number;
  comments: number;
  upvoteRatio: number | null;
  nsfw: boolean;
  spoiler: boolean;
  saved: boolean;
  stickied: boolean;
  locked: boolean;
  removed: boolean;
  flair: string | null;
  /** A text post's Markdown. */
  body: string;
  permalink: string;
  media: Media;
}

function rendition(url: string | null | undefined, width?: number | null, height?: number | null) {
  if (!url || !width || !height) return null;
  return { url, width, height };
}

function picture(renditions: (Rendition | null)[]): Picture | null {
  const sorted = renditions
    .filter((r): r is Rendition => r !== null)
    .sort((a, b) => a.width - b.width);
  const largest = sorted[sorted.length - 1];
  if (!largest) return null;
  return { renditions: sorted, aspect: largest.width / largest.height };
}

function previewPicture(raw: RawPostType): Picture | null {
  const image = raw.preview?.images[0];
  if (!image) return null;
  return picture([...image.resolutions, image.source]);
}

function clip(video: NonNullable<RawPostType['media']>['reddit_video'], gif: boolean): Clip | null {
  if (!video) return null;
  const hls = video.hls_url ?? null;
  const mp4 = video.fallback_url ?? null;
  if (!hls && !mp4) return null;
  const aspect = video.width && video.height ? video.width / video.height : 16 / 9;
  return { hls, mp4, aspect, duration: video.duration ?? null, gif: gif || !!video.is_gif };
}

function gallery(raw: RawPostType): Media | null {
  const items = raw.gallery_data?.items;
  const metadata = raw.media_metadata;
  if (!raw.is_gallery || !items?.length || !metadata) return null;
  const out: { picture: Picture; caption: string | null }[] = [];
  for (const item of items) {
    const meta = metadata[item.media_id];
    if (!meta || (meta.status && meta.status !== 'valid')) continue;
    const biggest = rendition(meta.s?.u ?? meta.s?.gif, meta.s?.x, meta.s?.y);
    const smaller = (meta.p ?? []).map((p) => rendition(p.u, p.x, p.y));
    const found = picture([...smaller, biggest]);
    if (found) out.push({ picture: found, caption: item.caption ?? null });
  }
  return out.length ? { kind: 'gallery', items: out } : null;
}

const IMAGE_URL = /\.(jpe?g|png|gif|webp)(\?|$)/i;

function mediaOf(raw: RawPostType): Media {
  const fromGallery = gallery(raw);
  if (fromGallery) return fromGallery;

  const poster = previewPicture(raw);
  const video = clip(raw.media?.reddit_video, false);
  if (raw.is_video && video) return { kind: 'video', clip: video, poster };
  const gif = clip(raw.preview?.reddit_video_preview, true);
  if (gif) return { kind: 'video', clip: gif, poster };

  if (raw.is_self) return { kind: 'none' };
  if (poster && (raw.post_hint === 'image' || IMAGE_URL.test(raw.url ?? ''))) {
    return { kind: 'image', picture: poster };
  }
  if (raw.url) {
    return { kind: 'link', url: raw.url, domain: raw.domain ?? hostOf(raw.url), thumbnail: poster };
  }
  return { kind: 'none' };
}

function hostOf(url: string): string {
  const match = /^https?:\/\/([^/?#]+)/i.exec(url);
  return (match?.[1] ?? url).replace(/^www\./, '');
}

/** The original of a crosspost, which is where its media lives. */
function crosspostParent(raw: RawPostType): RawPostType | null {
  const parent = raw.crosspost_parent_list?.[0];
  if (!parent) return null;
  const parsed = RawPostSchema.safeParse(parent);
  return parsed.success ? parsed.data : null;
}

export function toPost(raw: RawPostType): Post {
  const parent = crosspostParent(raw);
  let media = mediaOf(raw);
  if (parent && (media.kind === 'none' || media.kind === 'link')) {
    const parentMedia = mediaOf(parent);
    if (parentMedia.kind !== 'none') media = parentMedia;
  }
  return {
    id: raw.id,
    fullname: raw.name,
    title: raw.title,
    subreddit: raw.subreddit,
    author: raw.author,
    createdUtc: raw.created_utc,
    score: raw.score,
    comments: raw.num_comments,
    upvoteRatio: raw.upvote_ratio ?? null,
    nsfw: raw.over_18,
    spoiler: raw.spoiler,
    saved: raw.saved,
    stickied: raw.stickied,
    locked: raw.locked,
    removed: !!raw.removed_by_category,
    flair: raw.link_flair_text?.trim() || null,
    body: raw.selftext,
    permalink: raw.permalink,
    media,
  };
}

/**
 * The smallest rendition at least `width` pixels wide (in device pixels),
 * or the largest there is. Reddit's renditions run from 108 px up, so a
 * thumbnail never downloads the full-size original.
 */
export function pick(picture: Picture, width: number): Rendition {
  const fit = picture.renditions.find((r) => r.width >= width);
  return fit ?? (picture.renditions[picture.renditions.length - 1] as Rendition);
}

/** The picture to show for a post in a list or grid: its image, a gallery's first, a poster. */
export function thumbnailOf(media: Media): Picture | null {
  switch (media.kind) {
    case 'image':
      return media.picture;
    case 'gallery':
      return media.items[0]?.picture ?? null;
    case 'video':
      return media.poster;
    case 'link':
      return media.thumbnail;
    default:
      return null;
  }
}

/** Whether a post has something for the image modes to show. */
export function isVisual(media: Media): boolean {
  return media.kind === 'image' || media.kind === 'gallery' || media.kind === 'video';
}
