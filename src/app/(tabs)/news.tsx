import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Body, Card, Heading, Label, Pill, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { isFor, showKey } from '@/lib/household';
import { titleStatus, type NextSeason } from '@/lib/next-season';
import { useStore } from '@/lib/store';
import { useTitles } from '@/lib/use-tmdb';

const TONE_RANK = { warn: 0, ok: 1, info: 2, end: 3 } as const;

// Premiere dates first (soonest on top), then airing shows, then announcements, then shows with nothing coming.
function compare(a: NextSeason | null, b: NextSeason | null) {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return TONE_RANK[a.tone] - TONE_RANK[b.tone] || (a.date ?? '9999').localeCompare(b.date ?? '9999');
}

export default function NewsScreen() {
  const { shows, me } = useStore();
  const tracked = shows.filter((s) => s.list !== 'done' && isFor(s, me?.id));
  const details = useTitles(tracked);

  const items = tracked
    .map((saved) => {
      const show = details[showKey(saved)];
      return {
        saved,
        status: show && !(show instanceof Error) ? titleStatus(show) : null,
        failed: show instanceof Error,
      };
    })
    .sort((a, b) => compare(a.status, b.status));

  return (
    <Screen>
      <Heading>Coming up</Heading>
      <Body muted>
        What’s coming for every show and movie you’re watching or waiting on. Phone alerts and news articles come in the next
        update.
      </Body>
      <Label>Your shows</Label>
      <View style={{ gap: Spacing.two }}>
        {items.map(({ saved, status, failed }) => (
          <Link
            key={showKey(saved)}
            href={{ pathname: saved.kind === 'movie' ? '/movie/[id]' : '/show/[id]', params: { id: String(saved.id) } }}
            asChild>
            <Pressable>
              <Card hot={status?.tone === 'warn'}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
                  <Text style={{ color: Colors.muted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
                    {saved.name}
                  </Text>
                  {status ? <Pill tone={status.tone}>{status.label}</Pill> : null}
                </View>
                <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 15, lineHeight: 21 }}>
                  {status?.detail ?? (failed ? "Couldn't check this show right now." : 'Checking…')}
                </Text>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}
