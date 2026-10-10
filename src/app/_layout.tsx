import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ListAutomation } from '@/components/list-automation';
import { Colors } from '@/constants/theme';
import { StoreProvider, useStore } from '@/lib/store';
import { useWebAutoUpdate } from '@/lib/web-updates';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.night, card: Colors.sofa, primary: Colors.lamp, text: Colors.text },
};

function HideSplashWhenReady() {
  const { ready } = useStore();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  return null;
}

export default function RootLayout() {
  useWebAutoUpdate();
  return (
    <ThemeProvider value={theme}>
      <StoreProvider>
        <HideSplashWhenReady />
        <ListAutomation />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerTransparent: true,
            headerTitle: '',
            headerTintColor: Colors.text,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: Colors.night },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="show/[id]" />
          <Stack.Screen name="person/[id]" />
        </Stack>
      </StoreProvider>
    </ThemeProvider>
  );
}
