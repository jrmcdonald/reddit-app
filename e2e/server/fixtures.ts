/**
 * The fake Reddit's data: made-up subreddits, posts, comments and an account,
 * in the shapes Reddit's API returns them. Nothing here is real. Every name
 * is invented, and every image is a placeholder the fake server draws.
 *
 * Times are fixed relative to NOW, so ages on screen ("4h") are the same in
 * every run and the approved screenshots stay valid.
 */

/** The client ID the walkthrough types in; the fake refuses any other. */
export const CLIENT_ID = 'perchwalkthrough01';
export const USERNAME = 'perch_tester';
export const AUTH_CODE = 'walkthrough-code';
export const REFRESH_TOKEN = 'walkthrough-refresh-token';
export const USER_TOKEN = 'walkthrough-user-token';
export const ANONYMOUS_TOKEN = 'walkthrough-anonymous-token';

/**
 * "Now" for the fixtures: 2026-10-01 12:00 UTC. The app shows ages against
 * the phone's clock, so the fake server shifts every created_utc by the
 * difference at start-up (see `buildFixtures`).
 */
const FIXED_NOW = Date.UTC(2026, 9, 1, 12) / 1000;
const HOUR = 3600;

type Json = Record<string, unknown>;

interface SubredditSpec {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  nsfw?: boolean;
}

export const SUBREDDITS: SubredditSpec[] = [
  {
    name: 'FogAndFells',
    title: 'Fog and Fells',
    description: 'Mountains, moors and the weather that hides them. Your own photos only.',
    subscribers: 412_800,
  },
  {
    name: 'HistoryQuestions',
    title: 'History Questions',
    description: 'Ask about the past; answers cite their sources.',
    subscribers: 1_204_500,
  },
  {
    name: 'KeyboardBuilds',
    title: 'Keyboard Builds',
    description: 'Show off the keyboard you built, and how you built it.',
    subscribers: 96_300,
  },
  {
    name: 'TinyKitchens',
    title: 'Tiny Kitchens',
    description: 'Cooking well in very little space.',
    subscribers: 238_100,
  },
  {
    name: 'StreetSounds',
    title: 'Street Sounds',
    description: 'Buskers and street musicians, filmed with permission.',
    subscribers: 54_900,
  },
  {
    name: 'LateNightDrawing',
    title: 'Late Night Drawing',
    description: 'Life drawing and figure studies. Marked NSFW.',
    subscribers: 31_200,
    nsfw: true,
  },
  {
    name: 'FilmTalk',
    title: 'Film Talk',
    description: 'Discussion threads for new releases. Spoilers are tagged.',
    subscribers: 2_310_000,
  },
  {
    name: 'CodeAndCoffee',
    title: 'Code and Coffee',
    description: 'Programming links and the occasional rant.',
    subscribers: 187_400,
  },
];

/** The subreddits the fixture account subscribes to. */
const SUBSCRIBED = [
  'FogAndFells',
  'HistoryQuestions',
  'KeyboardBuilds',
  'TinyKitchens',
  'StreetSounds',
  'LateNightDrawing',
  'CodeAndCoffee',
];

type Kind = 'image' | 'gallery' | 'self' | 'link' | 'video';

interface PostSpec {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  hoursAgo: number;
  score: number;
  comments: number;
  kind: Kind;
  body?: string;
  url?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  saved?: boolean;
  stickied?: boolean;
  flair?: string;
  /** Width over height of the picture. */
  aspect?: number;
  galleryCount?: number;
  /** In the popular feed as well as home. */
  popular?: boolean;
  /** Only in popular, from a subreddit the account does not follow. */
  popularOnly?: boolean;
}

