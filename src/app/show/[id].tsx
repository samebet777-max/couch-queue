import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CastRow, ListControls, RemoveFromList, Reviews } from '@/components/title-parts';
import { Body, Button, Label, Loading, Notice, Poster } from '@/components/ui';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { isFor } from '@/lib/household';
import { nextSeason } from '@/lib/next-season';
import { useStore } from '@/lib/store';
import { imageUrl, networkLabel, pickTrailer, realSeasons } from '@/lib/tmdb';
import { useShow } from '@/lib/use-tmdb';

const REGION = 'US';

export default function ShowScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const insets = useSafeAreaInsets();
  const { data: show, error } = useShow(id);
  const store = useStore();
  const saved = store.find({ id });
  const isNew = !!saved?.newEpisodes;
  const { markSeen } = store;
  // Opening a show that just came back counts as noticing it.
  useEffect(() => {
    if (isNew) markSeen(String(id));
  }, [isNew, id, markSeen]);

  if (error) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 56, paddingHorizontal: Spacing.four }]}>
        <Notice title="Couldn't load this show">{error}</Notice>
      </View>
    );
  }
  if (!show) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 56 }]}>
        <Loading />
      </View>
    );
  }

  const seasons = realSeasons(show);
  const aired = seasons.filter((s) => s.air_date && new Date(s.air_date) <= new Date());
  const status = nextSeason(show);
  const trailer = pickTrailer(show);
  const providers = show['watch/providers']?.results?.[REGION];
  const streaming = providers?.flatrate ?? providers?.free ?? providers?.ads ?? [];
  const cast = (show.aggregate_credits?.cast ?? []).slice(0, 12);
  const reviews = (show.reviews?.results ?? []).slice(0, 3);
  const years = [show.first_air_date?.slice(0, 4), show.status === 'Ended' || show.status === 'Canceled' ? show.last_air_date?.slice(0, 4) : '']
    .filter((y) => y !== undefined)
    .join('–');
  const mine = store.me ? store.seasonsWatched(id, store.me.id) : 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
      <View style={styles.hero}>
        {show.backdrop_path ? (
          <Image source={{ uri: imageUrl(show.backdrop_path, 'w780') }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <LinearGradient colors={['rgba(20,18,31,0.1)', 'rgba(20,18,31,0.55)', Colors.night]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroText, { paddingTop: insets.top + 56 }]}>
          <Poster path={show.poster_path} id={show.id} width={92} size="w185" />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.title}>{show.name}</Text>
            <Text style={styles.sub}>
              {networkLabel(show)} · {years}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {show.genres.map((g) => g.name).join(', ')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.buttons}>
          {trailer ? (
            <Button
              kind="primary"
              title="▶  Watch trailer"
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}
            />
          ) : null}
          {providers?.link ? (
            <Button
              title={streaming[0] ? `On ${streaming[0].provider_name}` : 'Where to watch'}
              onPress={() => WebBrowser.openBrowserAsync(providers.link)}
            />
          ) : null}
        </View>

        <View style={[styles.callout, status.tone === 'end' && { borderColor: Colors.line, backgroundColor: Colors.sofa }]}>
          <Label>Next season</Label>
          <Text style={styles.calloutTitle}>{status.label}</Text>
          <Body muted style={{ fontSize: 14 }}>
            {status.detail}
          </Body>
        </View>

        <ListControls title={show} saved={saved} />

        {aired.length > 0 ? (
          <View style={{ gap: Spacing.two }}>
            <Label>Seasons</Label>
            {saved && store.me ? (
              <Body muted style={{ fontSize: 13 }}>
                Tap the last season you’ve finished.
              </Body>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasons}>
              {seasons.map((s) => {
                const isAired = aired.includes(s);
                const seen = s.season_number <= mine;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name}, ${s.episode_count} episodes`}
                    disabled={!saved || !store.me || !isAired}
                    onPress={() => store.setSeasonsWatched(id, s.season_number === mine ? s.season_number - 1 : s.season_number)}
                    style={[styles.season, seen && styles.seasonSeen, !isAired && styles.seasonNext]}>
                    <Text style={[styles.seasonText, seen && { color: Colors.ok }, !isAired && { color: Colors.lamp }]}>
                      S{s.season_number}
                    </Text>
                    <Text style={styles.seasonEps}>{isAired ? `${s.episode_count} ep` : 'soon'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {saved ? (
              <View style={{ gap: 2 }}>
                {store.members.map((m, i) => {
                  if (!isFor(saved, m.id)) return null;
                  const n = store.seasonsWatched(id, m.id);
                  return (
                    <Text key={m.id} style={{ color: Colors.members[i % Colors.members.length], fontSize: 13 }}>
                      {m.name}: {n === 0 ? 'not started' : n >= aired.length ? 'all caught up' : `finished season ${n}`}
                    </Text>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {show.overview ? (
          <View style={{ gap: Spacing.two }}>
            <Label>About</Label>
            <Body>{show.overview}</Body>
          </View>
        ) : null}

        <CastRow cast={cast.map((c) => ({ ...c, character: c.roles[0]?.character }))} from={show.name} />

        <Reviews reviews={reviews} />

        <RemoveFromList saved={saved} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.night },
  hero: { minHeight: 300, justifyContent: 'flex-end' },
  heroText: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.four,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: { fontFamily: Fonts.display, fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sub: { color: Colors.muted, fontSize: 13 },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  callout: {
    borderRadius: Radius.medium,
    padding: Spacing.four,
    gap: 4,
    backgroundColor: 'rgba(242,178,92,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(242,178,92,0.35)',
  },
  calloutTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: '800', color: Colors.text },
  seasons: { gap: 6 },
  season: {
    minWidth: 52,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.small,
    backgroundColor: Colors.cushion,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seasonSeen: { backgroundColor: 'rgba(127,209,168,0.16)' },
  seasonNext: { backgroundColor: 'transparent', borderColor: Colors.lamp, borderStyle: 'dashed' },
  seasonText: { fontFamily: Fonts.mono, fontWeight: '700', color: Colors.text },
  seasonEps: { fontSize: 10, color: Colors.muted },
});
