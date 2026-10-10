import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AddToList } from '@/components/add-to-list';
import { Body, Heading, Label, Loading, Notice, Poster, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { showKey } from '@/lib/household';
import { useStore } from '@/lib/store';
import { hasTmdb, search, type Kind, type PersonResult, type TitleResult } from '@/lib/tmdb';
import { useTitle } from '@/lib/use-tmdb';

/** The list picker under a search result, once its details (and so the suggestion) have loaded. */
function PickList({ kind, id, onClose }: { kind: Kind; id: number; onClose: () => void }) {
  const { data: title, error } = useTitle(kind, id);
  if (error) return <Text style={{ color: Colors.end }}>{error}</Text>;
  if (!title) return <Loading />;
  return <AddToList show={title} onDone={onClose} onCancel={onClose} />;
}

type Answer = { q: string; titles: TitleResult[]; people: PersonResult[]; error: string };

export default function SearchScreen() {
  const { household, find } = useStore();
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Results remember which query they answer, so stale ones never show.
  const [answer, setAnswer] = useState<Answer>({ q: '', titles: [], people: [], error: '' });
  const q = query.trim();
  const searchable = hasTmdb && q.length >= 2;

  useEffect(() => {
    if (!searchable) return;
    let live = true;
    const timer = setTimeout(() => {
      search(q)
        .then(({ titles, people }) => live && setAnswer({ q, titles: titles.slice(0, 20), people: people.slice(0, 3), error: '' }))
        .catch((e: Error) => live && setAnswer({ q, titles: [], people: [], error: e.message }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, searchable]);

  const current = searchable && answer.q === q;
  const titles = current ? answer.titles : [];
  const people = current ? answer.people : [];
  const error = current ? answer.error : '';
  const loading = searchable && !current;

  return (
    <Screen>
      <Heading>Search</Heading>
      <Body muted>Search for a show or movie by its title, or type an actor’s name.</Body>
      {!hasTmdb ? (
        <Notice title="Search needs show data">Add the free TMDB token to this copy of the app to search.</Notice>
      ) : null}
      <TextInput
        id="search-query"
        value={query}
        onChangeText={setQuery}
        placeholder="Title or actor"
        placeholderTextColor={Colors.muted}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.input}
      />
      {error ? <Text style={{ color: Colors.end }}>{error}</Text> : null}
      {loading ? <Loading /> : null}

      {people.length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          <Label>People</Label>
          {people.map((p) => (
            <Link key={p.id} href={{ pathname: '/person/[id]', params: { id: String(p.id) } }} asChild>
              <Pressable style={styles.person}>
                <Poster path={p.profile_path} id={p.id} width={60} round size="w185" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={2}>
                    {p.knownFor.length ? `Known for ${p.knownFor.join(', ')}` : 'See what they’ve been in'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      {titles.length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          {people.length > 0 ? <Label>Shows and movies</Label> : null}
          {titles.map((r) => {
            const key = showKey(r);
            const added = !!find(r);
            return (
              <View key={key} style={styles.result}>
                <View style={styles.row}>
                  <Link
                    href={{ pathname: r.kind === 'movie' ? '/movie/[id]' : '/show/[id]', params: { id: String(r.id) } }}
                    asChild>
                    <Pressable style={styles.rowMain}>
                      <Poster path={r.poster_path} id={r.id} width={60} size="w185" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.title} numberOfLines={1}>
                          {r.name}
                        </Text>
                        <Text style={styles.sub}>
                          {r.kind === 'movie' ? 'Movie' : 'TV show'} · {r.date?.slice(0, 4) ?? 'Year unknown'}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                  <Pressable
                    accessibilityRole="button"
                    disabled={added || !household}
                    onPress={() => setPicking(picking === key ? null : key)}
                    style={[styles.add, added && { backgroundColor: 'transparent', borderColor: Colors.line }]}>
                    <Text style={[styles.addText, added && { color: Colors.muted }]}>{added ? 'On list' : 'Add'}</Text>
                  </Pressable>
                </View>
                {picking === key && !added ? (
                  <PickList kind={r.kind} id={r.id} onClose={() => setPicking(null)} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {current && titles.length === 0 && people.length === 0 && !error ? <Body muted>Nothing matches “{q}”.</Body> : null}
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
  result: {
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.cushion,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { fontWeight: '700', fontSize: 15, color: Colors.text },
  sub: { color: Colors.muted, fontSize: 12 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.cushion,
  },
  chevron: { color: Colors.muted, fontSize: 24, paddingHorizontal: Spacing.two },
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
