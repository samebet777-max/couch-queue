import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ShowRow } from '@/components/show-row';
import { Body, Chips, Heading, Notice, Screen } from '@/components/ui';
import { Welcome } from '@/components/welcome';
import { Colors, Spacing } from '@/constants/theme';
import { LISTS, isFor, showKey, type ListName } from '@/lib/household';
import { sortList } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { hasTmdb } from '@/lib/tmdb';
import { useTitles } from '@/lib/use-tmdb';

export default function ShowsScreen() {
  const { ready, household, shows, members, me } = useStore();
  const [list, setList] = useState<ListName>('watching');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const details = useTitles(shows);

  if (!ready) return <Screen>{null}</Screen>;
  if (!household) {
    return (
      <Screen>
        <Welcome />
      </Screen>
    );
  }

  const shared = members.length > 1;
  const mineOnly = shared && scope === 'mine';
  const visible = sortList(
    list,
    shows.filter((s) => s.list === list && (!mineOnly || isFor(s, me?.id))),
    details,
  );

  return (
    <Screen>
      <View style={styles.top}>
        <Heading>{mineOnly ? 'My shows' : 'Our shows'}</Heading>
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

      {shared ? (
        <Chips
          options={[
            { key: 'mine', label: 'Mine' },
            { key: 'all', label: 'Everyone\u2019s' },
          ]}
          value={scope}
          onChange={setScope}
        />
      ) : null}
      <Chips options={LISTS} value={list} onChange={setList} />

      <View style={{ gap: Spacing.two }}>
        {visible.map((s) => (
          <ShowRow key={showKey(s)} saved={s} />
        ))}
        {visible.length === 0 ? (
          <Body muted style={{ paddingVertical: Spacing.five, textAlign: 'center' }}>
            Nothing here yet. Find a show or movie in Search, or move one here from its page.
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
