import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const success = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

export function confirm(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function useTopInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
}
export function useBottomPad() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? 84 + 24 : insets.bottom + 96;
}

type Variant = 'primary' | 'accent' | 'ghost' | 'soft' | 'danger';
export function Button({ label, onPress, variant = 'primary', icon, disabled, style, testID, compact }: { label: string; onPress: () => void; variant?: Variant; icon?: keyof typeof Feather.glyphMap; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string; compact?: boolean }) {
  const c = useColors();
  const map: Record<Variant, [string, string, string]> = {
    primary: [c.primary, c.primaryForeground, c.primary],
    accent: [c.accent, c.accentForeground, c.accent],
    ghost: ['transparent', c.foreground, c.border],
    soft: [c.secondary, c.secondaryForeground, c.secondary],
    danger: ['transparent', c.destructive, c.destructive],
  };
  const [bg, fg, bd] = map[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        compact && { minHeight: 44, paddingHorizontal: 14 },
        { backgroundColor: bg, borderColor: bd, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'default', testID }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string; tone?: 'default' | 'onDark'; testID?: string }) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: tone === 'onDark' ? 'rgba(241,238,221,0.12)' : c.muted, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <Feather name={icon} size={20} color={tone === 'onDark' ? c.accentForeground : c.foreground} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, testID }: { label: string; active?: boolean; onPress: () => void; icon?: keyof typeof Feather.glyphMap; testID?: string }) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, { backgroundColor: active ? c.accent : c.card, borderColor: active ? c.accent : c.border, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      {icon ? <Feather name={icon} size={15} color={active ? c.accentForeground : c.foreground} /> : null}
      <Text style={[styles.chipText, { color: active ? c.accentForeground : c.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.eyebrow, { color: c.mutedForeground }, style]}>{children}</Text>;
}

export function ScreenTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text style={[styles.title, { color: c.foreground }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.secondary }]}>
        <Feather name={icon} size={22} color={c.secondaryForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: c.mutedForeground, textAlign: 'center' }]}>{body}</Text>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { minHeight: 54, borderRadius: 999, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 16, letterSpacing: 0.1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  card: { borderRadius: 22, borderWidth: 1, padding: 18 },
  eyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 20 },
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, marginTop: 4 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 22, padding: 24, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 },
});
