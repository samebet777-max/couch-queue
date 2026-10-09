import { Link, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Label, Loading, Notice, Poster } from '@/components/ui';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { usePerson } from '@/lib/use-tmdb';

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function PersonScreen() {
  const { id: idParam, show: fromShow } = useLocalSearchParams<{ id: string; show?: string }>();
  const id = Number(idParam);
  const insets = useSafeAreaInsets();
  const { data: person, error } = usePerson(id);
  const { shows } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => Date.now());

  const top = { paddingTop: insets.top + 56 };
  if (error) {
    return (
      <View style={[styles.page, top, { paddingHorizontal: Spacing.four }]}>
        <Notice title="Couldn't load this bio">{error}</Notice>
      </View>
    );
  }
  if (!person) {
    return (
      <View style={[styles.page, top]}>
        <Loading />
      </View>
    );
  }

  // Their best-known TV, most episodes first, minus talk-show and award-show guest spots.
  const credits = (person.tv_credits?.cast ?? [])
    .filter((c) => c.episode_count > 1 || c.character)
    .sort((a, b) => b.episode_count - a.episode_count);
  const unique = credits.filter((c, i) => credits.findIndex((o) => o.id === c.id) === i);
  const listIds = new Set(shows.map((s) => s.id));
  const onOurList = unique.filter((c) => listIds.has(c.id));
  const alsoIn = unique.filter((c) => !listIds.has(c.id)).slice(0, 10);
  const role = fromShow ? unique.find((c) => c.name === fromShow)?.character : undefined;

  const age =
    person.birthday && !person.deathday
      ? Math.floor((now - new Date(person.birthday).getTime()) / (365.25 * 86_400_000))
      : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={[top, { paddingBottom: insets.bottom + 48 }]}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Poster path={person.profile_path} id={person.id} width={104} round size="w185" />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.name}>{person.name}</Text>
            {role ? (
              <Text style={styles.sub}>
                Plays {role} in {fromShow}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.facts}>
          {person.birthday ? (
            <Fact label="Born" value={`${fmt(person.birthday)}${age !== null ? ` (age ${age})` : ''}`} />
          ) : null}
          {person.place_of_birth ? <Fact label="From" value={person.place_of_birth} /> : null}
          {person.deathday ? <Fact label="Died" value={fmt(person.deathday)} /> : null}
          <Fact label="Known for" value={person.known_for_department} />
        </View>

        {person.biography ? (
          <View style={{ gap: Spacing.two }}>
            <Label>Biography</Label>
            <Body numberOfLines={expanded ? undefined : 7}>{person.biography}</Body>
            <Pressable onPress={() => setExpanded((e) => !e)}>
              <Text style={{ color: Colors.lamp, fontWeight: '600' }}>{expanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          </View>
        ) : null}

        {onOurList.length > 0 ? <CreditRow title="On our list" credits={onOurList} /> : null}
        {alsoIn.length > 0 ? <CreditRow title="Also in" credits={alsoIn} /> : null}

        <Pressable onPress={() => WebBrowser.openBrowserAsync(`https://www.themoviedb.org/person/${person.id}`)}>
          <Text style={{ color: Colors.muted, fontSize: 12 }}>Full filmography on TMDB</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.three }}>
      <Text style={{ color: Colors.muted, width: 76 }}>{label}</Text>
      <Text style={{ color: Colors.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

function CreditRow({
  title,
  credits,
}: {
  title: string;
  credits: { id: number; name: string; poster_path: string | null; character: string }[];
}) {
  return (
    <View style={{ gap: Spacing.two }}>
      <Label>{title}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
        {credits.map((c) => (
          <Link key={c.id} href={{ pathname: '/show/[id]', params: { id: String(c.id) } }} asChild>
            <Pressable style={{ width: 92, gap: 4 }}>
              <Poster path={c.poster_path} id={c.id} width={92} size="w185" />
              <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '600' }} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.night },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  name: { fontFamily: Fonts.display, fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sub: { color: Colors.muted, fontSize: 14 },
  facts: { gap: Spacing.two },
});
