import { base64, isClientId, readRedirect } from '../oauth';

describe('readRedirect', () => {
  it('takes the code when the state matches', () => {
    expect(readRedirect('perch://oauth/callback?state=s1&code=abc', 's1')).toEqual({
      type: 'code',
      code: 'abc',
    });
  });

  it('refuses a redirect with another state', () => {
    expect(readRedirect('perch://oauth/callback?state=other&code=abc', 's1').type).toBe('error');
  });

  it('tells a refusal from an error', () => {
    expect(readRedirect('perch://oauth/callback?state=s1&error=access_denied', 's1')).toEqual({
      type: 'denied',
    });
    const error = readRedirect('perch://oauth/callback?state=s1&error=invalid_scope', 's1');
    expect(error.type === 'error' && error.message).toMatch(/invalid_scope/);
  });

  it('ignores a fragment Reddit appends', () => {
    expect(readRedirect('perch://oauth/callback?state=s1&code=abc#_', 's1')).toEqual({
      type: 'code',
      code: 'abc',
    });
  });
});

describe('isClientId', () => {
  it.each([
    ['perchwalkthrough01', true],
    ['AbC123xYz-example_', true],
    ['short', false],
    ['has spaces in it here', false],
    ['x'.repeat(31), false],
  ])('%s → %s', (value, valid) => {
    expect(isClientId(value)).toBe(valid);
  });
});

describe('base64', () => {
  it.each([
    ['a:', 'YTo='],
    ['ab:', 'YWI6'],
    ['abc:', 'YWJjOg=='],
    ['perchwalkthrough01:', 'cGVyY2h3YWxrdGhyb3VnaDAxOg=='],
  ])('encodes %s', (text, encoded) => {
    expect(base64(text)).toBe(encoded);
  });
});
