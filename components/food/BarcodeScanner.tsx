import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const WINDOW = { width: 272, height: 168 };

/**
 * Full-screen barcode reader (EAN/UPC). Reports each code once; `status`
 * lets the parent show "looking up…" or "not found" over the camera.
 */
export function BarcodeScanner({
  onCode,
  onClose,
  status,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  status: { busy?: boolean; message?: string };
}) {
  const insets = useSafeAreaInsets();
  const [permission, request] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const last = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) request();
  }, [permission, request]);

  const scanned = (r: BarcodeScanningResult) => {
    if (status.busy) return;
    const now = Date.now();
    // the same code keeps arriving while it stays in frame
    if (last.current && last.current.code === r.data && now - last.current.at < 3000) return;
    last.current = { code: r.data, at: now };
    haptic.success();
    onCode(r.data);
  };

  const granted = permission?.granted;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={scanned}
        />
      ) : null}

      {/* dimmed frame around the reading window */}
      <View pointerEvents="none" style={styles.mask}>
        <View style={styles.shade} />
        <View style={{ flexDirection: 'row', height: WINDOW.height }}>
          <View style={styles.shade} />
          <View style={styles.window}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.shade} />
        </View>
        <View style={[styles.shade, { alignItems: 'center', paddingTop: 22 }]}>
          <Sans size={15} weight="medium" color="#FFFFFF" center>
            Inquadra il codice a barre
          </Sans>
          <Sans size={13} color="rgba(255,255,255,0.7)" center style={{ marginTop: 4 }}>
            Lo riconosco da solo, senza scatti
          </Sans>
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <IconButton label="Chiudi lo scanner" onPress={onClose} style={styles.round}>
          <Icon name="close-linear" size={22} color="#FFFFFF" />
        </IconButton>
        {granted ? (
          <IconButton
            label={torch ? 'Spegni la torcia' : 'Accendi la torcia'}
            onPress={() => setTorch((t) => !t)}
            style={[styles.round, torch && { backgroundColor: '#FFFFFF' }]}>
            <Icon
              name={torch ? 'flashlight-on-linear' : 'flashlight-linear'}
              size={22}
              color={torch ? colors.ink : '#FFFFFF'}
            />
          </IconButton>
        ) : null}
      </View>

      {!granted && permission ? (
        <View style={styles.permission}>
          <Icon name="barcode-scan-bold-duotone" size={44} color="#FFFFFF" />
          <Sans size={16} weight="medium" color="#FFFFFF" center>
            Serve la fotocamera per leggere i codici a barre
          </Sans>
          {permission.canAskAgain ? (
            <PrimaryButton
              label="Consenti la fotocamera"
              variant="outline"
              onPress={request}
              style={{ alignSelf: 'stretch' }}
            />
          ) : (
            <Sans size={13} color="rgba(255,255,255,0.7)" center>
              Puoi attivarla dalle impostazioni del telefono.
            </Sans>
          )}
        </View>
      ) : null}

      {status.busy || status.message ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.pill, { bottom: insets.bottom + 36 }]}>
          {status.busy ? <ActivityIndicator color={colors.ink} size="small" /> : null}
          <Sans size={14} weight="medium">
            {status.busy ? 'Cerco il prodotto…' : status.message}
          </Sans>
        </Animated.View>
      ) : null}
    </View>
  );
}

const C = 22;
const styles = StyleSheet.create({
  root: { backgroundColor: '#000', zIndex: 50 },
  mask: { ...StyleSheet.absoluteFillObject },
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  window: { width: WINDOW.width, height: WINDOW.height },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  round: { backgroundColor: 'rgba(255,255,255,0.18)' },
  permission: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: '32%',
    alignItems: 'center',
    gap: 16,
  },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
});
