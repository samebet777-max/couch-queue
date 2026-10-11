import { useState } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { LISTS, type ListName } from '@/lib/household';
import { suggestList } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { titleName, type TmdbTitle } from '@/lib/tmdb';

import { Body, Button, Chips } from './ui';

/** Adding a show or movie: the suggested list is picked already, and any other list is one tap away. */
export function AddToList({ show, onDone, onCancel }: { show: TmdbTitle; onDone?: (list: ListName) => void; onCancel?: () => void }) {
  const { addShow } = useStore();
  const suggestion = suggestList(show);
  const [list, setList] = useState<ListName>(suggestion.list);

  return (
    <View style={{ gap: Spacing.two }}>
      <Chips options={LISTS} value={list} onChange={setList} />
      <Body muted style={{ fontSize: 13 }}>
        {list === suggestion.list ? suggestion.reason : 'You picked a different list than we suggested, and that’s fine.'}
      </Body>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {onCancel ? <Button title="Cancel" onPress={onCancel} /> : null}
        <Button
          kind="primary"
          title={`Add to ${LISTS.find((l) => l.key === list)?.label}`}
          onPress={() => {
            addShow(
              {
                id: show.id,
                ...(show.media === 'movie' ? { kind: 'movie' as const } : {}),
                name: titleName(show),
                posterPath: show.poster_path,
              },
              list,
            );
            onDone?.(list);
          }}
        />
      </View>
    </View>
  );
}
