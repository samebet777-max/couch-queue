import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={Colors.lamp} backgroundColor={Colors.sofa} iconColor={Colors.muted}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Shows</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tv', selected: 'tv.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="news">
        <NativeTabs.Trigger.Label>News</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="us">
        <NativeTabs.Trigger.Label>Us</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
