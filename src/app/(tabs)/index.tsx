import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ShowRow } from '@/components/show-row';
import { Body, Chips, Heading, Notice, Screen } from '@/components/ui';
import { Welcome } from '@/components/welcome';
import { Colors, Spacing } from '@/constants/theme';
import { LISTS, ownerOf, showKey, type ListName } from '@/lib/household';
import { sortList } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { hasTmdb } from '@/lib/tmdb';
import { useTitles } from '@/lib/use-tmdb';

export default function ShowsScreen() {
  const { ready, household, shows, members, me } = useStore();
  const [list, setList] = useState<ListName>('watching');
  // 'us' for shared shows, or a member id for shows only that person is on.
  const [scope, setScope] = useState<string>('us');
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
  // If the chosen person has left the list, fall back to shared shows.
  const view = shared && (scope === 'us' || members.some((m) => m.id === scope)) ? scope : 'us';
  const visible = sortList(
    list,
    shows.filter((s) => s.list === list && (!shared || ownerOf(s, members) === view)),
    details,
  );
  const others = members.filter((m) => m.id !== me?.id);
  // Each button shows how many shows it holds on the current list, so an empty one isn't a surprise.
  const count = (key: string) => shows.filter((s) => s.list === list && ownerOf(s, members) === key).length;
  const scopes = [
    ...(me ? [{ key: me.id, label: `Just me (${count(me.id)})` }] : []),
    { key: 'us', label: `${members.length > 2 ? 'All of us' : 'Both of us'} (${count('us')})` },
    ...others.map((m) => ({ key: m.id, label: `${m.name} (${count(m.id)})` })),
  ];
  const heading = !shared || view === 'us' ? 'Our shows' : view === me?.id ? 'My shows' : `${members.find((m) => m.id === view)?.name}’s shows`;

  return (
    <Screen>
      <View style={styles.top}>
        <Heading>{heading}</Heading>
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
        <Chips options={scopes} value={view} onChange={setScope} />
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
