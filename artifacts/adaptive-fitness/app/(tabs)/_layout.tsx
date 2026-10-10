import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';
type SFSymbol = Extract<SymbolViewProps['name'], string>;

const TABS: { name: string; title: string; sf: SFSymbol; sfOn: SFSymbol; feather: keyof typeof Feather.glyphMap }[] = [
  { name: 'index', title: 'Today', sf: 'sun.max', sfOn: 'sun.max.fill', feather: 'sun' },
  { name: 'plan', title: 'Plan', sf: 'calendar', sfOn: 'calendar', feather: 'calendar' },
  { name: 'library', title: 'Library', sf: 'books.vertical', sfOn: 'books.vertical.fill', feather: 'book-open' },
  { name: 'progress', title: 'Progress', sf: 'chart.bar', sfOn: 'chart.bar.fill', feather: 'bar-chart-2' },
  { name: 'settings', title: 'You', sf: 'person.crop.circle', sfOn: 'person.crop.circle.fill', feather: 'user' },
];

function NativeTabLayout() {
  return (
    <NativeTabs>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Icon sf={{ default: t.sf, selected: t.sfOn }} />
          <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) =>
              isIOS ? <SymbolView name={t.sf} tintColor={color} size={24} /> : <Feather name={t.feather} size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
