import type { Widget } from '@/lib/types';

import { InsightCard, MacrosCard, TargetsCard, WaterCard, WeekChart } from './DataCards';
import { GroceryCard, IdeasCarousel, RecipeCard, SwapCard } from './FoodCards';
import { MealLogCard } from './MealLogCard';

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
      return <GroceryCard sections={widget.sections} widgetKey={widgetKey} />;
    case 'week':
      return <WeekChart />;
    case 'targets':
      return <TargetsCard before={widget.before} after={widget.after} changes={widget.changes} />;
    case 'swap':
      return <SwapCard from={widget.from} to={widget.to} reason={widget.reason} />;
    default:
      return null;
  }
}
