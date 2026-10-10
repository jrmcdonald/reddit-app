import { useNetInfo } from '@react-native-community/netinfo';

import { usePreferences } from '@/settings/preferences';

/** Whether videos should start by themselves: Settings, and on Wi-Fi only, the network. */
export function useAutoplay(): boolean {
  const { autoplay } = usePreferences();
  const net = useNetInfo();
  if (autoplay === 'always') return true;
  if (autoplay === 'never') return false;
  return net.type === 'wifi' || net.type === 'ethernet';
}
