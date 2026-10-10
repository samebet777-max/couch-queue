import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { hasSync } from '@/lib/sync';

import { Body, Button, Heading } from './ui';

/** First launch: name yourself, then open the shared list (most people) or create a new one. */
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
          <Text style={styles.fieldLabel}>List code (shown on the Us tab of the other phone)</Text>
          <TextInput
            id="welcome-code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="List code"
            placeholderTextColor={Colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, styles.code]}
          />
          {error ? <Text style={{ color: Colors.end }}>{error}</Text> : null}
          <View style={styles.row}>
            <Button title="Back" onPress={() => setJoining(false)} />
            <Button title={busy ? 'Opening…' : 'Open list'} kind="primary" onPress={join} disabled={!named || code.length < 8 || busy} />
          </View>
        </View>
      ) : (
        <View style={{ gap: Spacing.four }}>
          {hasSync ? (
            <View style={{ gap: Spacing.two }}>
              <Button title="Open our shared list" kind="primary" onPress={() => setJoining(true)} disabled={!named} />
              <Body muted style={{ fontSize: 13 }}>
                Already using Couch Queue on another phone or computer? Choose this and enter your list code.
              </Body>
            </View>
          ) : null}
          <View style={{ gap: Spacing.two }}>
            <Button
              title="Create a brand-new list"
              kind={hasSync ? 'secondary' : 'primary'}
              onPress={() => createHousehold(name)}
              disabled={!named}
            />
            <Body muted style={{ fontSize: 13 }}>
              Only if nobody in your home has set up Couch Queue yet. It starts you off with Peaky Blinders, General
              Hospital and Star Trek: Strange New Worlds.
            </Body>
          </View>
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
