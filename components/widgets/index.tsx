import type { Widget } from '@/lib/types';

import { InsightCard, MacrosCard, TargetsCard, WaterCard, WeekChart } from './DataCards';
import { FoodFactsCard } from './FactsCard';
import { GroceryCard, IdeasCarousel, RecipeCard, SwapCard } from './FoodCards';
import { MealLogCard } from './MealLogCard';
import { MemoryCard } from './MemoryCard';
import { MealPlanCard } from './PlanCard';
import { ExerciseCardView, ExercisesList, WorkoutPlanCard } from './TrainingCards';

/** Maps a generative-UI block from the assistant to its interactive card. */
export function WidgetView({
  widget,
  widgetKey,
  onSend,
  fromPhoto,
}: {
  widget: Widget;
  widgetKey: string;
  onSend: (text: string) => void;
  fromPhoto?: boolean;
}) {
  switch (widget.type) {
    case 'meal_log':
      return <MealLogCard meal={widget.meal} widgetKey={widgetKey} photo={fromPhoto} />;
    case 'macros':
      return <MacrosCard />;
    case 'recipe':
      return <RecipeCard recipe={widget.recipe} widgetKey={widgetKey} />;
    case 'ideas':
      return <IdeasCarousel ideas={widget.ideas} onPick={onSend} />;
    case 'insight':
      return <InsightCard tone={widget.tone} title={widget.title} body={widget.body} />;
    case 'water':
      return <WaterCard />;
    case 'grocery':
      return (
        <GroceryCard sections={widget.sections} widgetKey={widgetKey} planId={widget.planId} />
      );
    case 'week':
      return <WeekChart />;
    case 'targets':
      return <TargetsCard before={widget.before} after={widget.after} changes={widget.changes} />;
    case 'swap':
      return <SwapCard from={widget.from} to={widget.to} reason={widget.reason} />;
    case 'meal_plan':
      return <MealPlanCard plan={widget.plan} onSend={onSend} />;
    case 'food_facts':
      return <FoodFactsCard food={widget.food} widgetKey={widgetKey} />;
    case 'memory':
      return <MemoryCard changes={widget.changes} recall={widget.recall} />;
    case 'workout_plan':
      return <WorkoutPlanCard plan={widget.plan} sessionId={widget.sessionId} onSend={onSend} />;
    case 'exercise':
      return <ExerciseCardView exercise={widget.exercise} onSend={onSend} />;
    case 'exercises':
      return <ExercisesList title={widget.title} items={widget.items} />;
    default:
      return null;
  }
}
