import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ShowRow } from '@/components/show-row';
import { Body, Chips, Heading, Notice, Screen } from '@/components/ui';
import { Welcome } from '@/components/welcome';
import { Colors, Spacing } from '@/constants/theme';
import { LISTS, type ListName } from '@/lib/household';
import { useStore } from '@/lib/store';
import { hasTmdb } from '@/lib/tmdb';

export default function ShowsScreen() {
  const { ready, household, shows, members } = useStore();
  const [list, setList] = useState<ListName>('watching');

  if (!ready) return <Screen>{null}</Screen>;
  if (!household) {
    return (
      <Screen>
        <Welcome />
      </Screen>
    );
  }

  const visible = shows.filter((s) => s.list === list);

  return (
    <Screen>
      <View style={styles.top}>
        <Heading>Our shows</Heading>
        <View style={styles.avatars}>
          {members.map((m, i) => (
            <View key={m.id} style={[styles.avatar, { backgroundColor: Colors.members[i % Colors.members.length] }, i > 0 && { marginLeft: -8 }]}>
              <Text style={styles.avatarText}>{m.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      {!hasTmdb ? (
        <Notice title="Show details aren't connected yet">
          Posters, seasons and news come from TMDB. Add the free TMDB token to this copy of the app to load them.
        </Notice>
      ) : null}

      <Chips options={LISTS} value={list} onChange={setList} />

      <View style={{ gap: Spacing.two }}>
        {visible.map((s) => (
          <ShowRow key={s.id} saved={s} />
        ))}
        {visible.length === 0 ? (
          <Body muted style={{ paddingVertical: Spacing.five, textAlign: 'center' }}>
            Nothing here yet. Find a show in Search, or move one here from its page.
          </Body>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.night,
  },
  avatarText: { fontWeight: '700', color: Colors.night },
});
