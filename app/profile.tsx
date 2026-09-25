import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, IconButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { engineInfo } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import { activityLabels, dietLabels, formatKcal, goalLabels } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useNouri((s) => s.profile);
  const speakReplies = useNouri((s) => s.speakReplies);
  const setSpeakReplies = useNouri((s) => s.setSpeakReplies);
  const clearChat = useNouri((s) => s.clearChat);
  const seedDemoWeek = useNouri((s) => s.seedDemoWeek);
  const resetAll = useNouri((s) => s.resetAll);

  if (!profile) return null;
  const T = profile.targets;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          gap: 12,
        }}>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Sans size={20} weight="semi">
              {profile.name.charAt(0).toUpperCase()}
            </Sans>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()} style={styles.close}>
            <X size={18} color={colors.ink} />
          </IconButton>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Display size={28}>{profile.name}</Display>
          <Sans size={14} color={colors.faint}>
            {goalLabels[profile.goal]} · {dietLabels[profile.diet]}
          </Sans>
        </View>

        <Section title="Piano giornaliero">
          <Card style={{ padding: 16 }}>
            <View style={styles.targets}>
              <Target label="Calorie" value={formatKcal(T.kcal)} color={colors.ink} />
              <Target label="Proteine" value={`${T.protein} g`} color={colors.protein} />
              <Target label="Carbo" value={`${T.carbs} g`} color={colors.carbs} />
              <Target label="Grassi" value={`${T.fat} g`} color={colors.fat} />
            </View>
            <Sans size={13} color={colors.faint} style={{ marginTop: 14, lineHeight: 19 }}>
              Per cambiarlo dillo a Nouri in chat: “voglio più proteine”, “sono diventato vegano”,
              “ora peso 68 kg”.
            </Sans>
          </Card>
        </Section>

        <Section title="Su di te">
          <Card>
            <Row label="Obiettivo" value={goalLabels[profile.goal]} />
            <Row label="Alimentazione" value={dietLabels[profile.diet]} />
            <Row label="Evito" value={profile.avoid.length ? profile.avoid.join(', ') : 'Nulla'} />
            <Row label="Peso" value={profile.weight ? `${profile.weight} kg` : '—'} />
            <Row label="Attività" value={activityLabels[profile.activity]} />
            <Row label="Acqua" value={`${(T.water / 1000).toLocaleString('it-IT')} L`} last />
          </Card>
        </Section>

        <Section title="Assistente">
          <Card>
            <View style={[styles.row, styles.divider]}>
              <Sans size={15}>Motore</Sans>
              <View style={{ alignItems: 'flex-end' }}>
                <Sans size={14} weight="medium">
                  {engineInfo.label}
                </Sans>
                <Mono size={11}>{engineInfo.detail}</Mono>
              </View>
            </View>
            <Action
              label="Leggi ad alta voce le risposte"
              last
              right={
                <Switch
                  value={speakReplies}
                  onValueChange={(v) => {
                    haptic.select();
                    setSpeakReplies(v);
                  }}
                  trackColor={{ true: colors.ink, false: colors.bgMuted }}
                  thumbColor={colors.bg}
                />
              }
            />
          </Card>
          {engineInfo.id === 'local' && (
            <Sans size={13} color={colors.faint} style={{ marginTop: 8, lineHeight: 19 }}>
              Stai usando il motore offline dimostrativo. Imposta EXPO_PUBLIC_NOURI_API_URL (o una
              chiave Anthropic in sviluppo) per usare Claude, con analisi reale delle foto.
            </Sans>
          )}
        </Section>

        <Section title="Dati">
          <Card>
            <Action label="Riempi una settimana demo" onPress={seedDemoWeek} />
            <Action label="Cancella la conversazione" onPress={clearChat} />
            <Action
              label="Ricomincia da capo"
              danger
              last
              onPress={() => {
                resetAll();
                router.replace('/onboarding');
              }}
            />
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Sans
        size={13}
        weight="medium"
        color={colors.faint}
        style={{ marginBottom: 8, marginLeft: 4 }}>
        {title}
      </Sans>
      {children}
    </View>
  );
}

function Target({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Mono size={16} weight="medium" color={colors.ink}>
        {value}
      </Mono>
      <Sans size={12} color={colors.faint}>
        {label}
      </Sans>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Sans size={15}>{label}</Sans>
      <Sans size={14} color={colors.dim} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Sans>
    </View>
  );
}

function Action({
  label,
  onPress,
  right,
  danger,
  last,
}: {
  label: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.row,
        !last && styles.divider,
        pressed && { backgroundColor: colors.bgSubtle },
      ]}>
      <Sans size={15} color={danger ? colors.rose : colors.ink}>
        {label}
      </Sans>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { backgroundColor: colors.bgMuted },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgMuted,
  },
  targets: { flexDirection: 'row', gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
});
