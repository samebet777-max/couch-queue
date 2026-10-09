// Web preview only (the phones use native iOS tabs from _layout.tsx).
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={styles.tab}>
      <Text style={[styles.label, isFocused && { color: Colors.lamp, fontWeight: '700' }]}>{children}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={styles.bar}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Shows</TabButton>
          </TabTrigger>
          <TabTrigger name="news" href="/news" asChild>
            <TabButton>News</TabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>Search</TabButton>
          </TabTrigger>
          <TabTrigger name="us" href="/us" asChild>
            <TabButton>Us</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.sofa,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingVertical: 12,
  },
  tab: { paddingHorizontal: 12, paddingVertical: 4 },
  label: { color: Colors.muted, fontSize: 13 },
});
