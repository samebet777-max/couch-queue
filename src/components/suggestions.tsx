import { useState } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { showKey } from '@/lib/household';
import { becauseText, rankSuggestions, seedsFor, type Audience } from '@/lib/suggestions';
import { useStore } from '@/lib/store';
import { useRecommendations } from '@/lib/use-tmdb';

import { TitleRow } from './title-row';
import { Body, Chips, Label, Loading } from './ui';

/** Shows and movies like the ones on your list: just yours, or the ones you share. */
export function Suggestions() {
  const { household, shows, members, me, find } = useStore();
  const shared = members.length > 1;
  const [audience, setAudience] = useState<Audience>('me');
  const view = shared ? audience : 'us';
  const seeds = seedsFor(view, shows, members, me);
  const recs = useRecommendations(seeds);
  if (!household) return null;

  const loaded = seeds.filter((s) => recs[showKey(s)]);
  const suggestions = rankSuggestions(seeds, recs, (t) => !!find(t));
  const others = members.filter((m) => m.id !== me?.id).map((m) => m.name);

  return (
    <View style={{ gap: Spacing.two }}>
      <Label>Suggested for you</Label>
      {shared ? (
        <Chips
          options={[
            { key: 'me', label: 'Just me' },
            { key: 'us', label: 'Both of us' },
          ]}
          value={audience}
          onChange={setAudience}
        />
      ) : null}
      {seeds.length === 0 ? (
        <Body muted>
          {view === 'me'
            ? `Nothing is tagged just to you yet. Shows you share with ${others.join(' and ') || 'others'} are under “Both of us”.`
            : 'Add a few shows you both watch, and suggestions will show up here.'}
        </Body>
      ) : loaded.length < seeds.length && suggestions.length === 0 ? (
        <Loading />
      ) : suggestions.length === 0 ? (
        <Body muted>No suggestions yet. Add a few more shows and check back.</Body>
      ) : (
        suggestions.map((s) => (
          <TitleRow key={`${s.title.kind}:${s.title.id}`} title={s.title} note={becauseText(s.because)} />
        ))
      )}
    </View>
  );
}
