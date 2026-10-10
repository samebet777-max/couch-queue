import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Heading, Label, Screen } from '@/components/ui';
import { Welcome } from '@/components/welcome';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useStore, type SyncState } from '@/lib/store';
import { hasSync } from '@/lib/sync';
import { hasTmdb } from '@/lib/tmdb';

const SYNC_TEXT: Record<SyncState, string> = {
  local: 'Saved on this phone only. Sharing turns on once the app is connected to its online storage.',
  syncing: 'Syncing…',
  synced: 'Up to date on both phones.',
  offline: "Can't reach the shared list right now. Changes are saved and will sync when you're back online.",
};

export default function UsScreen() {
  const { household, me, members, rename, removeMember, joinHousehold, syncState, syncNow } = useStore();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [switchError, setSwitchError] = useState('');

  if (!household) {
    return (
      <Screen>
        <Welcome />
      </Screen>
    );
  }

  async function switchList() {
    setSwitchError('');
    try {
      await joinHousehold(newCode, me?.name || 'Me');
      setSwitching(false);
      setNewCode('');
    } catch (e) {
      setSwitchError((e as Error).message);
    }
  }

  async function copyCode() {
    await Clipboard.setStringAsync(household!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Screen>
      <Heading>Us</Heading>

      <View style={{ gap: Spacing.two }}>
        <Label>Your name</Label>
        <TextInput
          id="us-name"
          defaultValue={me?.name}
          onEndEditing={(e) => e.nativeEvent.text.trim() && rename(e.nativeEvent.text.trim())}
          style={styles.input}
          placeholderTextColor={Colors.muted}
        />
      </View>

      <View style={{ gap: Spacing.two }}>
        <Label>On this list</Label>
        {members.map((m, i) => (
          <View key={m.id} style={styles.member}>
            <View style={[styles.dot, { backgroundColor: Colors.members[i % Colors.members.length] }]} />
            <Body style={{ flex: 1 }}>
              {m.name}
              {m.id === me?.id ? <Text style={{ color: Colors.muted }}>  (you)</Text> : null}
            </Body>
            {m.id !== me?.id ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (confirming !== m.id) return setConfirming(m.id);
                  removeMember(m.id);
                  setConfirming(null);
                }}>
                <Text style={{ color: confirming === m.id ? Colors.end : Colors.muted, fontSize: 14 }}>
                  {confirming === m.id ? 'Tap again to remove' : 'Remove'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {hasSync ? (
        <Card style={{ gap: Spacing.two }}>
          <Label>Your list code</Label>
          <Pressable onPress={copyCode} accessibilityRole="button" accessibilityHint="Copies the code">
            <Text style={styles.code}>{household.code}</Text>
          </Pressable>
          <Body muted style={{ fontSize: 13 }}>
            {copied
              ? 'Copied.'
              : "To open this list on another phone or computer, choose “Open our shared list” and enter this code."}
          </Body>
        </Card>
      ) : null}

      {hasSync ? (
        switching ? (
          <View style={{ gap: Spacing.two }}>
            <Label>Switch to another list</Label>
            <TextInput
              id="us-switch-code"
              value={newCode}
              onChangeText={(t) => setNewCode(t.toUpperCase())}
              placeholder="List code"
              placeholderTextColor={Colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { letterSpacing: 4, fontWeight: '700' }]}
            />
            {switchError ? <Text style={{ color: Colors.end }}>{switchError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Button title="Cancel" onPress={() => setSwitching(false)} />
              <Button title="Switch" kind="primary" onPress={switchList} disabled={newCode.trim().length < 8} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setSwitching(true)} accessibilityRole="button">
            <Text style={{ color: Colors.lamp, fontSize: 15 }}>Switch to another list…</Text>
          </Pressable>
        )
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <Label>Sync</Label>
        <Pressable onPress={syncNow} disabled={!hasSync}>
          <Body muted>{SYNC_TEXT[syncState]}</Body>
        </Pressable>
        <Label>Show data</Label>
        <Body muted>{hasTmdb ? 'Connected to TMDB.' : 'Not connected yet. Posters, seasons and search need a TMDB token.'}</Body>
      </View>

      <Body muted style={{ fontSize: 12 }}>
        Show data, images and bios come from TMDB. This app uses the TMDB API but is not endorsed or certified by TMDB.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.cushion,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    fontSize: 17,
    color: Colors.text,
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dot: { width: 12, height: 12, borderRadius: 6 },
  code: { fontFamily: Fonts.mono, fontSize: 30, fontWeight: '700', letterSpacing: 6, color: Colors.lamp },
});