export const POSTS: PostSpec[] = [
  {
    id: 'pf001',
    subreddit: 'FogAndFells',
    title: 'Fog rolling over the ridge at sunrise [4032×3024]',
    author: 'hillwalker_88',
    hoursAgo: 4,
    score: 12_400,
    comments: 312,
    kind: 'image',
    aspect: 4 / 3,
    saved: true,
    popular: true,
  },
  {
    id: 'pf002',
    subreddit: 'HistoryQuestions',
    title: 'How did medieval sailors navigate on overcast days?',
    author: 'overcast_navigator',
    hoursAgo: 7,
    score: 3_100,
    comments: 188,
    kind: 'self',
    body: 'I have read about **sunstones** but cannot find a good source on whether they were actually used, or whether that is a modern reconstruction.\n\nWhat did a crew in the North Sea actually do when they could not see the sun or the stars for days?',
    flair: 'Maritime',
    popular: true,
  },
  {
    id: 'pf003',
    subreddit: 'LateNightDrawing',
    title: 'Two-minute charcoal studies from tonight’s session',
    author: 'charcoal_hands',
    hoursAgo: 8,
    score: 864,
    comments: 41,
    kind: 'image',
    aspect: 3 / 4,
    nsfw: true,
  },
  {
    id: 'pf004',
    subreddit: 'KeyboardBuilds',
    title: 'My first build: 65% with a brass plate and lubed linears',
    author: 'brassplate',
    hoursAgo: 9,
    score: 2_200,
    comments: 97,
    kind: 'gallery',
    galleryCount: 6,
    aspect: 3 / 2,
    popular: true,
  },
  {
    id: 'pf005',
    subreddit: 'CodeAndCoffee',
    title: 'What changed for list performance in the latest React Native release',
    author: 'flatlist_fan',
    hoursAgo: 11,
    score: 540,
    comments: 73,
    kind: 'link',
    url: 'https://example.com/blog/list-performance',
    aspect: 16 / 9,
  },
  {
    id: 'pf006',
    subreddit: 'FilmTalk',
    title: 'That final scene: discussion thread',
    author: 'reel_talk',
    hoursAgo: 12,
    score: 6_800,
    comments: 2_400,
    kind: 'image',
    aspect: 16 / 9,
    spoiler: true,
    popular: true,
    popularOnly: true,
  },
  {
    id: 'pf007',
    subreddit: 'TinyKitchens',
    title: 'Weeknight ragù on a two-ring hob',
    author: 'slowbraise',
    hoursAgo: 14,
    score: 1_900,
    comments: 120,
    kind: 'image',
    aspect: 1,
    saved: true,
  },
  {
    id: 'pf008',
    subreddit: 'StreetSounds',
    title: 'Cellist under the railway arches, Saturday morning',
    author: 'arches_audio',
    hoursAgo: 16,
    score: 4_300,
    comments: 156,
    kind: 'video',
    aspect: 16 / 9,
    popular: true,
  },
  {
    id: 'pf009',
    subreddit: 'FogAndFells',
    title: 'Cloud inversion from the summit, looking north',
    author: 'inversion_ian',
    hoursAgo: 19,
    score: 8_700,
    comments: 204,
    kind: 'image',
    aspect: 3 / 2,
  },
  {
    id: 'pf010',
    subreddit: 'HistoryQuestions',
    title: 'Why did the Hanseatic League decline?',
    author: 'cog_and_kogge',
    hoursAgo: 22,
    score: 2_600,
    comments: 95,
    kind: 'self',
    body: 'Was it the Dutch, the Swedes, or the herring moving?',
    saved: true,
  },
  {
    id: 'pf011',
    subreddit: 'KeyboardBuilds',
    title: 'Hand-wired macro pad from scrap walnut',
    author: 'walnut_keys',
    hoursAgo: 26,
    score: 1_100,
    comments: 48,
    kind: 'image',
    aspect: 4 / 5,
  },
  {
    id: 'pf012',
    subreddit: 'TinyKitchens',
    title: 'Pinned: share your kitchen, read the rules first',
    author: 'TinyKitchensMod',
    hoursAgo: 120,
    score: 310,
    comments: 22,
    kind: 'self',
    body: 'Photos of **your own** kitchen only. Measurements welcome.',
    stickied: true,
  },
  {
    id: 'pf013',
    subreddit: 'FogAndFells',
    title: 'The lake was perfectly still this morning',
    author: 'mirror_water',
    hoursAgo: 30,
    score: 5_200,
    comments: 88,
    kind: 'image',
    aspect: 4 / 3,
  },
  {
    id: 'pf014',
    subreddit: 'TinyKitchens',
    title: 'Fold-down table that doubles as a chopping board',
    author: 'fold_flat',
    hoursAgo: 34,
    score: 2_900,
    comments: 140,
    kind: 'image',
    aspect: 3 / 4,
    popular: true,
  },
];

