import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Plus,
  ShoppingBasket,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
import { colors, gradientFor, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { Idea, Recipe, SwapFood } from '@/lib/types';

function Meta({
  icon,
  text,
  color = colors.dim,
}: {
  icon?: React.ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <View style={styles.meta}>
      {icon}
      <Mono size={11} color={color}>
        {text}
      </Mono>
    </View>
  );
}

export function RecipeCard({ recipe, widgetKey }: { recipe: Recipe; widgetKey: string }) {
  const [open, setOpen] = useState(false);
  const logged = useNouri((s) => Boolean(s.logged[widgetKey]));
  const logMeal = useNouri((s) => s.logMeal);
  const [g1, g2] = gradientFor(recipe.title);
  return (
    <Card style={{ padding: 0 }}>
      <LinearGradient
        colors={[g2, g1, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.recipeHero}>
        <Sans size={54} style={{ lineHeight: 64 }}>
          {recipe.emoji}
        </Sans>
        <Serif size={28} style={{ marginTop: 8 }}>
          {recipe.title}
        </Serif>
        <Sans size={14} color={colors.dim} style={{ marginTop: 4 }}>
          {recipe.tagline}
        </Sans>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          <Meta icon={<Clock size={12} color={colors.dim} />} text={`${recipe.minutes} min`} />
          <Meta
            icon={<Flame size={12} color={colors.lime} />}
            text={`${formatKcal(recipe.kcal)} kcal`}
            color={colors.lime}
          />
          <Meta text={`P ${recipe.protein}g`} color={colors.protein} />
          <Meta text={`C ${recipe.carbs}g`} color={colors.carbs} />
          <Meta text={`G ${recipe.fat}g`} color={colors.fat} />
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Mono upper size={10} style={{ marginBottom: 8 }}>
          Ingredienti · 1 persona
        </Mono>
        {recipe.ingredients.map((ing) => (
          <View key={ing} style={styles.ingredient}>
            <View style={styles.bullet} />
            <Sans size={14} color={colors.ink} style={{ flex: 1 }}>
              {ing}
            </Sans>
          </View>
        ))}

        <Pressable
          onPress={() => {
            haptic.select();
            setOpen((o) => !o);
          }}
          style={styles.toggle}>
          <Sans size={14} weight="medium">
            {open ? 'Nascondi procedimento' : 'Mostra procedimento'}
          </Sans>
          <ChevronDown
            size={16}
            color={colors.ink}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {open && (
          <Animated.View entering={FadeIn} style={{ gap: 12, marginBottom: 16 }}>
            {recipe.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <Serif size={24} italic color={colors.lime} style={{ width: 20 }}>
                  {i + 1}
                </Serif>
                <Sans size={14} color={colors.dim} style={{ flex: 1, marginTop: 3 }}>
                  {s}
                </Sans>
              </View>
            ))}
          </Animated.View>
        )}

        {logged ? (
          <View style={styles.done}>
            <Check size={16} color={colors.lime} />
            <Sans size={14} weight="medium" color={colors.lime}>
              Aggiunta al diario di oggi
            </Sans>
          </View>
        ) : (
          <PrimaryButton
            label="L’ho mangiata: registra"
            style={{ height: 48 }}
            icon={<Plus size={16} color={colors.onAccent} />}
            onPress={() => {
              logMeal(
                {
                  title: recipe.title,
                  emoji: recipe.emoji,
                  label: labelForTime(),
                  items: [
                    {
                      name: recipe.title,
                      emoji: recipe.emoji,
                      qty: '1 porzione',
                      kcal: recipe.kcal,
                      protein: recipe.protein,
                      carbs: recipe.carbs,
                      fat: recipe.fat,
                    },
                  ],
                },
                'recipe',
                widgetKey
              );
              haptic.success();
            }}
          />
        )}
      </View>
    </Card>
  );
}

