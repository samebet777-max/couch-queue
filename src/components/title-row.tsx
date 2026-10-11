import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Kind, TitleResult } from '@/lib/tmdb';
import { useTitle } from '@/lib/use-tmdb';

import { AddToList } from './add-to-list';
import { Loading, Poster } from './ui';

/** The list picker under a result, once its details (and so the suggestion) have loaded. */
function PickList({ kind, id, onClose }: { kind: Kind; id: number; onClose: () => void }) {
  const { data: title, error } = useTitle(kind, id);
  if (error) return <Text style={{ color: Colors.end }}>{error}</Text>;
  if (!title) return <Loading />;
  return <AddToList show={title} onDone={onClose} onCancel={onClose} />;
}

/** A show or movie in search results or suggestions, with an Add button that opens the list picker. */
export function TitleRow({ title: r, note }: { title: TitleResult; note?: string }) {
  const { household, find } = useStore();
  const [picking, setPicking] = useState(false);
  const added = !!find(r);
  return (
    <View style={styles.result}>
      <View style={styles.row}>
        <Link
          href={{ pathname: r.kind === 'movie' ? '/movie/[id]' : '/show/[id]', params: { id: String(r.id) } }}
          asChild>
          <Pressable style={styles.rowMain}>
            <Poster path={r.poster_path} id={r.id} width={60} size="w185" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.title} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.sub}>
                {r.kind === 'movie' ? 'Movie' : 'TV show'} · {r.date?.slice(0, 4) ?? 'Year unknown'}
              </Text>
              {note ? (
                <Text style={styles.note} numberOfLines={2}>
                  {note}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
        <Pressable
          accessibilityRole="button"
          disabled={added || !household}
          onPress={() => setPicking((p) => !p)}
          style={[styles.add, added && { backgroundColor: 'transparent', borderColor: Colors.line }]}>
          <Text style={[styles.addText, added && { color: Colors.muted }]}>{added ? 'On list' : 'Add'}</Text>
        </Pressable>
      </View>
      {picking && !added ? <PickList kind={r.kind} id={r.id} onClose={() => setPicking(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  note: { color: Colors.lamp, fontSize: 12 },
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
