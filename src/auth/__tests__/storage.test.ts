import { parseStored } from '../storage';

const account = { refreshToken: 'r', username: 'someone', cacheId: 'c' };
const stored = {
  clientId: 'perchwalkthrough01',
  deviceId: 'abcdef0123456789abcdef01',
  account,
  mode: 'user',
};

describe('parseStored', () => {
  it('reads what was saved', () => {
    expect(parseStored(JSON.stringify(stored))).toEqual(stored);
  });

  it('drops a damaged item rather than crash', () => {
    expect(parseStored('not json')).toBeNull();
    expect(parseStored(JSON.stringify({ ...stored, deviceId: 'short' }))).toBeNull();
    expect(parseStored(null)).toBeNull();
  });

  it('falls back to choosing when signed in has no account', () => {
    expect(parseStored(JSON.stringify({ ...stored, account: null }))?.mode).toBeNull();
  });
});
