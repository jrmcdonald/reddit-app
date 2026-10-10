import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearOpened, isOpened, markOpened, MAX_OPENED, parseOpened } from '../opened';

describe('opened posts', () => {
  beforeEach(() => clearOpened());

  it('remembers a post once opened, and stores it', async () => {
    expect(isOpened('abc')).toBe(false);
    markOpened('abc');
    expect(isOpened('abc')).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('perch.opened.v1')) ?? '[]')).toEqual(['abc']);
  });

  it('forgets the oldest first, and counts a post opened again as new', () => {
    for (let i = 0; i < MAX_OPENED; i++) markOpened(`p${i}`);
    markOpened('p0');
    markOpened('extra');
    expect(isOpened('p0')).toBe(true);
    expect(isOpened('p1')).toBe(false);
    expect(isOpened('p2')).toBe(true);
    expect(isOpened('extra')).toBe(true);
  });

  it('reads back only a list of ids', () => {
    expect([...parseOpened('["a", 2, "b"]')]).toEqual(['a', 'b']);
    expect(parseOpened('{"a": 1}').size).toBe(0);
    expect(parseOpened('not json').size).toBe(0);
    expect(parseOpened(null).size).toBe(0);
  });
});
