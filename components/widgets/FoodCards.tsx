import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import { boughtKey, entryOf } from '@/lib/grocery';
import type { GroceryItem, Idea, Recipe, SwapFood } from '@/lib/types';

function EmojiTile({ emoji, size = 40 }: { emoji: string; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Sans size={size * 0.5} style={{ lineHeight: size * 0.62 }}>
        {emoji}
      </Sans>
    </View>
  );
}

function Stat({
  value,
  label,
  color = colors.ink,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Mono size={14} weight="medium" color={color}>
        {value}
      </Mono>
      <Sans size={11} color={colors.faint}>
        {label}
      </Sans>
    </View>
  );
}

export function RecipeCard({ recipe, widgetKey }: { recipe: Recipe; widgetKey: string }) {
  const [open, setOpen] = useState(false);
  const logged = useNouri((s) => Boolean(s.logged[widgetKey]));
  const logMeal = useNouri((s) => s.logMeal);
  return (
    <Card>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <EmojiTile emoji={recipe.emoji} />
          <View style={{ flex: 1 }}>
            <Display size={19} style={{ lineHeight: 24 }}>
              {recipe.title}
            </Display>
            <Sans size={13} color={colors.faint} style={{ marginTop: 2 }}>
              {recipe.tagline}
            </Sans>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={`${recipe.minutes}′`} label="tempo" />
          <Stat value={formatKcal(recipe.kcal)} label="kcal" />
          <Stat value={`${recipe.protein}g`} label="proteine" color={colors.protein} />
          <Stat value={`${recipe.carbs}g`} label="carbo" color={colors.carbs} />
          <Stat value={`${recipe.fat}g`} label="grassi" color={colors.fat} />
        </View>
      </View>

      <View style={styles.section}>
        <Sans size={12} weight="medium" color={colors.faint} style={{ marginBottom: 6 }}>
          Ingredienti per una persona
        </Sans>
        {recipe.ingredients.map((ing) => (
          <View key={ing} style={styles.ingredient}>
            <View style={styles.bullet} />
            <Sans size={14} style={{ flex: 1 }}>
              {ing}
            </Sans>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          haptic.select();
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: colors.bgSubtle }]}>
        <Sans size={14} weight="medium">
          Procedimento
        </Sans>
        <Icon
          name="alt-arrow-down-linear"
          size={18}
          color={colors.dim}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn}
          style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          {recipe.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <Mono size={13} color={colors.faint} style={{ width: 16, marginTop: 2 }}>
                {i + 1}
              </Mono>
              <Sans size={14} color={colors.dim} style={{ flex: 1, lineHeight: 21 }}>
                {s}
              </Sans>
            </View>
          ))}
        </Animated.View>
      )}

      <View style={styles.footer}>
        {logged ? (
          <View style={styles.done}>
            <Icon name="check-circle-bold" size={18} color={colors.positive} />
            <Sans size={14} weight="medium" color={colors.positive}>
              Aggiunta al diario di oggi
            </Sans>
          </View>
        ) : (
          <PrimaryButton
            label="L’ho mangiata"
            variant="outline"
            style={{ height: 44 }}
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
      {ideas.map((idea, i) => (
        <Animated.View key={idea.title} entering={FadeInRight.delay(i * 80).duration(350)}>
          <Pressable
            onPress={() => onPick(`Ricetta: ${idea.title}`)}
            style={({ pressed }) => [styles.idea, pressed && { backgroundColor: colors.bgSubtle }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <EmojiTile emoji={idea.emoji} size={36} />
              <Mono size={11}>{idea.minutes} min</Mono>
            </View>
            <View style={{ gap: 4, flex: 1 }}>
              <Sans size={14} weight="semi" numberOfLines={2}>
                {idea.title}
              </Sans>
              <Sans size={12} color={colors.faint} numberOfLines={2}>
                {idea.tagline}
              </Sans>
            </View>
            <Sans size={12} color={colors.dim}>
              <Mono size={12} color={colors.ink}>
                {formatKcal(idea.kcal)}
              </Mono>{' '}
              kcal ·{' '}
              <Mono size={12} color={colors.ink}>
                {idea.protein}g
              </Mono>{' '}
              proteine
            </Sans>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

export function SwapCard({ from, to, reason }: { from: SwapFood; to: SwapFood; reason: string }) {
  const dk = from.kcal - to.kcal;
  const dp = to.protein - from.protein;
  return (
    <Card style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.swapSide}>
          <EmojiTile emoji={from.emoji} size={34} />
          <Sans
            size={13}
            color={colors.faint}
            numberOfLines={2}
            style={{ textDecorationLine: 'line-through' }}>
            {from.name}
          </Sans>
          <Mono size={12}>{formatKcal(from.kcal)} kcal</Mono>
        </View>
        <Icon name="alt-arrow-right-linear" size={18} color={colors.faint} />
        <View style={styles.swapSide}>
          <EmojiTile emoji={to.emoji} size={34} />
          <Sans size={13} weight="semi" numberOfLines={2}>
            {to.name}
          </Sans>
          <Mono size={12} color={colors.ink}>
            {formatKcal(to.kcal)} kcal
          </Mono>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
        {dk !== 0 && (
          <Sans size={13} weight="medium" color={dk > 0 ? colors.positive : colors.amber}>
            {dk > 0 ? '−' : '+'}
            {formatKcal(Math.abs(dk))} kcal
          </Sans>
        )}
        {dp !== 0 && (
          <Sans size={13} weight="medium" color={dp > 0 ? colors.positive : colors.faint}>
            {dp > 0 ? '+' : '−'}
            {Math.abs(dp)} g proteine
          </Sans>
        )}
      </View>
      <Sans size={14} color={colors.dim} style={{ marginTop: 6, lineHeight: 21 }}>
        {reason}
      </Sans>
    </Card>
  );
}

export function GroceryCard({
  sections,
  widgetKey,
  planId,
}: {
  sections: { title: string; items: (string | GroceryItem)[] }[];
  widgetKey: string;
  planId?: string;
}) {
  const checked = useNouri((s) => s.checked);
  const toggle = useNouri((s) => s.toggleChecked);
  const clear = useNouri((s) => s.clearChecked);
  // a plan's list shares its ticks everywhere it appears, and keeps them when the plan changes
  const scope = planId ? `plan:${planId}` : widgetKey;
  const all = sections.flatMap((s) => s.items.map((it) => boughtKey(scope, entryOf(it).name)));
  const done = all.filter((k) => checked[k]).length;
  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <Sans size={15} weight="semi">
          Lista della spesa
        </Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {done > 0 && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                haptic.tap();
                clear(`${scope}:`);
              }}>
              <Sans size={12} weight="medium" color={colors.dim}>
                Azzera
              </Sans>
            </Pressable>
          )}
          <Mono size={12} color={done === all.length ? colors.positive : colors.faint}>
            {done}/{all.length} presi
          </Mono>
        </View>
      </View>
      {sections.map((sec) => (
        <View key={sec.title} style={{ marginTop: 14 }}>
          <Sans size={12} weight="medium" color={colors.faint} style={{ marginBottom: 2 }}>
            {sec.title}
          </Sans>
          {sec.items.map((raw) => {
            const it = entryOf(raw);
            const key = boughtKey(scope, it.name);
            const on = Boolean(checked[key]);
            return (
              <Pressable
                key={`${sec.title}:${key}`}
                onPress={() => {
                  haptic.select();
                  toggle(key);
                }}
                style={styles.groceryRow}>
                <View
                  style={[
                    styles.checkbox,
                    on && { backgroundColor: colors.ink, borderColor: colors.ink },
                  ]}>
                  {on && <Icon name="check-linear" size={13} color={colors.onAccent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Sans
                    size={14}
                    color={on ? colors.faint : colors.ink}
                    style={on ? { textDecorationLine: 'line-through' } : undefined}>
                    {it.name}
                  </Sans>
                  {it.note ? (
                    <Sans size={12} color={colors.faint}>
                      {it.note}
                    </Sans>
                  ) : null}
                </View>
                {it.qty ? (
                  <Mono
                    size={13}
                    weight={it.qty === 'q.b.' ? 'regular' : 'medium'}
                    color={on || it.qty === 'q.b.' ? colors.faint : colors.ink}>
                    {it.qty}
                  </Mono>
                ) : null}
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
  tile: { backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.faint },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footer: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  done: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  idea: {
    width: 196,
    minHeight: 176,
    padding: 14,
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  swapSide: { flex: 1, gap: 6 },
  groceryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
