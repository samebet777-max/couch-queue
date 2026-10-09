import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Tone } from '@/lib/next-season';
import { imageUrl } from '@/lib/tmdb';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Heading({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.heading, style]}>
      {children}
    </Text>
  );
}

export function Body({ muted, style, ...rest }: TextProps & { muted?: boolean }) {
  return <Text {...rest} style={[styles.body, muted && { color: Colors.muted }, style]} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const toneColor: Record<Tone, string> = { ok: Colors.ok, warn: Colors.warn, info: Colors.info, end: Colors.end };

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <View style={[styles.pill, { borderColor: toneColor[tone] }]}>
      <Text style={[styles.pillText, { color: toneColor[tone] }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

// Fallback art when TMDB has no image: a gradient picked from the id, so it stays stable.
const FALLBACKS: [string, string][] = [
  ['#2c5e6e', '#0e2229'],
  ['#b4472f', '#3a120b'],
  ['#5b6b3a', '#1b2110'],
  ['#6a4c93', '#1c1230'],
  ['#c48a3a', '#3a2208'],
];

export function Poster({
  path,
  id,
  width,
  round,
  size = 'w342',
}: {
  path: string | null | undefined;
  id: number;
  width: number;
  round?: boolean;
  size?: 'w92' | 'w185' | 'w342';
}) {
  const height = round ? width : width * 1.5;
  const frame = { width, height, borderRadius: round ? width / 2 : Radius.small, overflow: 'hidden' as const };
  const uri = imageUrl(path, size);
  if (uri) return <Image source={{ uri }} style={frame} contentFit="cover" transition={200} />;
  return <LinearGradient colors={FALLBACKS[id % FALLBACKS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={frame} />;
}

export function ProgressBar({ value, color, initial }: { value: number; color: string; initial: string }) {
  return (
    <View style={styles.progressRow}>
      <Text style={[styles.progressInitial, { color }]}>{initial}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(Math.min(1, value) * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'secondary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: Colors.lamp },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, primary && { color: Colors.lampInk }]}>{title}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.chip, on && { backgroundColor: Colors.lamp }]}>
            <Text style={[styles.chipText, on && { color: Colors.lampInk, fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, style, hot }: { children: ReactNode; style?: ViewStyle; hot?: boolean }) {
  return <View style={[styles.card, hot && { borderColor: 'rgba(242,178,92,0.45)' }, style]}>{children}</View>;
}

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: Spacing.six }}>
      <ActivityIndicator color={Colors.lamp} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.night },
  scroll: { paddingBottom: 120 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  heading: { fontFamily: Fonts.display, fontSize: 30, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  body: { fontSize: 15, lineHeight: 22, color: Colors.text },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressInitial: { fontSize: 11, fontWeight: '700', width: 12 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.line, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.cushion,
  },
  buttonText: { fontWeight: '700', fontSize: 14, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: Colors.cushion },
  chipText: { fontSize: 13, color: Colors.muted },
  card: {
    backgroundColor: Colors.cushion,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notice: {
    borderRadius: Radius.medium,
    padding: Spacing.four,
    gap: Spacing.two,
    backgroundColor: 'rgba(242,178,92,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(242,178,92,0.35)',
  },
  noticeTitle: { fontWeight: '700', fontSize: 15, color: Colors.lamp },
});