/** A comment, with replies, in Reddit's shape. */
interface CommentSpec {
  id: string;
  author: string;
  hoursAgo: number;
  score: number;
  body: string;
  op?: boolean;
  flair?: string;
  saved?: boolean;
  replies?: CommentSpec[];
  /** Ids of further replies left behind a "load more" placeholder. */
  more?: string[];
}

const THREADS: Record<string, CommentSpec[]> = {
  pf002: [
    {
      id: 'c201',
      author: 'hanseatic_ledger',
      flair: 'Medieval trade',
      hoursAgo: 6,
      score: 2_400,
      body: 'Mostly by *dead reckoning*: speed, heading and time, kept in the pilot’s head rather than on a chart.\n\nSoundings mattered just as much: a lead line armed with tallow brought up sand or shell from the seabed, and an experienced pilot knew the bottom of the North Sea the way you know your own street.',
      saved: true,
      replies: [
        {
          id: 'c202',
          author: 'overcast_navigator',
          op: true,
          hoursAgo: 5,
          score: 310,
          body: 'That is fascinating. So the seabed itself was the map?',
          replies: [
            {
              id: 'c203',
              author: 'hanseatic_ledger',
              flair: 'Medieval trade',
              hoursAgo: 5,
              score: 402,
              body: 'Close to it. Written sailing directions from the fifteenth century list depths and bottom types along whole coasts.',
            },
          ],
        },
        {
          id: 'c204',
          author: 'fjordwatch',
          hoursAgo: 4,
          score: 88,
          body: 'Birds and whales too: the sagas mention both as signs of land.',
          more: ['c205', 'c206'],
        },
      ],
    },
    {
      id: 'c207',
      author: 'sunstone_skeptic',
      hoursAgo: 3,
      score: 640,
      body: 'On sunstones: there is one find from a sixteenth-century wreck, and some lab work showing calcite could do the job, but nothing that shows routine use. See r/HistoryQuestions’s FAQ.',
    },
  ],
};

/** The comments behind c204's "load more", as /api/morechildren returns them. */
const MORE_CHILDREN: Record<string, CommentSpec & { parent: string }> = {
  c205: {
    id: 'c205',
    parent: 't1_c204',
    author: 'saga_reader',
    hoursAgo: 3,
    score: 41,
    body: 'The Landnámabók has a sailing direction that uses whales off Iceland as a waymark.',
  },
  c206: {
    id: 'c206',
    parent: 't1_c204',
    author: 'tern_counter',
    hoursAgo: 2,
    score: 19,
    body: 'Seabirds heading home at dusk point to land. Fishermen still use it.',
  },
};

export interface Fixtures {
  me: Json;
  feed(kind: 'home' | 'popular' | string): Json;
  thread(id: string): unknown[] | null;
  moreChildren(postId: string, children: string[]): Json;
  saved(type: string | null): Json;
  subscriptions: Json;
  searchSubreddits(query: string): Json;
  about(name: string): Json | null;
  /** Image paths the fixtures hand out, to check each is served. */
  imagePaths(): string[];
}

/** Renditions Reddit makes of a picture, by width. */
const WIDTHS = [108, 216, 320, 640, 960];
const SOURCE_WIDTH = 1080;

