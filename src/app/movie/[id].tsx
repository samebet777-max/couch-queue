import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CastRow, ListControls, RemoveFromList, Reviews } from '@/components/title-parts';
import { Body, Button, Label, Loading, Notice, Poster } from '@/components/ui';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { showKey } from '@/lib/household';
import { movieStatus } from '@/lib/next-season';
import { useStore } from '@/lib/store';
import { imageUrl, pickTrailer } from '@/lib/tmdb';
import { useMovie } from '@/lib/use-tmdb';

const REGION = 'US';

export default function MovieScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const insets = useSafeAreaInsets();
  const { data: movie, error } = useMovie(id);
  const store = useStore();
  const saved = store.find({ id, kind: 'movie' });
  const isNew = !!saved?.newEpisodes;
  const { markSeen } = store;
  // Opening a movie that just came out counts as noticing it.
  useEffect(() => {
    if (isNew) markSeen(showKey({ id, kind: 'movie' }));
  }, [isNew, id, markSeen]);

  if (error) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 56, paddingHorizontal: Spacing.four }]}>
        <Notice title="Couldn't load this movie">{error}</Notice>
      </View>
    );
  }
  if (!movie) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 56 }]}>
        <Loading />
      </View>
    );
  }

  const status = movieStatus(movie);
  const trailer = pickTrailer(movie);
  const providers = movie['watch/providers']?.results?.[REGION];
  const streaming = providers?.flatrate ?? providers?.free ?? providers?.ads ?? [];
  const cast = (movie.credits?.cast ?? []).slice(0, 12);
  const reviews = (movie.reviews?.results ?? []).slice(0, 3);
  const length = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
  const facts = ['Movie', movie.release_date?.slice(0, 4), length].filter(Boolean).join(' · ');

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
      <View style={styles.hero}>
        {movie.backdrop_path ? (
          <Image source={{ uri: imageUrl(movie.backdrop_path, 'w780') }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <LinearGradient
          colors={['rgba(20,18,31,0.1)', 'rgba(20,18,31,0.55)', Colors.night]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroText, { paddingTop: insets.top + 56 }]}>
          <Poster path={movie.poster_path} id={movie.id} width={92} size="w185" />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.sub}>{facts}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {movie.genres.map((g) => g.name).join(', ')}
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
          <Label>Release</Label>
          <Text style={styles.calloutTitle}>{status.label}</Text>
          <Body muted style={{ fontSize: 14 }}>
            {status.detail}
          </Body>
        </View>

        <ListControls title={movie} saved={saved} />

        {movie.overview ? (
          <View style={{ gap: Spacing.two }}>
            <Label>About</Label>
            <Body>{movie.overview}</Body>
          </View>
        ) : null}

        <CastRow cast={cast} from={movie.title} />
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
});
