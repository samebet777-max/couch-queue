import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Heading, Loading, Notice, Poster, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { hasTmdb, searchShows, type TmdbSearchResult } from '@/lib/tmdb';

export default function SearchScreen() {
  const { household, shows, addShow } = useStore();
  const [query, setQuery] = useState('');
  // Results remember which query they answer, so stale ones never show.
  const [answer, setAnswer] = useState<{ q: string; results: TmdbSearchResult[]; error: string }>({
    q: '',
    results: [],
    error: '',
  });
  const q = query.trim();
  const searchable = hasTmdb && q.length >= 2;

  useEffect(() => {
    if (!searchable) return;
    let live = true;
    const timer = setTimeout(() => {
      searchShows(q)
        .then((r) => live && setAnswer({ q, results: r.slice(0, 20), error: '' }))
        .catch((e: Error) => live && setAnswer({ q, results: [], error: e.message }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, searchable]);

  const current = searchable && answer.q === q;
  const results = current ? answer.results : [];
  const error = current ? answer.error : '';
  const loading = searchable && !current;

  const onList = new Set(shows.map((s) => s.id));

  return (
    <Screen>
      <Heading>Find a show</Heading>
      {!hasTmdb ? (
        <Notice title="Search needs show data">Add the free TMDB token to this copy of the app to search.</Notice>
      ) : null}
      <TextInput
        id="search-query"
        value={query}
        onChangeText={setQuery}
        placeholder="Show title"
        placeholderTextColor={Colors.muted}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.input}
      />
      {error ? <Text style={{ color: Colors.end }}>{error}</Text> : null}
      {loading && results.length === 0 ? <Loading /> : null}
      <View style={{ gap: Spacing.two }}>
        {results.map((r) => {
          const added = onList.has(r.id);
          return (
            <View key={r.id} style={styles.row}>
              <Link href={{ pathname: '/show/[id]', params: { id: String(r.id) } }} asChild>
                <Pressable style={styles.rowMain}>
                  <Poster path={r.poster_path} id={r.id} width={44} size="w92" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.sub}>{r.first_air_date?.slice(0, 4) ?? 'Year unknown'}</Text>
                  </View>
                </Pressable>
              </Link>
              <Pressable
                accessibilityRole="button"
                disabled={added || !household}
                onPress={() => addShow({ id: r.id, name: r.name, posterPath: r.poster_path })}
                style={[styles.add, added && { backgroundColor: 'transparent', borderColor: Colors.line }]}>
                <Text style={[styles.addText, added && { color: Colors.muted }]}>{added ? 'On list' : 'Add'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {current && results.length === 0 && !error ? (
        <Body muted>No shows match “{q}”.</Body>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.cushion,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    fontSize: 17,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.cushion,
  },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { fontWeight: '700', fontSize: 15, color: Colors.text },
  sub: { color: Colors.muted, fontSize: 12 },
  add: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: Colors.lamp,
    borderWidth: 1,
    borderColor: Colors.lamp,
  },
  addText: { fontWeight: '700', color: Colors.lampInk, fontSize: 13 },
});
