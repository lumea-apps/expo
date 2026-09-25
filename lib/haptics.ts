import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  tap: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  soft: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}),
  select: () => enabled && Haptics.selectionAsync().catch(() => {}),
  success: () =>
    enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};
