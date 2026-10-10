/**
 * Stand-ins for native modules and views that have no JavaScript version, so
 * tests can load the code and render screens that use them.
 */

// SF Symbols are drawn natively; in tests an icon is a plain view carrying
// the same accessibility props, so tests still see what VoiceOver would.
jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: View };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
