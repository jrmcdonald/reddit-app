import { defaultSort, feedParam, parseFeed, parseSort, sortLabel } from '../feeds';
import { linkTarget } from '../links';

describe('linkTarget', () => {
  it.each([
    ['/r/Example', { kind: 'subreddit', name: 'Example' }],
    ['https://www.reddit.com/r/Example/', { kind: 'subreddit', name: 'Example' }],
    [
      'https://old.reddit.com/r/Example/comments/abc123/some_title/',
      { kind: 'post', id: 'abc123', comment: null },
    ],
    [
      'https://reddit.com/r/Example/comments/abc123/some_title/def456/?context=3',
      { kind: 'post', id: 'abc123', comment: 'def456' },
    ],
    ['https://redd.it/abc123', { kind: 'post', id: 'abc123', comment: null }],
    ['/u/someone', { kind: 'web', url: 'https://www.reddit.com/u/someone' }],
    ['https://example.com/a?b=c', { kind: 'web', url: 'https://example.com/a?b=c' }],
    ['example.com', { kind: 'web', url: 'https://example.com' }],
  ])('%s', (url, target) => expect(linkTarget(url)).toEqual(target));
});

describe('feeds as strings', () => {
  it('round-trips each feed', () => {
    for (const feed of [
      { kind: 'home' },
      { kind: 'popular' },
      { kind: 'subreddit', name: 'Example' },
    ] as const) {
      expect(parseFeed(feedParam(feed))).toEqual(feed);
    }
    expect(parseFeed('r/not a name')).toEqual({ kind: 'popular' });
  });

  it('defaults the sort, and labels top with its period', () => {
    expect(defaultSort({ kind: 'home' })).toBe('best');
    expect(defaultSort({ kind: 'popular' })).toBe('hot');
    expect(parseSort('nonsense', 'hot')).toBe('hot');
    expect(sortLabel('top', 'week')).toBe('Top · This week');
  });
});
