import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Card, Heading, Label, Screen } from '@/components/ui';
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
  const { household, me, members, rename, removeMember, syncState, syncNow } = useStore();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!household) {
    return (
      <Screen>
        <Welcome />
      </Screen>
    );
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
          <Label>Invite code</Label>
          <Pressable onPress={copyCode} accessibilityRole="button" accessibilityHint="Copies the code">
            <Text style={styles.code}>{household.code}</Text>
          </Pressable>
          <Body muted style={{ fontSize: 13 }}>
            {copied
              ? 'Copied.'
              : "On your partner's phone, open Couch Queue, tap “Join my partner's list” and enter this code."}
          </Body>
        </Card>
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
