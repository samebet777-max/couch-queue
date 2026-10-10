import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToList } from '@/components/add-to-list';
import { Body, Button, Chips, Label, Loading, Notice, Poster } from '@/components/ui';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { LISTS, isFor } from '@/lib/household';
import { nextSeason } from '@/lib/next-season';
import { useStore } from '@/lib/store';
import { imageUrl, networkLabel, pickTrailer, realSeasons, type TmdbReview } from '@/lib/tmdb';
import { useShow } from '@/lib/use-tmdb';

const REGION = 'US';

/** First couple of sentences of a review, without markdown clutter. */
function highlight(review: TmdbReview) {
  const text = review.content.replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= 240) return text;
  const cut = text.slice(0, 240);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

export default function ShowScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const insets = useSafeAreaInsets();
  const { data: show, error } = useShow(id);
  const store = useStore();
  const saved = store.shows.find((s) => s.id === id);
  const isNew = !!saved?.newEpisodes;
  const { markSeen } = store;
  // Opening a show that just came back counts as noticing it.
  useEffect(() => {
    if (isNew) markSeen(id);
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

        {saved ? (
          <View style={{ gap: Spacing.two }}>
            <Label>On our list</Label>
            <Chips options={LISTS} value={saved.list} onChange={(list) => store.moveShow(id, list)} />
            {store.members.length > 1 ? (
              <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
                <Label>Who’s watching</Label>
                <View style={styles.watchers}>
                  {store.members.map((m, i) => {
                    const on = isFor(saved, m.id);
                    const color = Colors.members[i % Colors.members.length];
                    return (
                      <Pressable
                        key={m.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        onPress={() => {
                          const current = store.members.filter((x) => isFor(saved, x.id)).map((x) => x.id);
                          const next = on ? current.filter((x) => x !== m.id) : [...current, m.id];
                          // Someone always has to be watching; untagging the last person does nothing.
                          if (next.length > 0) store.setWatchers(id, next);
                        }}
                        style={[styles.watcher, on && { backgroundColor: color, borderColor: color }]}>
                        <Text style={[styles.watcherText, on && { color: Colors.night }]}>
                          {on ? '\u2713 ' : ''}
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Body muted style={{ fontSize: 13 }}>
                  Shows only appear on the phones of the people ticked here.
                </Body>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: Spacing.two }}>
            <Label>Add to our list</Label>
            <AddToList show={show} />
          </View>
        )}

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

        {cast.length > 0 ? (
          <View style={{ gap: Spacing.two }}>
            <Label>Cast</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
              {cast.map((c) => (
                <Link key={c.id} href={{ pathname: '/person/[id]', params: { id: String(c.id), show: show.name } }} asChild>
                  <Pressable style={styles.castItem}>
                    <Poster path={c.profile_path} id={c.id} width={64} round size="w185" />
                    <Text style={styles.castName} numberOfLines={2}>
                      {c.name}
                    </Text>
                    <Text style={styles.castRole} numberOfLines={1}>
                      {c.roles[0]?.character}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {reviews.length > 0 ? (
          <View style={{ gap: Spacing.three }}>
            <Label>What viewers say</Label>
            {reviews.map((r) => (
              <Pressable key={r.id} onPress={() => WebBrowser.openBrowserAsync(r.url)} style={styles.quote}>
                <Text style={styles.quoteText}>“{highlight(r)}”</Text>
                <Text style={styles.quoteBy}>
                  {r.author}
                  {r.author_details?.rating ? ` · ${r.author_details.rating}/10` : ''} · Read full review
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {saved ? (
          <Pressable onPress={() => store.removeShow(id)} style={{ alignSelf: 'center', padding: Spacing.three }}>
            <Text style={{ color: Colors.end }}>Remove from our list</Text>
          </Pressable>
        ) : null}
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
  watchers: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  watcher: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  watcherText: { color: Colors.text, fontWeight: '600' },
  castItem: { width: 76, alignItems: 'center', gap: 4 },
  castName: { color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  castRole: { color: Colors.muted, fontSize: 11, textAlign: 'center' },
  quote: { borderLeftWidth: 2, borderLeftColor: Colors.lamp, paddingLeft: Spacing.three, gap: 4 },
  quoteText: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  quoteBy: { color: Colors.muted, fontSize: 12 },
});
