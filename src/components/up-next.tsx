import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  airedCount,
  airedSeasons,
  caughtUpPoint,
  episodeLabel,
  episodesLeft,
  firstEpisode,
  isCaughtUp,
  nextEpisode,
  type UpNext,
} from '@/lib/episodes';
import { showKey, type SavedShow } from '@/lib/household';
import { useStore } from '@/lib/store';
import type { TmdbShow } from '@/lib/tmdb';

import { Label } from './ui';

const pretty = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The show page's "Up next for us" box, or a quiet link to start tracking. */
export function UpNextSection({ show, saved }: { show: TmdbShow; saved: SavedShow }) {
  const { setUpNext } = useStore();
  const [picking, setPicking] = useState(false);
  const key = showKey(saved);
  const up = saved.upNext;
  if (airedSeasons(show).length === 0) return null;

  const done = up ? isCaughtUp(show, up) : false;
  const left = up ? episodesLeft(show, up) : 0;
  const next = show.next_episode_to_air?.air_date;

  return (
    <View style={{ gap: Spacing.two }}>
      {up ? (
        <>
          <Label>Up next for us</Label>
          <View style={styles.box}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change the episode you're up to"
              onPress={() => setPicking(true)}
              style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.episode}>{done ? 'All caught up' : episodeLabel(up)}</Text>
              <Text style={styles.detail}>
                {done
                  ? next
                    ? `Next episode ${pretty(next)}`
                    : 'No new episodes yet'
                  : `${left} episode${left === 1 ? '' : 's'} to watch`}
              </Text>
            </Pressable>
            {done ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setUpNext(key, nextEpisode(show, up))}
                style={({ pressed }) => [styles.watched, pressed && { opacity: 0.7 }]}>
                <Text style={styles.watchedText}>✓ Watched</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.hint}>
            Wrong episode? Tap “{done ? 'All caught up' : episodeLabel(up)}” to pick the right one.
          </Text>
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setPicking(true)} style={styles.start}>
          <Text style={styles.startText}>＋ Keep track of the episode we’re on</Text>
        </Pressable>
      )}
      {picking ? (
        <EpisodePicker
          show={show}
          current={up}
          onClose={() => setPicking(false)}
          onPick={(choice) => {
            setUpNext(key, choice);
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}

function EpisodePicker({
  show,
  current,
  onPick,
  onClose,
}: {
  show: TmdbShow;
  current: UpNext | undefined;
  onPick: (up: UpNext | undefined) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const seasons = airedSeasons(show);
  const start = current && !isCaughtUp(show, current) ? current : current ? null : firstEpisode(show);
  const [season, setSeason] = useState(start?.season ?? seasons[seasons.length - 1]);
  const [episode, setEpisode] = useState<number | null>(start?.episode ?? null);
  const count = airedCount(show, season);
  const chosen = episode !== null && episode <= count ? { season, episode } : null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <View style={styles.grab} />
          <View>
            <Text style={styles.sheetTitle}>Where are you up to?</Text>
            <Text style={styles.detail}>Tap the next episode you’ll watch.</Text>
          </View>

          <View style={{ gap: Spacing.two }}>
            <Label>Season</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {seasons.map((n) => {
                const on = n === season;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`Season ${n}`}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setSeason(n);
                      setEpisode(null);
                    }}
                    style={[styles.seasonChip, on && { backgroundColor: Colors.lamp }]}>
                    <Text style={[styles.seasonText, on && { color: Colors.lampInk }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: Spacing.two, flexShrink: 1 }}>
            <Label>Episode</Label>
            <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={styles.grid}>
              {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
                const watched = episode !== null && n < episode;
                const on = n === episode;
                return (
                  <View key={n} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Episode ${n}`}
                      accessibilityState={{ selected: on }}
                      onPress={() => setEpisode(n)}
                      style={[styles.ep, watched && styles.epWatched, on && { backgroundColor: Colors.lamp }]}>
                      <Text style={[styles.epText, watched && { color: Colors.ok }, on && { color: Colors.lampInk }]}>
                        {n}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!chosen}
            onPress={() => chosen && onPick(chosen)}
            style={({ pressed }) => [styles.save, (!chosen || pressed) && { opacity: 0.5 }]}>
            <Text style={styles.saveText}>{chosen ? `Up next: ${episodeLabel(chosen)}` : 'Pick an episode'}</Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable accessibilityRole="button" onPress={() => onPick(firstEpisode(show))}>
              <Text style={styles.link}>Not started yet</Text>
            </Pressable>
            <Text style={styles.link}>·</Text>
            <Pressable accessibilityRole="button" onPress={() => onPick(caughtUpPoint(show))}>
              <Text style={styles.link}>Finished it all</Text>
            </Pressable>
            {current ? (
              <>
                <Text style={styles.link}>·</Text>
                <Pressable accessibilityRole="button" onPress={() => onPick(undefined)}>
                  <Text style={styles.link}>Stop tracking</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.sofa,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  episode: { fontFamily: Fonts.mono, fontWeight: '800', fontSize: 22, color: Colors.text },
  detail: { color: Colors.muted, fontSize: 13, marginTop: 2 },
  watched: { backgroundColor: Colors.ok, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 10 },
  watchedText: { color: '#0f2a1d', fontWeight: '800', fontSize: 14 },
  hint: { color: Colors.muted, fontSize: 12 },
  start: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  startText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,4,10,0.6)' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '90%',
    backgroundColor: Colors.sofa,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderTopWidth: 1,
    borderColor: Colors.line,
    paddingTop: 10,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.line, alignSelf: 'center' },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: '800', color: Colors.text },
  seasonChip: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cushion,
  },
  seasonText: { fontWeight: '700', fontSize: 15, color: Colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: `${100 / 7}%`, padding: 3 },
  ep: { height: 42, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cushion },
  epWatched: { backgroundColor: 'rgba(127,209,168,0.16)' },
  epText: { fontFamily: Fonts.mono, fontWeight: '700', fontSize: 15, color: Colors.text },
  save: { backgroundColor: Colors.lamp, borderRadius: Radius.medium, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: Colors.lampInk, fontWeight: '800', fontSize: 16 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  link: { color: Colors.muted, fontSize: 14, paddingVertical: 4 },
});