export function buildFixtures(origin: string, now: number = Date.now() / 1000): Fixtures {
  // Ages stay as written ("4h ago") whatever day the walkthrough runs.
  const shift = now - FIXED_NOW;
  const created = (hoursAgo: number) => Math.round(FIXED_NOW - hoursAgo * HOUR + shift);

  const imagePaths = new Set<string>();
  const image = (key: string, aspect: number) => {
    const rendition = (width: number) => {
      const height = Math.round(width / aspect);
      const path = `/media/${key}/${width}x${height}.png`;
      imagePaths.add(path);
      return { url: `${origin}${path}`, width, height };
    };
    return { source: rendition(SOURCE_WIDTH), resolutions: WIDTHS.map(rendition) };
  };

  const postJson = (spec: PostSpec): Json => {
    const aspect = spec.aspect ?? 4 / 3;
    const base: Json = {
      id: spec.id,
      name: `t3_${spec.id}`,
      title: spec.title,
      subreddit: spec.subreddit,
      subreddit_name_prefixed: `r/${spec.subreddit}`,
      author: spec.author,
      created_utc: created(spec.hoursAgo),
      score: spec.score,
      num_comments: spec.comments,
      upvote_ratio: 0.96,
      over_18: !!spec.nsfw,
      spoiler: !!spec.spoiler,
      saved: !!spec.saved,
      stickied: !!spec.stickied,
      locked: false,
      link_flair_text: spec.flair ?? null,
      permalink: `/r/${spec.subreddit}/comments/${spec.id}/fixture/`,
      is_self: spec.kind === 'self',
      selftext: spec.body ?? '',
      is_video: spec.kind === 'video',
      domain: spec.kind === 'self' ? `self.${spec.subreddit}` : 'i.redd.it',
      url: `${origin}/media/${spec.id}/${SOURCE_WIDTH}.png`,
      thumbnail: spec.kind === 'self' ? 'self' : 'image',
      media: null,
      preview: null,
    };
    switch (spec.kind) {
      case 'image':
        return {
          ...base,
          post_hint: 'image',
          preview: { images: [image(spec.id, aspect)], enabled: true },
        };
      case 'gallery': {
        const count = spec.galleryCount ?? 3;
        const ids = Array.from({ length: count }, (_, i) => `${spec.id}g${i + 1}`);
        const metadata: Json = {};
        for (const mediaId of ids) {
          const pic = image(mediaId, aspect);
          metadata[mediaId] = {
            status: 'valid',
            e: 'Image',
            m: 'image/png',
            s: { u: pic.source.url, x: pic.source.width, y: pic.source.height },
            p: pic.resolutions.map((r) => ({ u: r.url, x: r.width, y: r.height })),
          };
        }
        return {
          ...base,
          is_gallery: true,
          url: `https://www.reddit.com/gallery/${spec.id}`,
          domain: 'reddit.com',
          gallery_data: {
            items: ids.map((mediaId, i) => ({
              media_id: mediaId,
              id: i + 1,
              caption: i === 0 ? 'Finished, on the desk' : null,
            })),
          },
          media_metadata: metadata,
        };
      }
      case 'video':
        return {
          ...base,
          post_hint: 'hosted:video',
          domain: 'v.redd.it',
          url: `${origin}/video/${spec.id}`,
          preview: { images: [image(spec.id, aspect)], enabled: false },
          media: {
            reddit_video: {
              // The fake serves no video: the app shows the poster and a
              // player that does not start, which the walkthrough never plays.
              hls_url: `${origin}/video/${spec.id}/HLSPlaylist.m3u8`,
              fallback_url: `${origin}/video/${spec.id}/CMAF_720.mp4`,
              width: 1280,
              height: 720,
              duration: 42,
              is_gif: false,
            },
          },
        };
      case 'link':
        return {
          ...base,
          post_hint: 'link',
          url: spec.url ?? 'https://example.com/',
          domain: 'example.com',
          preview: { images: [image(spec.id, aspect)], enabled: false },
        };
      case 'self':
        return base;
    }
  };

  const listing = (children: Json[], after: string | null = null): Json => ({
    kind: 'Listing',
    data: { after, before: null, dist: children.length, children },
  });
  const t3 = (spec: PostSpec) => ({ kind: 't3', data: postJson(spec) });

  const commentJson = (spec: CommentSpec, depth: number, postId: string, parent: string): Json => {
    const children: Json[] = (spec.replies ?? []).map((reply) => ({
      kind: 't1',
      data: commentJson(reply, depth + 1, postId, `t1_${spec.id}`),
    }));
    if (spec.more?.length) {
      children.push({
        kind: 'more',
        data: {
          id: spec.more[0],
          name: `t1_${spec.more[0]}`,
          count: spec.more.length,
          children: spec.more,
          depth: depth + 1,
          parent_id: `t1_${spec.id}`,
        },
      });
    }
    return {
      id: spec.id,
      name: `t1_${spec.id}`,
      author: spec.author,
      body: spec.body,
      score: spec.score,
      score_hidden: false,
      created_utc: created(spec.hoursAgo),
      depth,
      is_submitter: !!spec.op,
      distinguished: null,
      author_flair_text: spec.flair ?? null,
      saved: !!spec.saved,
      stickied: false,
      collapsed: false,
      parent_id: parent,
      link_id: `t3_${postId}`,
      permalink: `/r/fixture/comments/${postId}/fixture/${spec.id}/`,
      replies: children.length ? listing(children) : '',
    };
  };

  const subredditJson = (spec: SubredditSpec): Json => ({
    name: `t5_${spec.name.toLowerCase()}`,
    display_name: spec.name,
    display_name_prefixed: `r/${spec.name}`,
    title: spec.title,
    public_description: spec.description,
    subscribers: spec.subscribers,
    over18: !!spec.nsfw,
    icon_img: `${origin}/icons/${spec.name}.png`,
    community_icon: '',
    user_is_subscriber: SUBSCRIBED.includes(spec.name),
    subreddit_type: 'public',
  });
  for (const spec of SUBREDDITS) imagePaths.add(`/icons/${spec.name}.png`);

  const findPost = (id: string) => POSTS.find((p) => p.id === id);

  // The saved comment, as Reddit lists it, with its post's title.
  const savedComment = (() => {
    const post = findPost('pf002') as PostSpec;
    const spec = (THREADS.pf002 ?? [])[0] as CommentSpec;
    return {
      kind: 't1',
      data: {
        ...commentJson({ ...spec, replies: [], more: [] }, 0, post.id, `t3_${post.id}`),
        link_title: post.title,
        subreddit: post.subreddit,
      },
    };
  })();

  return {
    me: { name: USERNAME, icon_img: `${origin}/icons/me.png`, over_18: true },
    feed(kind) {
      if (kind === 'home') {
        return listing(
          POSTS.filter((p) => !p.popularOnly && SUBSCRIBED.includes(p.subreddit))
            .sort((a, b) => Number(!!b.stickied) - Number(!!a.stickied))
            .map(t3),
        );
      }
      if (kind === 'popular') return listing(POSTS.filter((p) => p.popular).map(t3));
      const name = kind.toLowerCase();
      return listing(
        POSTS.filter((p) => p.subreddit.toLowerCase() === name)
          .sort((a, b) => Number(!!b.stickied) - Number(!!a.stickied))
          .map(t3),
      );
    },
    thread(id) {
      const post = findPost(id);
      if (!post) return null;
      const comments = (THREADS[id] ?? []).map((spec) => ({
        kind: 't1',
        data: commentJson(spec, 0, id, `t3_${id}`),
      }));
      return [listing([t3(post)]), listing(comments)];
    },
    moreChildren(postId, children) {
      const things = children
        .map((id) => MORE_CHILDREN[id])
        .filter((spec): spec is CommentSpec & { parent: string } => !!spec)
        .map((spec) => ({ kind: 't1', data: commentJson(spec, 2, postId, spec.parent) }));
      return { json: { errors: [], data: { things } } };
    },
    saved(type) {
      const posts = POSTS.filter((p) => p.saved).map(t3);
      if (type === 'links') return listing(posts);
      if (type === 'comments') return listing([savedComment]);
      return listing([...posts, savedComment]);
    },
    subscriptions: listing(
      SUBREDDITS.filter((s) => SUBSCRIBED.includes(s.name)).map((s) => ({
        kind: 't5',
        data: subredditJson(s),
      })),
    ),
    searchSubreddits(query) {
      const q = query.toLowerCase();
      return listing(
        SUBREDDITS.filter(
          (s) => s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q),
        ).map((s) => ({ kind: 't5', data: subredditJson(s) })),
      );
    },
    about(name) {
      const spec = SUBREDDITS.find((s) => s.name.toLowerCase() === name.toLowerCase());
      return spec ? { kind: 't5', data: subredditJson(spec) } : null;
    },
    imagePaths: () => [...imagePaths],
  };
}
