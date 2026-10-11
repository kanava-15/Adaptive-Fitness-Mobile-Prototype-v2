import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { TempoProvider } from '@/context/TempoContext';
import colors from '@/constants/colors';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { CatalogProvider } from '@/context/CatalogContext';

// Native bundles run outside the web proxy. Origin is configured per build, never a preview literal.
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
if (apiDomain) setBaseUrl(apiDomain.startsWith('https://') ? apiDomain : `https://${apiDomain}`);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false, contentStyle: { backgroundColor: colors.light.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup" options={{ presentation: 'modal' }} />
      <Stack.Screen name="adjust" options={{ presentation: 'modal' }} />
      <Stack.Screen name="exercise-edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="builder" options={{ presentation: 'modal' }} />
      <Stack.Screen name="schedule-add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="content-exchange" options={{ presentation: 'modal' }} />
      <Stack.Screen name="activity-import" options={{ presentation: 'modal' }} />
      <Stack.Screen name="catalog-search" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="occurrence" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <CatalogProvider>
                <TempoProvider>
                  <RootLayoutNav />
                </TempoProvider>
              </CatalogProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
