import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Sans } from './Typography';

/** `close(after)` hides the sheet and runs `after` once it is gone (e.g. to open the camera). */
export type CloseSheet = (after?: () => void) => void;

export interface SheetSpec {
  title?: string;
  subtitle?: string;
  render: (close: CloseSheet) => ReactNode;
}

interface SheetApi {
  open: (spec: SheetSpec) => void;
  close: CloseSheet;
}

const SheetContext = createContext<SheetApi>({ open: () => {}, close: () => {} });

export const useSheet = () => useContext(SheetContext);

/**
 * Hosts one bottom sheet for a screen. It renders inside the screen (not a
 * native modal), so it also works above native modal screens and stays inside
 * the phone frame on web.
 */
export function SheetProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<SheetSpec | null>(null);
  const [visible, setVisible] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const open = useCallback((s: SheetSpec) => {
    haptic.soft();
    setSpec(s);
    setVisible(true);
  }, []);
  const close = useCallback<CloseSheet>((after) => {
    pending.current = after ?? null;
    setVisible(false);
  }, []);
  const dismiss = useCallback(() => close(), [close]);
  const onHidden = useCallback(() => {
    setSpec(null);
    const next = pending.current;
    pending.current = null;
    next?.();
  }, []);

  const api = useMemo(() => ({ open, close }), [open, close]);

  return (
    <SheetContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        {spec && (
          <SheetView
            spec={spec}
            visible={visible}
            onClose={dismiss}
            close={close}
            onHidden={onHidden}
          />
        )}
      </View>
    </SheetContext.Provider>
  );
}

function SheetView({
  spec,
  visible,
  onClose,
  close,
  onHidden,
}: {
  spec: SheetSpec;
  visible: boolean;
  onClose: () => void;
  close: CloseSheet;
  onHidden: () => void;
}) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(640);

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      progress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(onHidden)();
      });
    }
  }, [visible, progress, drag, onHidden]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (drag.value > 110 || e.velocityY > 900) runOnJS(onClose)();
      else drag.value = withSpring(0, { damping: 22, stiffness: 260 });
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.32 }));
  const panel = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (height.value + 40) + drag.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdrop]}>
        <Pressable accessibilityLabel="Chiudi" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.anchor}>
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => {
              height.value = e.nativeEvent.layout.height;
            }}
            style={[styles.panel, { paddingBottom: insets.bottom + 16 }, panel]}>
            <View style={styles.handle} />
            {(spec.title || spec.subtitle) && (
              <View style={styles.head}>
                {spec.title ? (
                  <Sans size={17} weight="semi" center>
                    {spec.title}
                  </Sans>
                ) : null}
                {spec.subtitle ? (
                  <Sans size={13} color={colors.faint} center style={{ marginTop: 2 }}>
                    {spec.subtitle}
                  </Sans>
                ) : null}
              </View>
            )}
            {spec.render(close)}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 16,
    paddingTop: 8,
    boxShadow: '0 -8px 40px rgba(14, 14, 16, 0.12)',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: 10,
  },
  head: { paddingHorizontal: 12, paddingBottom: 14 },
});
