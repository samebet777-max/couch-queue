import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { isFor, type SavedShow } from '@/lib/household';
import { nextSeason } from '@/lib/next-season';
import { useStore } from '@/lib/store';
import { networkLabel, realSeasons } from '@/lib/tmdb';
import { useShow } from '@/lib/use-tmdb';

import { Pill, Poster, ProgressBar } from './ui';

export function ShowRow({ saved }: { saved: SavedShow }) {
  const { members, seasonsWatched } = useStore();
  const { data: show, error } = useShow(saved.id);
  const seasonCount = show ? realSeasons(show).filter((s) => s.air_date && new Date(s.air_date) <= new Date()).length : 0;
  const status = show ? nextSeason(show) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/show/[id]', params: { id: String(saved.id) } })}
      style={styles.row}>
        <Poster path={show?.poster_path ?? saved.posterPath} id={saved.id} width={72} size="w185" />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {saved.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {show ? `${networkLabel(show)} · ${seasonCount} season${seasonCount === 1 ? '' : 's'}` : error ? 'Show details unavailable' : ' '}
          </Text>
          {saved.newEpisodes ? (
            <Text style={styles.fresh}>New episodes!</Text>
          ) : status ? (
            <Pill tone={status.tone}>{status.label}</Pill>
          ) : null}
          {seasonCount > 0 && members.length > 0 ? (
            <View style={{ gap: 3, marginTop: 2 }}>
              {members.map((m, i) =>
                isFor(saved, m.id) ? (
                  <ProgressBar
                    key={m.id}
                    initial={m.name.slice(0, 1).toUpperCase()}
                    color={Colors.members[i % Colors.members.length]}
                    value={seasonsWatched(saved.id, m.id) / seasonCount}
                  />
                ) : null,
              )}
            </View>
          ) : null}
        </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.cushion,
    alignItems: 'center',
  },
  meta: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontWeight: '700', fontSize: 16, color: Colors.text },
  sub: { color: Colors.muted, fontSize: 12 },
  fresh: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.lamp,
    color: Colors.lampInk,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    overflow: 'hidden',
  },
});
