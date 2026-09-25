import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Cpu, RotateCcw, Sparkles, Trash2, Volume2, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '@/components/ui/Aurora';
import { Card, IconButton } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
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
      <Aurora preset="calm" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          gap: 14,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={20} color={colors.ink} />
          </IconButton>
        </View>

        <View style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <LinearGradient
            colors={[colors.carbs, colors.protein]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}>
            <Serif size={44} color={colors.onAccent}>
              {profile.name.charAt(0).toUpperCase()}
            </Serif>
          </LinearGradient>
          <Serif size={40}>{profile.name}</Serif>
          <Mono upper size={11}>
            {goalLabels[profile.goal]} · {dietLabels[profile.diet]}
          </Mono>
        </View>

        <Card style={{ padding: 16 }}>
          <Mono upper size={10}>
            Il tuo ritmo quotidiano
          </Mono>
          <View style={styles.targets}>
            <Target label="Kcal" value={formatKcal(T.kcal)} color={colors.lime} />
            <Target label="Proteine" value={`${T.protein}g`} color={colors.protein} />
            <Target label="Carbo" value={`${T.carbs}g`} color={colors.carbs} />
            <Target label="Grassi" value={`${T.fat}g`} color={colors.fat} />
          </View>
          <Sans size={13} color={colors.faint} style={{ marginTop: 12 }}>
            Calcolato da obiettivo, peso e attività. Per ricalcolarlo, ricomincia da capo qui sotto.
          </Sans>
        </Card>

        <Card>
          <Row label="Obiettivo" value={goalLabels[profile.goal]} />
          <Row label="Alimentazione" value={dietLabels[profile.diet]} />
          <Row label="Evito" value={profile.avoid.length ? profile.avoid.join(', ') : 'Nulla'} />
          <Row label="Peso" value={profile.weight ? `${profile.weight} kg` : '—'} />
          <Row label="Attività" value={activityLabels[profile.activity]} />
          <Row label="Acqua" value={`${(T.water / 1000).toLocaleString('it-IT')} L`} last />
        </Card>

        <Card style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color={engineInfo.id === 'claude' ? colors.lime : colors.carbs} />
            <View style={{ flex: 1 }}>
              <Sans size={15} weight="semi">
                Cervello: {engineInfo.label}
              </Sans>
              <Mono size={11}>{engineInfo.detail}</Mono>
            </View>
          </View>
          {engineInfo.id === 'local' && (
            <Sans size={13} color={colors.faint}>
              Stai usando il motore offline dimostrativo. Imposta EXPO_PUBLIC_NOURI_API_URL (o una
              chiave Anthropic in sviluppo) per attivare Claude, con analisi reale delle foto.
            </Sans>
          )}
        </Card>

        <Card>
          <Action
            icon={<Volume2 size={18} color={colors.ink} />}
            label="Leggi ad alta voce le risposte"
            right={
              <Switch
                value={speakReplies}
                onValueChange={(v) => {
                  haptic.select();
                  setSpeakReplies(v);
                }}
                trackColor={{ true: colors.lime, false: colors.ghost }}
                thumbColor={colors.ink}
              />
            }
          />
          <Action
            icon={<Sparkles size={18} color={colors.ink} />}
            label="Riempi una settimana demo"
            onPress={seedDemoWeek}
          />
          <Action
            icon={<Trash2 size={18} color={colors.ink} />}
            label="Cancella la conversazione"
            onPress={clearChat}
          />
          <Action
            icon={<RotateCcw size={18} color={colors.rose} />}
            label="Ricomincia da capo"
            danger
            last
            onPress={() => {
              resetAll();
              router.replace('/onboarding');
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function Target({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Mono size={17} weight="medium" color={colors.ink}>
        {value}
      </Mono>
      <Mono upper size={9}>
        {label}
      </Mono>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Sans size={14} color={colors.dim}>
        {label}
      </Sans>
      <Sans size={14} weight="medium" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Sans>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  right,
  danger,
  last,
}: {
  icon: ReactNode;
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
        pressed && { backgroundColor: colors.cardHover },
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {icon}
        <Sans size={15} color={danger ? colors.rose : colors.ink}>
          {label}
        </Sans>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targets: { flexDirection: 'row', gap: 10, marginTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
});
