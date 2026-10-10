import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useReadySession } from '@/session/session';
import { useColors } from '@/theme';

/**
 * Home and Saved need an account, so anonymous mode leaves them out of the
 * tab bar. The tabs open on the first one listed, so there Popular comes
 * first, ahead of the hidden Home.
 */
export default function TabLayout() {
  const colors = useColors();
  const session = useReadySession();
  const anonymous = session.mode === 'anonymous';
  const popular = (
    <NativeTabs.Trigger name="popular">
      <NativeTabs.Trigger.Label>Popular</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
    </NativeTabs.Trigger>
  );
  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.accent },
      }}>
      {anonymous ? popular : null}
      <NativeTabs.Trigger name="home" hidden={anonymous}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      {anonymous ? null : popular}
      <NativeTabs.Trigger name="browse">
        <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved" hidden={anonymous}>
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
