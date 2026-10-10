import {
  addMutedWord,
  DEFAULTS,
  getPreferences,
  isSubredditMuted,
  parsePreferences,
  removeMutedWord,
  setSubredditMuted,
  updatePreferences,
  viewFor,
} from '../preferences';

describe('preferences', () => {
  it('starts from defaults that cover NSFW and spoilers', () => {
    expect(DEFAULTS).toMatchObject({
      theme: 'system',
      showNsfw: true,
      coverNsfw: true,
      coverSpoilers: true,
      defaultView: 'list',
    });
  });

  it('keeps every valid setting from a stored value, and defaults the rest', () => {
    const parsed = parsePreferences(
      JSON.stringify({ theme: 'dark', defaultView: 'swiper', coverNsfw: false }),
    );
    expect(parsed).toMatchObject({
      theme: 'dark',
      defaultView: 'list',
      coverNsfw: false,
      coverSpoilers: true,
    });
    expect(parsePreferences('{')).toEqual(DEFAULTS);
  });

  it('gives each feed its own view, or the default', () => {
    const prefs = {
      ...DEFAULTS,
      defaultView: 'cards' as const,
      feedViews: { 'r/example': 'grid' as const },
    };
    expect(viewFor(prefs, 'r/example')).toBe('grid');
    expect(viewFor(prefs, 'home')).toBe('cards');
  });
});

describe('muting', () => {
  beforeEach(() => updatePreferences({ mutedWords: [], mutedSubreddits: [] }));

  it('adds a word once, in one form, and removes it whatever its case', () => {
    expect(addMutedWord('  New   season ')).toBe(true);
    expect(addMutedWord('new season')).toBe(false);
    expect(addMutedWord('   ')).toBe(false);
    expect(getPreferences().mutedWords).toEqual(['New season']);
    removeMutedWord('NEW SEASON');
    expect(getPreferences().mutedWords).toEqual([]);
  });

  it('mutes a subreddit once whatever its case, and unmutes it', () => {
    setSubredditMuted('r/AskHistorians', true);
    setSubredditMuted('askhistorians', true);
    expect(getPreferences().mutedSubreddits).toEqual(['askhistorians']);
    expect(isSubredditMuted(getPreferences(), 'AskHistorians')).toBe(true);
    setSubredditMuted('ASKHISTORIANS', false);
    expect(isSubredditMuted(getPreferences(), 'AskHistorians')).toBe(false);
  });

  it('keeps stored mutes, and drops a stored value that is not a list', () => {
    expect(parsePreferences(JSON.stringify({ mutedWords: ['cats'] })).mutedWords).toEqual(['cats']);
    expect(parsePreferences(JSON.stringify({ mutedWords: 'cats' })).mutedWords).toEqual([]);
  });
});
