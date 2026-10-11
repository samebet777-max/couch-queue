import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Suggestions } from '@/components/suggestions';
import { TitleRow } from '@/components/title-row';
import { Body, Heading, Label, Loading, Notice, Poster, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { showKey } from '@/lib/household';
import { hasTmdb, search, type PersonResult, type TitleResult } from '@/lib/tmdb';

type Answer = { q: string; titles: TitleResult[]; people: PersonResult[]; error: string };

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState('');
  const input = useRef<TextInput>(null);
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

  // Start fresh for the next search; focusing in the same tap keeps the iPhone keyboard up.
  function clear() {
    setQuery('');
    input.current?.focus();
  }

  return (
    <Screen>
      <Heading>Search</Heading>
      <Body muted>Search for a show or movie by its title, or type an actor’s name.</Body>
      {!hasTmdb ? (
        <Notice title="Search needs show data">Add the free TMDB token to this copy of the app to search.</Notice>
      ) : null}
      <View>
        <TextInput
          ref={input}
          id="search-query"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setAdded('');
          }}
          placeholder="Title or actor"
          placeholderTextColor={Colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          enterKeyHint="search"
          selectTextOnFocus
          onKeyPress={(e) => e.nativeEvent.key === 'Escape' && clear()}
          style={styles.input}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={clear} style={styles.clear}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {added ? <Text style={styles.added}>✓ {added}</Text> : null}
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
          {titles.map((r) => (
            <TitleRow
              key={showKey(r)}
              title={r}
              onAdded={(message) => {
                setAdded(message);
                clear();
              }}
            />
          ))}
        </View>
      ) : null}

      {current && titles.length === 0 && people.length === 0 && !error ? <Body muted>Nothing matches “{q}”.</Body> : null}

      {q.length === 0 && hasTmdb ? <Suggestions /> : null}
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
    paddingRight: 52,
  },
  clear: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: Colors.night,
    backgroundColor: Colors.muted,
    width: 24,
    height: 24,
    lineHeight: 24,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  added: { color: Colors.ok, fontWeight: '600' },
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
});
