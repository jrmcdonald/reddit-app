import { DEFAULTS, parsePreferences, viewFor } from '../preferences';

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
