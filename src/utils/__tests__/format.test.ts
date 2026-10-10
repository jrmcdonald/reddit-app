import { age, ageSpoken, compact, plural } from '../format';

describe('compact', () => {
  it.each([
    [0, '0'],
    [940, '940'],
    [1000, '1k'],
    [1250, '1.3k'],
    [12_400, '12k'],
    [1_400_000, '1.4M'],
    [-2500, '-2.5k'],
  ])('%s → %s', (n, text) => expect(compact(n)).toBe(text));
});

describe('age', () => {
  const now = 1_700_000_000_000;
  const ago = (seconds: number) => now / 1000 - seconds;
  it.each([
    [10, 'now', 'just now'],
    [5 * 60, '5m', '5 minutes ago'],
    [4 * 3600, '4h', '4 hours ago'],
    [3 * 86400, '3d', '3 days ago'],
    [14 * 86400, '2w', '2 weeks ago'],
    [90 * 86400, '3mo', '3 months ago'],
    [800 * 86400, '2y', '2 years ago'],
  ])('%s seconds ago → %s', (seconds, short, spoken) => {
    expect(age(ago(seconds), now)).toBe(short);
    expect(ageSpoken(ago(seconds), now)).toBe(spoken);
  });

  it('says one, not ones', () => {
    expect(ageSpoken(now / 1000 - 3600, now)).toBe('1 hour ago');
    expect(plural(1, 'comment')).toBe('1 comment');
    expect(plural(2400, 'reply', 'replies')).toBe('2.4k replies');
  });
});
