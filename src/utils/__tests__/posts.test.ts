import { RawPostSchema } from '@/api/schemas';

import { isVisual, pick, thumbnailOf, toPost } from '../posts';

const base = {
  id: 'abc',
  name: 't3_abc',
  title: 'A post',
  subreddit: 'Example',
  author: 'someone',
  created_utc: 1_700_000_000,
  permalink: '/r/Example/comments/abc/a_post/',
};

const image = (w: number, h: number) => ({
  url: `https://i.example.com/${w}.jpg`,
  width: w,
  height: h,
});

function post(extra: Record<string, unknown>) {
  return toPost(RawPostSchema.parse({ ...base, ...extra }));
}

describe('toPost', () => {
  it('reads a text post, with defaults for what Reddit left out', () => {
    const p = post({ is_self: true, selftext: 'Hello' });
    expect(p).toMatchObject({ body: 'Hello', score: 0, comments: 0, nsfw: false, saved: false });
    expect(p.media).toEqual({ kind: 'none' });
  });

  it('reads an image post from its preview, smallest rendition first', () => {
    const p = post({
      post_hint: 'image',
      url: 'https://i.example.com/full.jpg',
      preview: {
        images: [{ source: image(1080, 810), resolutions: [image(640, 480), image(108, 81)] }],
      },
    });
    expect(p.media.kind).toBe('image');
    const picture = thumbnailOf(p.media);
    expect(picture?.renditions.map((r) => r.width)).toEqual([108, 640, 1080]);
    expect(picture?.aspect).toBeCloseTo(4 / 3);
    expect(picture && pick(picture, 300).width).toBe(640);
    expect(picture && pick(picture, 2000).width).toBe(1080);
  });

  it('reads a gallery in its order, skipping images Reddit failed to process', () => {
    const p = post({
      is_gallery: true,
      gallery_data: {
        items: [{ media_id: 'b', caption: 'Second' }, { media_id: 'x' }, { media_id: 'a' }],
      },
      media_metadata: {
        a: { status: 'valid', s: { u: 'https://i.example.com/a.jpg', x: 800, y: 600 }, p: [] },
        b: { status: 'valid', s: { u: 'https://i.example.com/b.jpg', x: 600, y: 800 }, p: [] },
        x: { status: 'failed' },
      },
    });
    expect(p.media.kind === 'gallery' && p.media.items.map((i) => i.caption)).toEqual([
      'Second',
      null,
    ]);
  });

  it('reads a Reddit video, and a GIF converted to video', () => {
    const video = post({
      is_video: true,
      media: {
        reddit_video: {
          hls_url: 'https://v.example.com/hls.m3u8',
          width: 1280,
          height: 720,
          duration: 42,
        },
      },
    });
    expect(video.media.kind === 'video' && video.media.clip).toMatchObject({
      gif: false,
      duration: 42,
    });
    const gif = post({
      url: 'https://i.example.com/a.gif',
      preview: {
        images: [{ source: image(400, 300), resolutions: [] }],
        reddit_video_preview: {
          fallback_url: 'https://v.example.com/gif.mp4',
          width: 400,
          height: 300,
          is_gif: true,
        },
      },
    });
    expect(gif.media.kind === 'video' && gif.media.clip.gif).toBe(true);
    expect(isVisual(gif.media)).toBe(true);
  });

  it('reads a link with its domain and thumbnail', () => {
    const p = post({
      url: 'https://www.example.org/article',
      preview: { images: [{ source: image(1200, 630), resolutions: [] }] },
    });
    expect(p.media).toMatchObject({ kind: 'link', domain: 'example.org' });
    expect(isVisual(p.media)).toBe(false);
  });

  it('takes a crosspost’s media from its original', () => {
    const p = post({
      url: '/r/Other/comments/zzz/original/',
      crosspost_parent_list: [
        {
          ...base,
          id: 'zzz',
          name: 't3_zzz',
          post_hint: 'image',
          url: 'https://i.example.com/x.jpg',
          preview: { images: [{ source: image(1000, 1000), resolutions: [] }] },
        },
      ],
    });
    expect(p.media.kind).toBe('image');
  });
});
