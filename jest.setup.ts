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

// Gestures and animations run natively; their own mocks render the views and
// accept the gestures without running them.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () =>
  jest.requireActual('react-native-worklets/lib/module/mock'),
);
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

// The library's own mock, a default export: zero insets outside a provider.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
