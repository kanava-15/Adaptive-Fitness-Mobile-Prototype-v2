import { AccessibilityInfo, findNodeHandle, Platform, View } from 'react-native';

export function focusDetailTarget(target: View | null) {
  if (!target) return;
  if (Platform.OS === 'web') {
    (target as unknown as { focus?: (options?: { preventScroll: boolean }) => void }).focus?.({ preventScroll: true });
  } else {
    const handle = findNodeHandle(target);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }
}
