import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeScanner } from '@/components/food/BarcodeScanner';
import { FoodDetail } from '@/components/food/FoodDetail';
import { FoodThumb } from '@/components/food/NutritionFacts';
import { Icon } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Surface';
import { Toast, useToast } from '@/components/ui/Toast';
import { Sans } from '@/components/ui/Typography';
import { colors, fonts, radii } from '@/constants/theme';
import { nutrientsFor, searchLocal } from '@/lib/foodfacts';
import { isBarcode, lookupBarcode, searchProducts } from '@/lib/foodsearch';
import { haptic } from '@/lib/haptics';
import { formatKcal, mealTotals } from '@/lib/nutrition';
import { logShortcut } from '@/lib/shortcuts';
import { useNouri } from '@/lib/store';
import type { FoodFacts } from '@/lib/types';
import { useSend } from '@/lib/useSend';

const SUGGESTED = ['Yogurt greco', 'Banana', 'Uova', 'Pasta', 'Mozzarella', 'Pizza', 'Avocado'];
const CAN_SCAN = Platform.OS !== 'web';

export default function Search() {
  return (
    <SheetProvider>
      <SearchContent />
    </SheetProvider>
  );
}

type Remote = { state: 'idle' | 'loading' | 'done' | 'error'; items: FoodFacts[] };

function SearchContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const send = useSend();
  const toast = useToast();
  const params = useLocalSearchParams<{ scan?: string }>();
  const recent = useNouri((s) => s.recentFoods);
  const shortcuts = useNouri((s) => s.shortcuts);

  const [q, setQ] = useState('');
  const [remote, setRemote] = useState<Remote>({ state: 'idle', items: [] });
  const [scanning, setScanning] = useState(CAN_SCAN && params.scan === '1');
  const [scan, setScan] = useState<{ busy?: boolean; message?: string }>({});
  const input = useRef<TextInput>(null);

  const local = useMemo(() => searchLocal(q), [q]);
  const query = q.trim();

  // Packaged products: debounced, cancelled when the query changes.
  useEffect(() => {
    if (query.length < 3) {
      setRemote({ state: 'idle', items: [] });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(
      async () => {
        setRemote((r) => ({ state: 'loading', items: r.items }));
        try {
          const items = isBarcode(query)
            ? await lookupBarcode(query, ctrl.signal).then((f) => (f ? [f] : []))
            : await searchProducts(query, ctrl.signal);
          setRemote({ state: 'done', items });
        } catch {
          if (!ctrl.signal.aborted) setRemote({ state: 'error', items: [] });
        }
      },
      Platform.OS === 'web' ? 650 : 350
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const ask = useCallback(
    (text: string) => {
      router.back();
      setTimeout(() => send({ text }), 350);
    },
    [router, send]
  );

  const open = useCallback(
    (food: FoodFacts) => {
      Keyboard.dismiss();
      sheet.open({
        render: (close) => (
          <FoodDetail
            food={food}
            onAdded={(summary) => close(() => toast.show(`Nel diario: ${summary}`))}
            onAsk={() => close(() => ask(`Com’è ${food.name.toLowerCase()} per i miei obiettivi?`))}
          />
        ),
      });
    },
    [sheet, toast, ask]
  );

  const onCode = async (code: string) => {
    setScan({ busy: true });
    try {
      const food = await lookupBarcode(code);
      if (!food) {
        setScan({ message: 'Prodotto non trovato: prova a cercarlo per nome' });
        return;
      }
      setScan({});
      setScanning(false);
      open(food);
    } catch {
      setScan({ message: 'Nessuna connessione: riprova tra poco' });
    }
  };

  const perPortion = (f: FoodFacts) => nutrientsFor(f, f.portion.grams).kcal;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.field}>
          <Icon name="magnifer-linear" size={18} color={colors.faint} />
          <TextInput
            ref={input}
            value={q}
            onChangeText={setQ}
            autoFocus={!scanning}
            placeholder="Alimento, prodotto o codice a barre"
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            autoCorrect={false}
            selectionColor={colors.ink}
            style={styles.input}
          />
          {q ? (
            <Pressable accessibilityLabel="Cancella" hitSlop={8} onPress={() => setQ('')}>
              <Icon name="close-circle-bold" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
        {CAN_SCAN ? (
          <Pressable
            accessibilityLabel="Scansiona un codice a barre"
            onPress={() => {
              haptic.tap();
              Keyboard.dismiss();
              setScan({});
              setScanning(true);
            }}
            style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}>
            <Icon name="barcode-scan-linear" size={20} color={colors.onAccent} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Sans size={15} weight="medium" color={colors.dim}>
            Chiudi
          </Sans>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 22 }}>
        {!query ? (
          <>
            {CAN_SCAN ? (
              <Pressable
                onPress={() => {
                  haptic.tap();
                  Keyboard.dismiss();
                  setScanning(true);
                }}
                style={({ pressed }) => [
                  styles.scanCard,
                  pressed && { backgroundColor: colors.bgMuted },
                ]}>
                <View style={styles.scanIcon}>
                  <Icon name="barcode-scan-bold-duotone" size={26} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Sans size={15} weight="semi">
                    Scansiona un prodotto
                  </Sans>
                  <Sans size={13} color={colors.faint}>
                    Valori nutrizionali dal codice a barre, in un secondo
                  </Sans>
                </View>
                <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
              </Pressable>
            ) : null}

            {shortcuts.length > 0 && (
              <MenuGroup title="Le tue scorciatoie" footer="Un tocco e il pasto è nel diario.">
                {shortcuts.slice(0, 4).map((sc) => (
                  <MenuRow
                    key={sc.id}
                    icon="bolt-circle-bold-duotone"
                    tint="amber"
                    label={sc.name}
                    hint={`${sc.meal.label} · ${formatKcal(mealTotals(sc.meal).kcal)} kcal`}
                    right={
                      <Sans size={13} weight="medium" color={colors.dim}>
                        Registra
                      </Sans>
                    }
                    onPress={() => {
                      logShortcut(sc);
                      toast.show(`${sc.name} è nel diario`);
                    }}
                  />
                ))}
              </MenuGroup>
            )}

            {recent.length > 0 && (
              <View>
                <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                  Recenti
                </Sans>
                <View style={styles.list}>
                  {recent.map((f, i) => (
                    <ResultRow key={f.id} food={f} first={i === 0} onPress={() => open(f)} />
                  ))}
                </View>
              </View>
            )}

            <View>
              <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                Prova con
              </Sans>
              <View style={styles.chips}>
                {SUGGESTED.map((s) => (
                  <Chip key={s} label={s} onPress={() => setQ(s)} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {local.length > 0 && (
              <View>
                <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                  Alimenti comuni
                </Sans>
                <View style={styles.list}>
                  {local.map((f, i) => (
                    <ResultRow
                      key={f.id}
                      food={f}
                      first={i === 0}
                      detail={`${f.portion.label} · ${formatKcal(perPortion(f))} kcal`}
                      onPress={() => open(f)}
                    />
                  ))}
                </View>
              </View>
            )}

            {query.length >= 3 && (
              <View>
                <View style={styles.sectionRow}>
                  <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                    {isBarcode(query) ? 'Codice a barre' : 'Prodotti confezionati'}
                  </Sans>
                  {remote.state === 'loading' && (
                    <ActivityIndicator size="small" color={colors.faint} />
                  )}
                </View>
                {remote.items.length > 0 ? (
                  <View style={styles.list}>
                    {remote.items.map((f, i) => (
                      <ResultRow
                        key={f.id}
                        food={f}
                        first={i === 0}
                        detail={[f.brand, `${formatKcal(f.per100.kcal)} kcal / 100 g`]
                          .filter(Boolean)
                          .join(' · ')}
                        onPress={() => open(f)}
                      />
                    ))}
                  </View>
                ) : (
                  <Sans size={13} color={colors.faint} style={styles.note}>
                    {remote.state === 'error'
                      ? 'Non riesco a raggiungere Open Food Facts. Gli alimenti comuni funzionano anche offline.'
                      : remote.state === 'loading'
                        ? 'Cerco tra i prodotti…'
                        : remote.state === 'done'
                          ? 'Nessun prodotto con questo nome.'
                          : ' '}
                  </Sans>
                )}
              </View>
            )}

            <MenuGroup>
              <MenuRow
                icon="chat-round-dots-bold-duotone"
                tint="violet"
                label={`Chiedi a Nouri di “${query}”`}
                hint="Stima anche piatti e porzioni fuori dagli elenchi"
                chevron
                onPress={() => ask(`Quante calorie ha ${query}?`)}
              />
            </MenuGroup>

            <Sans size={11} color={colors.faint} center>
              Prodotti confezionati: Open Food Facts (ODbL)
            </Sans>
          </>
        )}
      </ScrollView>

      {scanning && (
        <BarcodeScanner
          status={scan}
          onCode={onCode}
          onClose={() => {
            setScanning(false);
            setScan({});
          }}
        />
      )}
      <Toast message={toast.message} bottom={insets.bottom + 24} />
    </View>
  );
}

function ResultRow({
  food,
  detail,
  first,
  onPress,
}: {
  food: FoodFacts;
  detail?: string;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        !first && styles.divider,
        pressed && { backgroundColor: colors.bgSubtle },
      ]}>
      <FoodThumb food={food} size={38} />
      <View style={{ flex: 1 }}>
        <Sans size={15} weight="medium" numberOfLines={1}>
          {food.name}
        </Sans>
        <Sans size={12} color={colors.faint} numberOfLines={1}>
          {detail ??
            `${food.portion.label} · ${formatKcal(nutrientsFor(food, food.portion.grams).kcal)} kcal`}
        </Sans>
      </View>
      <Icon name="add-circle-linear" size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgMuted,
  },
  input: {
    flex: 1,
    height: 42,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  scanBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSubtle,
  },
  scanIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { marginLeft: 4, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { marginLeft: 4, lineHeight: 19 },
});
