import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { hasSync } from '@/lib/sync';

import { Body, Button, Heading } from './ui';

/** First launch: name yourself, then start a new list or join your partner's. */
export function Welcome() {
  const { createHousehold, joinHousehold } = useStore();
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const named = name.trim().length > 0;

  async function join() {
    setBusy(true);
    setError('');
    try {
      await joinHousehold(code, name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={{ gap: Spacing.two }}>
        <Heading style={{ fontSize: 40 }}>
          Couch <Text style={{ color: Colors.lamp }}>Queue</Text>
        </Heading>
        <Body muted>One list of the shows you love, where each of you left off, and news about what’s coming next.</Body>
      </View>

      <View style={{ gap: Spacing.two }}>
        <Text style={styles.fieldLabel}>Your first name</Text>
        <TextInput
          id="welcome-name"
          value={name}
          onChangeText={setName}
          placeholder="David"
          placeholderTextColor={Colors.muted}
          autoCapitalize="words"
          style={styles.input}
        />
      </View>

      {joining ? (
        <View style={{ gap: Spacing.two }}>
          <Text style={styles.fieldLabel}>Household code from the other phone</Text>
          <TextInput
            id="welcome-code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="8 letters and numbers"
            placeholderTextColor={Colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, styles.code]}
          />
          {error ? <Text style={{ color: Colors.end }}>{error}</Text> : null}
          <View style={styles.row}>
            <Button title="Back" onPress={() => setJoining(false)} />
            <Button title={busy ? 'Joining…' : 'Join list'} kind="primary" onPress={join} disabled={!named || code.length < 8 || busy} />
          </View>
        </View>
      ) : (
        <View style={{ gap: Spacing.two }}>
          <Button title="Start our list" kind="primary" onPress={() => createHousehold(name)} disabled={!named} />
          {hasSync ? <Button title="Join my partner's list" onPress={() => setJoining(true)} /> : null}
          <Body muted style={{ fontSize: 13 }}>
            Starting a list adds Peaky Blinders, General Hospital and Star Trek: Strange New Worlds for you.
          </Body>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.five, paddingTop: Spacing.six },
  fieldLabel: { color: Colors.muted, fontSize: 13 },
  input: {
    backgroundColor: Colors.cushion,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    fontSize: 17,
    color: Colors.text,
  },
  code: { letterSpacing: 4, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two },
});
