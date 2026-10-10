import type { Feed } from '@/api/endpoints';

import { hasWord, isMuted, subredditKey, visiblePosts, type Filters } from '../mute';
import type { Post } from '../posts';

function post(id: string, extra: Partial<Post> = {}): Post {
  return {
    id,
    fullname: `t3_${id}`,
    title: 'A post',
    subreddit: 'Example',
    author: 'someone',
    createdUtc: 1_700_000_000,
    score: 1,
    comments: 0,
    upvoteRatio: null,
    nsfw: false,
    spoiler: false,
    saved: false,
    stickied: false,
    locked: false,
    removed: false,
    flair: null,
    body: '',
    permalink: `/r/Example/comments/${id}/`,
    media: { kind: 'none' },
    ...extra,
  };
}

const none: Filters = { showNsfw: true, mutedSubreddits: [], mutedWords: [] };
const home: Feed = { kind: 'home' };

describe('hasWord', () => {
  it('matches whole words and phrases, whatever the case', () => {
    expect(hasWord('Cat pictures', 'cat')).toBe(true);
    expect(hasWord('look at my CAT!', 'cat')).toBe(true);
    expect(hasWord('How to concatenate strings', 'cat')).toBe(false);
    expect(hasWord('cats', 'cat')).toBe(false);
    expect(hasWord('The  new   season starts', 'new season')).toBe(true);
    expect(hasWord('Señor café', 'CAFÉ')).toBe(true);
    expect(hasWord('anything', '   ')).toBe(false);
  });

  it('matches a word ending in punctuation at that edge as is', () => {
    expect(hasWord('Learning C++ today', 'c++')).toBe(true);
    expect(hasWord('C++20 ranges', 'c++')).toBe(true);
    expect(hasWord('ABC++', 'c++')).toBe(false);
  });

  it('finds a later whole-word match after an earlier partial one', () => {
    expect(hasWord('concatenate the cat', 'cat')).toBe(true);
  });
});

describe('isMuted', () => {
  const filters: Filters = { ...none, mutedSubreddits: ['r/Example '], mutedWords: ['spoilers'] };

  it('leaves a muted subreddit out of Home and Popular, not out of itself', () => {
    expect(isMuted(post('a'), home, filters)).toBe(true);
    expect(isMuted(post('a'), { kind: 'popular' }, filters)).toBe(true);
    expect(isMuted(post('a'), { kind: 'subreddit', name: 'example' }, filters)).toBe(false);
    expect(isMuted(post('a', { subreddit: 'Other' }), home, filters)).toBe(false);
  });

  it('mutes words in titles and flair everywhere', () => {
    const subreddit: Feed = { kind: 'subreddit', name: 'Other' };
    const other = { subreddit: 'Other' };
    expect(
      isMuted(post('a', { ...other, title: 'Finale spoilers inside' }), subreddit, filters),
    ).toBe(true);
    expect(isMuted(post('a', { ...other, flair: 'Spoilers' }), subreddit, filters)).toBe(true);
    expect(isMuted(post('a', { ...other, body: 'spoilers' }), subreddit, filters)).toBe(false);
  });

  it('compares subreddit names without case or r/', () => {
    expect(subredditKey(' /r/AskHistorians')).toBe('askhistorians');
  });
});

describe('visiblePosts', () => {
  it('shows each post once, without hidden NSFW, muted or, for images, text posts', () => {
    const picture = {
      renditions: [{ url: 'https://i.example.com/a.jpg', width: 1, height: 1 }],
      aspect: 1,
    };
    const pages = [
      { items: [post('a'), post('b', { nsfw: true }), post('c', { title: 'Muted word' })] },
      { items: [post('a'), post('d', { media: { kind: 'image', picture } })] },
    ];
    const filters: Filters = { showNsfw: false, mutedSubreddits: [], mutedWords: ['muted'] };
    expect(visiblePosts(pages, home, filters).map((p) => p.id)).toEqual(['a', 'd']);
    expect(visiblePosts(pages, home, filters, { visualOnly: true }).map((p) => p.id)).toEqual([
      'd',
    ]);
    expect(visiblePosts(pages, home, none).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