export function IdeasCarousel({
  ideas,
  onPick,
}: {
  ideas: Idea[];
  onPick: (text: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingRight: 20 }}
      style={{ marginHorizontal: -20, paddingLeft: 20 }}>
      {ideas.map((idea, i) => {
        const [g1, g2] = gradientFor(idea.title);
        return (
          <Animated.View
            key={idea.title}
            entering={FadeInRight.delay(i * 90)
              .springify()
              .damping(18)}>
            <Pressable
              onPress={() => onPick(`Ricetta: ${idea.title}`)}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
              <Card style={{ width: 208 }} radius={radii.md}>
                <LinearGradient
                  colors={[g2, g1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ideaHero}>
                  <Sans size={42} style={{ lineHeight: 50 }}>
                    {idea.emoji}
                  </Sans>
                  <View style={styles.ideaTime}>
                    <Clock size={11} color={colors.ink} />
                    <Mono size={10} color={colors.ink}>
                      {idea.minutes}′
                    </Mono>
                  </View>
                </LinearGradient>
                <View style={{ padding: 12, gap: 4 }}>
                  <Sans size={14} weight="semi" numberOfLines={2} style={{ minHeight: 40 }}>
                    {idea.title}
                  </Sans>
                  <Sans size={12} color={colors.faint} numberOfLines={2} style={{ minHeight: 34 }}>
                    {idea.tagline}
                  </Sans>
                  <View style={[styles.rowBetween, { marginTop: 6 }]}>
                    <Mono size={11} color={colors.lime}>
                      {formatKcal(idea.kcal)} KCAL
                    </Mono>
                    <Mono size={11} color={colors.protein}>
                      P {idea.protein}G
                    </Mono>
                  </View>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

export function SwapCard({ from, to, reason }: { from: SwapFood; to: SwapFood; reason: string }) {
  const dk = from.kcal - to.kcal;
  const dp = to.protein - from.protein;
  return (
    <Card style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.swapSide, { opacity: 0.6 }]}>
          <Sans size={30}>{from.emoji}</Sans>
          <Sans
            size={13}
            weight="medium"
            center
            numberOfLines={2}
            style={{ textDecorationLine: 'line-through' }}>
            {from.name}
          </Sans>
          <Mono size={11}>{formatKcal(from.kcal)} kcal</Mono>
        </View>
        <View style={styles.swapArrow}>
          <ArrowRight size={16} color={colors.onAccent} />
        </View>
        <View
          style={[
            styles.swapSide,
            { borderColor: 'rgba(212,255,58,0.4)', backgroundColor: colors.limeSoft },
          ]}>
          <Sans size={30}>{to.emoji}</Sans>
          <Sans size={13} weight="semi" center numberOfLines={2}>
            {to.name}
          </Sans>
          <Mono size={11} color={colors.lime}>
            {formatKcal(to.kcal)} kcal
          </Mono>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        {dk !== 0 && (
          <Meta
            text={`${dk > 0 ? '−' : '+'}${formatKcal(Math.abs(dk))} kcal`}
            color={dk > 0 ? colors.lime : colors.amber}
          />
        )}
        {dp !== 0 && (
          <Meta
            text={`${dp > 0 ? '+' : '−'}${Math.abs(dp)} g proteine`}
            color={dp > 0 ? colors.protein : colors.faint}
          />
        )}
      </View>
      <Sans size={14} color={colors.dim} style={{ marginTop: 10 }}>
        {reason}
      </Sans>
    </Card>
  );
}

export function GroceryCard({
  sections,
  widgetKey,
}: {
  sections: { title: string; items: string[] }[];
  widgetKey: string;
}) {
  const checked = useNouri((s) => s.checked);
  const toggle = useNouri((s) => s.toggleChecked);
  const all = sections.flatMap((s) => s.items.map((it) => `${widgetKey}:${s.title}:${it}`));
  const done = all.filter((k) => checked[k]).length;
  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ShoppingBasket size={16} color={colors.lime} />
          <Sans size={15} weight="semi">
            Lista della spesa
          </Sans>
        </View>
        <Mono size={11} color={done === all.length ? colors.lime : colors.faint}>
          {done}/{all.length}
        </Mono>
      </View>
      {sections.map((sec) => (
        <View key={sec.title} style={{ marginTop: 14 }}>
          <Mono upper size={10} style={{ marginBottom: 4 }}>
            {sec.title}
          </Mono>
          {sec.items.map((it) => {
            const key = `${widgetKey}:${sec.title}:${it}`;
            const on = Boolean(checked[key]);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  haptic.select();
                  toggle(key);
                }}
                style={styles.groceryRow}>
                <View
                  style={[
                    styles.checkbox,
                    on && { backgroundColor: colors.lime, borderColor: colors.lime },
                  ]}>
                  {on && <Check size={12} color={colors.onAccent} strokeWidth={3} />}
                </View>
                <Sans
                  size={14}
                  color={on ? colors.faint : colors.ink}
                  style={on ? { textDecorationLine: 'line-through' } : undefined}>
                  {it}
                </Sans>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeHero: { padding: 16, paddingBottom: 18, marginBottom: 4 },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lime },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  done: {
    height: 48,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.limeSoft,
  },
  ideaHero: { height: 96, alignItems: 'center', justifyContent: 'center' },
  ideaTime: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  swapSide: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
