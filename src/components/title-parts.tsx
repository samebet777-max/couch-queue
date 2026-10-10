// Pieces shared by the show and movie pages.
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { LISTS, isFor, showKey, type SavedShow } from '@/lib/household';
import { useStore } from '@/lib/store';
import type { TmdbReview, TmdbTitle } from '@/lib/tmdb';

import { AddToList } from './add-to-list';
import { Body, Chips, Label, Poster } from './ui';

/** Which list it's on and who's watching, or the add picker when it isn't saved yet. */
export function ListControls({ title, saved }: { title: TmdbTitle; saved: SavedShow | undefined }) {
  const store = useStore();
  if (!saved) {
    return (
      <View style={{ gap: Spacing.two }}>
        <Label>Add to our list</Label>
        <AddToList show={title} />
      </View>
    );
  }
  const key = showKey(saved);
  return (
    <View style={{ gap: Spacing.two }}>
      <Label>On our list</Label>
      <Chips options={LISTS} value={saved.list} onChange={(list) => store.moveShow(key, list)} />
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
                    if (next.length > 0) store.setWatchers(key, next);
                  }}
                  style={[styles.watcher, on && { backgroundColor: color, borderColor: color }]}>
                  <Text style={[styles.watcherText, on && { color: Colors.night }]}>
                    {on ? '✓ ' : ''}
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Body muted style={{ fontSize: 13 }}>
            Only the people ticked here see it on their phone.
          </Body>
        </View>
      ) : null}
    </View>
  );
}

export function RemoveFromList({ saved }: { saved: SavedShow | undefined }) {
  const { removeShow } = useStore();
  if (!saved) return null;
  return (
    <Pressable onPress={() => removeShow(showKey(saved))} style={{ alignSelf: 'center', padding: Spacing.three }}>
      <Text style={{ color: Colors.end }}>Remove from our list</Text>
    </Pressable>
  );
}

export function CastRow({
  cast,
  from,
}: {
  cast: { id: number; name: string; profile_path: string | null; character: string | undefined }[];
  from: string;
}) {
  if (cast.length === 0) return null;
  return (
    <View style={{ gap: Spacing.two }}>
      <Label>Cast</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
        {cast.map((c) => (
          <Link key={c.id} href={{ pathname: '/person/[id]', params: { id: String(c.id), show: from } }} asChild>
            <Pressable style={styles.castItem}>
              <Poster path={c.profile_path} id={c.id} width={64} round size="w185" />
              <Text style={styles.castName} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={styles.castRole} numberOfLines={1}>
                {c.character}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

/** First couple of sentences of a review, without markdown clutter. */
function highlight(review: TmdbReview) {
  const text = review.content.replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= 240) return text;
  const cut = text.slice(0, 240);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

export function Reviews({ reviews }: { reviews: TmdbReview[] }) {
  if (reviews.length === 0) return null;
  return (
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
  );
}

const styles = StyleSheet.create({
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
