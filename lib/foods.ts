import type { FoodItem, Macros } from './types';

/**
 * Compact Italian food table used by the offline demo brain.
 * Values are per typical portion (see `portion`), rounded from CREA / USDA
 * reference tables — good enough for a conversational estimate.
 */
export interface FoodEntry extends Macros {
  key: string;
  aliases: string[];
  emoji: string;
  portion: string; // label for one portion, e.g. "1 uovo"
  grams: number; // grams in one portion (for "200g di ..." parsing)
  unit?: [string, string]; // singular / plural nouns for counted foods
  tags?: ('meat' | 'fish' | 'dairy' | 'egg' | 'gluten' | 'nuts' | 'shellfish')[];
}

export const FOODS: FoodEntry[] = [
  // — colazione —
  {
    key: 'uovo',
    aliases: ['uova', 'uovo', 'uova strapazzate', 'frittata'],
    emoji: '🥚',
    portion: '1 uovo',
    grams: 60,
    unit: ['uovo', 'uova'],
    kcal: 78,
    protein: 6.3,
    carbs: 0.6,
    fat: 5.3,
    tags: ['egg'],
  },
  {
    key: 'avocado toast',
    aliases: ['avocado toast', 'toast con avocado', 'toast all avocado'],
    emoji: '🥑',
    portion: '1 toast',
    grams: 150,
    kcal: 290,
    protein: 8,
    carbs: 30,
    fat: 16,
    tags: ['gluten'],
  },
  {
    key: 'toast',
    aliases: ['toast', 'pane tostato', 'fette biscottate'],
    emoji: '🍞',
    portion: '1 fetta',
    grams: 30,
    unit: ['fetta', 'fette'],
    kcal: 80,
    protein: 2.7,
    carbs: 15,
    fat: 1,
    tags: ['gluten'],
  },
  {
    key: 'pane',
    aliases: ['pane', 'fetta di pane', 'fette di pane', 'panino vuoto'],
    emoji: '🥖',
    portion: '1 fetta',
    grams: 50,
    unit: ['fetta', 'fette'],
    kcal: 130,
    protein: 4.5,
    carbs: 25,
    fat: 1,
    tags: ['gluten'],
  },
  {
    key: 'yogurt greco',
    aliases: ['yogurt greco', 'greco', 'skyr'],
    emoji: '🥣',
    portion: '1 vasetto',
    grams: 170,
    unit: ['vasetto', 'vasetti'],
    kcal: 100,
    protein: 17,
    carbs: 6,
    fat: 0.7,
    tags: ['dairy'],
  },
  {
    key: 'yogurt',
    aliases: ['yogurt', 'yoghurt'],
    emoji: '🥛',
    portion: '1 vasetto',
    grams: 125,
    unit: ['vasetto', 'vasetti'],
    kcal: 90,
    protein: 5,
    carbs: 9,
    fat: 3.5,
    tags: ['dairy'],
  },
  {
    key: 'porridge',
    aliases: ['porridge', 'avena', 'fiocchi d avena', 'overnight oats'],
    emoji: '🥣',
    portion: '1 ciotola',
    grams: 250,
    kcal: 290,
    protein: 11,
    carbs: 44,
    fat: 7,
  },
  {
    key: 'granola',
    aliases: ['granola', 'muesli', 'cereali'],
    emoji: '🥣',
    portion: '40 g',
    grams: 40,
    kcal: 185,
    protein: 4,
    carbs: 27,
    fat: 7,
    tags: ['gluten', 'nuts'],
  },
  {
    key: 'cornetto',
    aliases: ['cornetto', 'brioche', 'croissant'],
    emoji: '🥐',
    portion: '1 cornetto',
    grams: 60,
    unit: ['cornetto', 'cornetti'],
    kcal: 270,
    protein: 5,
    carbs: 32,
    fat: 14,
    tags: ['gluten', 'dairy', 'egg'],
  },
  {
    key: 'biscotti',
    aliases: ['biscotti', 'biscotto', 'frollini'],
    emoji: '🍪',
    portion: '4 biscotti',
    grams: 40,
    kcal: 180,
    protein: 3,
    carbs: 28,
    fat: 6,
    tags: ['gluten'],
  },
  {
    key: 'cappuccino',
    aliases: ['cappuccino', 'caffe latte', 'caffellatte', 'latte macchiato'],
    emoji: '☕',
    portion: '1 tazza',
    grams: 200,
    unit: ['cappuccino', 'cappuccini'],
    kcal: 90,
    protein: 5,
    carbs: 8,
    fat: 4,
    tags: ['dairy'],
  },
  {
    key: 'caffe',
    aliases: ['caffe', 'espresso', 'caffè'],
    emoji: '☕',
    portion: '1 tazzina',
    grams: 30,
    unit: ['caffè', 'caffè'],
    kcal: 2,
    protein: 0.1,
    carbs: 0,
    fat: 0,
  },
  {
    key: 'latte',
    aliases: ['latte', 'bicchiere di latte'],
    emoji: '🥛',
    portion: '200 ml',
    grams: 200,
    kcal: 100,
    protein: 7,
    carbs: 10,
    fat: 3.2,
    tags: ['dairy'],
  },
  {
    key: 'pancake',
    aliases: ['pancake', 'pancakes'],
    emoji: '🥞',
    portion: '3 pancake',
    grams: 150,
    kcal: 350,
    protein: 10,
    carbs: 50,
    fat: 11,
    tags: ['gluten', 'egg', 'dairy'],
  },
  {
    key: 'smoothie',
    aliases: ['smoothie', 'frullato', 'centrifugato'],
    emoji: '🥤',
    portion: '1 bicchiere',
    grams: 300,
    kcal: 220,
    protein: 5,
    carbs: 45,
    fat: 3,
  },

  // — frutta —
  {
    key: 'banana',
    aliases: ['banana', 'banane'],
    emoji: '🍌',
    portion: '1 banana',
    grams: 120,
    unit: ['banana', 'banane'],
    kcal: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
  },
  {
    key: 'mela',
    aliases: ['mela', 'mele'],
    emoji: '🍎',
    portion: '1 mela',
    grams: 180,
    unit: ['mela', 'mele'],
    kcal: 85,
    protein: 0.4,
    carbs: 22,
    fat: 0.3,
  },
  {
    key: 'frutti di bosco',
    aliases: ['frutti di bosco', 'mirtilli', 'fragole', 'lamponi'],
    emoji: '🫐',
    portion: '1 ciotolina',
    grams: 120,
    kcal: 55,
    protein: 1,
    carbs: 12,
    fat: 0.4,
  },
  {
    key: 'arancia',
    aliases: ['arancia', 'arance', 'mandarini', 'kiwi'],
    emoji: '🍊',
    portion: '1 frutto',
    grams: 150,
    unit: ['frutto', 'frutti'],
    kcal: 70,
    protein: 1.3,
    carbs: 16,
    fat: 0.2,
  },
  {
    key: 'frutta secca',
    aliases: ['frutta secca', 'mandorle', 'noci', 'anacardi', 'nocciole', 'pistacchi'],
    emoji: '🥜',
    portion: '30 g',
    grams: 30,
    kcal: 180,
    protein: 6,
    carbs: 6,
    fat: 15,
    tags: ['nuts'],
  },

  // — primi —
  {
    key: 'carbonara',
    aliases: ['carbonara', 'pasta alla carbonara', 'spaghetti alla carbonara'],
    emoji: '🍝',
    portion: '1 piatto',
    grams: 280,
    kcal: 650,
    protein: 26,
    carbs: 72,
    fat: 28,
    tags: ['gluten', 'egg', 'meat', 'dairy'],
  },
  {
    key: 'amatriciana',
    aliases: ['amatriciana', 'gricia', 'cacio e pepe'],
    emoji: '🍝',
    portion: '1 piatto',
    grams: 280,
    kcal: 620,
    protein: 22,
    carbs: 74,
    fat: 25,
    tags: ['gluten', 'dairy'],
  },
  {
    key: 'pesto',
    aliases: ['pasta al pesto', 'trofie al pesto', 'pesto'],
    emoji: '🌿',
    portion: '1 piatto',
    grams: 260,
    kcal: 580,
    protein: 16,
    carbs: 72,
    fat: 26,
    tags: ['gluten', 'nuts', 'dairy'],
  },
  {
    key: 'lasagna',
    aliases: ['lasagna', 'lasagne'],
    emoji: '🧀',
    portion: '1 porzione',
    grams: 300,
    kcal: 520,
    protein: 26,
    carbs: 38,
    fat: 28,
    tags: ['gluten', 'dairy', 'meat'],
  },
  {
    key: 'risotto',
    aliases: ['risotto'],
    emoji: '🍚',
    portion: '1 piatto',
    grams: 300,
    kcal: 480,
    protein: 11,
    carbs: 78,
    fat: 14,
    tags: ['dairy'],
  },
  {
    key: 'pasta legumi',
    aliases: ['pasta di legumi', 'pasta di lenticchie', 'pasta di ceci'],
    emoji: '🍝',
    portion: '1 piatto',
    grams: 250,
    kcal: 420,
    protein: 28,
    carbs: 58,
    fat: 8,
  },
  {
    key: 'pasta',
    aliases: ['pasta al pomodoro', 'spaghetti', 'pasta', 'penne', 'rigatoni', 'fusilli'],
    emoji: '🍝',
    portion: '1 piatto',
    grams: 100,
    kcal: 470,
    protein: 14,
    carbs: 84,
    fat: 9,
    tags: ['gluten'],
  },
  {
    key: 'minestrone',
    aliases: ['minestrone', 'zuppa', 'vellutata', 'passato di verdure'],
    emoji: '🥣',
    portion: '1 scodella',
    grams: 300,
    kcal: 180,
    protein: 7,
    carbs: 28,
    fat: 4,
  },

  // — piatti unici / fuori casa —
  {
    key: 'pizza',
    aliases: ['pizza', 'margherita', 'pizza margherita'],
    emoji: '🍕',
    portion: '1 pizza',
    grams: 330,
    unit: ['pizza', 'pizze'],
    kcal: 800,
    protein: 32,
    carbs: 105,
    fat: 26,
    tags: ['gluten', 'dairy'],
  },
  {
    key: 'trancio pizza',
    aliases: ['trancio', 'fetta di pizza', 'pizza al taglio'],
    emoji: '🍕',
    portion: '1 trancio',
    grams: 120,
    unit: ['trancio', 'tranci'],
    kcal: 290,
    protein: 11,
    carbs: 38,
    fat: 10,
    tags: ['gluten', 'dairy'],
  },
  {
    key: 'poke',
    aliases: ['poke', 'poke bowl', 'pokè'],
    emoji: '🥗',
    portion: '1 bowl',
    grams: 450,
    kcal: 620,
    protein: 32,
    carbs: 75,
    fat: 20,
    tags: ['fish'],
  },
  {
    key: 'sushi',
    aliases: ['sushi', 'uramaki', 'nigiri', 'sashimi'],
    emoji: '🍣',
    portion: '8 pezzi',
    grams: 240,
    kcal: 400,
    protein: 18,
    carbs: 70,
    fat: 5,
    tags: ['fish'],
  },
  {
    key: 'piadina',
    aliases: ['piadina', 'piada', 'wrap'],
    emoji: '🌯',
    portion: '1 piadina',
    grams: 200,
    unit: ['piadina', 'piadine'],
    kcal: 460,
    protein: 18,
    carbs: 44,
    fat: 22,
    tags: ['gluten', 'dairy'],
  },
  {
    key: 'panino',
    aliases: ['panino', 'sandwich', 'tramezzino', 'focaccia'],
    emoji: '🥪',
    portion: '1 panino',
    grams: 200,
    unit: ['panino', 'panini'],
    kcal: 420,
    protein: 20,
    carbs: 45,
    fat: 16,
    tags: ['gluten'],
  },
  {
    key: 'hamburger',
    aliases: ['hamburger', 'burger', 'cheeseburger'],
    emoji: '🍔',
    portion: '1 burger',
    grams: 250,
    unit: ['burger', 'burger'],
    kcal: 560,
    protein: 30,
    carbs: 40,
    fat: 30,
    tags: ['gluten', 'meat', 'dairy'],
  },
  {
    key: 'patatine',
    aliases: ['patatine', 'patatine fritte', 'fries'],
    emoji: '🍟',
    portion: '1 porzione media',
    grams: 120,
    kcal: 365,
    protein: 4,
    carbs: 48,
    fat: 17,
  },
  {
    key: 'kebab',
    aliases: ['kebab', 'shawarma'],
    emoji: '🌯',
    portion: '1 kebab',
    grams: 350,
    kcal: 700,
    protein: 35,
    carbs: 60,
    fat: 35,
    tags: ['gluten', 'meat'],
  },
  {
    key: 'insalatona',
    aliases: ['insalatona', 'caesar', 'caesar salad', 'insalata di pollo'],
    emoji: '🥗',
    portion: '1 ciotola',
    grams: 350,
    kcal: 450,
    protein: 30,
    carbs: 15,
    fat: 30,
    tags: ['meat', 'dairy'],
  },
  {
    key: 'buddha bowl',
    aliases: ['buddha bowl', 'bowl'],
    emoji: '🥙',
    portion: '1 bowl',
    grams: 400,
    kcal: 540,
    protein: 20,
    carbs: 62,
    fat: 22,
  },

  // — secondi / proteine —
  {
    key: 'pollo',
    aliases: ['pollo', 'petto di pollo', 'tacchino', 'pollo alla griglia'],
    emoji: '🍗',
    portion: '150 g',
    grams: 150,
    kcal: 250,
    protein: 46,
    carbs: 0,
    fat: 6,
    tags: ['meat'],
  },
  {
    key: 'salmone',
    aliases: ['salmone'],
    emoji: '🐟',
    portion: '150 g',
    grams: 150,
    kcal: 310,
    protein: 31,
    carbs: 0,
    fat: 20,
    tags: ['fish'],
  },
  {
    key: 'pesce bianco',
    aliases: ['merluzzo', 'orata', 'branzino', 'spigola', 'pesce'],
    emoji: '🐟',
    portion: '200 g',
    grams: 200,
    kcal: 200,
    protein: 38,
    carbs: 0,
    fat: 5,
    tags: ['fish'],
  },
  {
    key: 'tonno',
    aliases: ['tonno', 'scatoletta di tonno'],
    emoji: '🐟',
    portion: '1 scatoletta',
    grams: 80,
    unit: ['scatoletta', 'scatolette'],
    kcal: 110,
    protein: 20,
    carbs: 0,
    fat: 3,
    tags: ['fish'],
  },
  {
    key: 'gamberi',
    aliases: ['gamberi', 'gamberetti', 'mazzancolle'],
    emoji: '🦐',
    portion: '150 g',
    grams: 150,
    kcal: 150,
    protein: 30,
    carbs: 1,
    fat: 2,
    tags: ['shellfish'],
  },
  {
    key: 'bistecca',
    aliases: ['bistecca', 'tagliata', 'manzo', 'filetto'],
    emoji: '🥩',
    portion: '200 g',
    grams: 200,
    kcal: 420,
    protein: 50,
    carbs: 0,
    fat: 24,
    tags: ['meat'],
  },
  {
    key: 'polpette',
    aliases: ['polpette'],
    emoji: '🧆',
    portion: '4 polpette',
    grams: 160,
    kcal: 380,
    protein: 24,
    carbs: 14,
    fat: 25,
    tags: ['meat', 'gluten', 'egg'],
  },
  {
    key: 'bresaola',
    aliases: ['bresaola', 'prosciutto', 'crudo', 'cotto', 'speck'],
    emoji: '🥓',
    portion: '80 g',
    grams: 80,
    kcal: 140,
    protein: 24,
    carbs: 0,
    fat: 5,
    tags: ['meat'],
  },
  {
    key: 'mozzarella',
    aliases: ['mozzarella', 'burrata', 'bufala'],
    emoji: '🧀',
    portion: '125 g',
    grams: 125,
    kcal: 320,
    protein: 22,
    carbs: 2,
    fat: 25,
    tags: ['dairy'],
  },
  {
    key: 'parmigiano',
    aliases: ['parmigiano', 'grana', 'formaggio', 'pecorino'],
    emoji: '🧀',
    portion: '30 g',
    grams: 30,
    kcal: 120,
    protein: 10,
    carbs: 0,
    fat: 8.5,
    tags: ['dairy'],
  },
  {
    key: 'tofu',
    aliases: ['tofu', 'tempeh', 'seitan'],
    emoji: '🍢',
    portion: '150 g',
    grams: 150,
    kcal: 190,
    protein: 20,
    carbs: 4,
    fat: 11,
  },
  {
    key: 'lenticchie',
    aliases: ['lenticchie', 'fagioli', 'legumi', 'dal'],
    emoji: '🫘',
    portion: '200 g cotti',
    grams: 200,
    kcal: 230,
    protein: 18,
    carbs: 40,
    fat: 0.8,
  },
  {
    key: 'ceci',
    aliases: ['ceci', 'falafel'],
    emoji: '🫘',
    portion: '200 g cotti',
    grams: 200,
    kcal: 330,
    protein: 18,
    carbs: 55,
    fat: 5,
  },
  {
    key: 'hummus',
    aliases: ['hummus'],
    emoji: '🫛',
    portion: '60 g',
    grams: 60,
    kcal: 160,
    protein: 5,
    carbs: 9,
    fat: 11,
  },
  {
    key: 'proteine',
    aliases: ['shake proteico', 'proteine in polvere', 'whey', 'shake'],
    emoji: '🥤',
    portion: '1 shake',
    grams: 30,
    kcal: 120,
    protein: 24,
    carbs: 3,
    fat: 1.5,
    tags: ['dairy'],
  },
  {
    key: 'barretta',
    aliases: ['barretta', 'barretta proteica'],
    emoji: '🍫',
    portion: '1 barretta',
    grams: 60,
    unit: ['barretta', 'barrette'],
    kcal: 210,
    protein: 20,
    carbs: 20,
    fat: 7,
  },

  // — contorni —
  {
    key: 'riso',
    aliases: ['riso', 'riso basmati', 'riso integrale'],
    emoji: '🍚',
    portion: '80 g crudo',
    grams: 80,
    kcal: 285,
    protein: 6,
    carbs: 63,
    fat: 0.5,
  },
  {
    key: 'quinoa',
    aliases: ['quinoa', 'couscous', 'farro', 'orzo'],
    emoji: '🌾',
    portion: '80 g crudo',
    grams: 80,
    kcal: 295,
    protein: 11,
    carbs: 51,
    fat: 5,
  },
  {
    key: 'patate',
    aliases: ['patate', 'patate al forno', 'pure', 'purè'],
    emoji: '🥔',
    portion: '200 g',
    grams: 200,
    kcal: 190,
    protein: 4,
    carbs: 38,
    fat: 3,
  },
  {
    key: 'insalata',
    aliases: ['insalata', 'insalata mista', 'rucola', 'lattuga'],
    emoji: '🥬',
    portion: '1 ciotola',
    grams: 150,
    kcal: 110,
    protein: 2.5,
    carbs: 7,
    fat: 8.5,
  },
  {
    key: 'verdure',
    aliases: [
      'verdure',
      'verdure grigliate',
      'zucchine',
      'broccoli',
      'spinaci',
      'melanzane',
      'peperoni',
      'carote',
      'fagiolini',
    ],
    emoji: '🥦',
    portion: '200 g',
    grams: 200,
    kcal: 110,
    protein: 5,
    carbs: 12,
    fat: 5,
  },
  {
    key: 'avocado',
    aliases: ['avocado'],
    emoji: '🥑',
    portion: '½ avocado',
    grams: 70,
    kcal: 112,
    protein: 1.4,
    carbs: 6,
    fat: 10,
  },

  // — dolci & drink —
  {
    key: 'cioccolato',
    aliases: ['cioccolato', 'cioccolata', 'fondente'],
    emoji: '🍫',
    portion: '20 g',
    grams: 20,
    kcal: 115,
    protein: 1.6,
    carbs: 9,
    fat: 8.5,
  },
  {
    key: 'gelato',
    aliases: ['gelato', 'coppetta', 'cono'],
    emoji: '🍨',
    portion: '1 coppetta',
    grams: 120,
    kcal: 250,
    protein: 4,
    carbs: 30,
    fat: 12,
    tags: ['dairy'],
  },
  {
    key: 'tiramisu',
    aliases: ['tiramisu', 'tiramisù', 'dolce', 'torta', 'cheesecake'],
    emoji: '🍰',
    portion: '1 fetta',
    grams: 120,
    kcal: 440,
    protein: 8,
    carbs: 40,
    fat: 27,
    tags: ['gluten', 'dairy', 'egg'],
  },
  {
    key: 'birra',
    aliases: ['birra', 'birre', 'birretta'],
    emoji: '🍺',
    portion: '1 media',
    grams: 400,
    unit: ['birra', 'birre'],
    kcal: 170,
    protein: 1.5,
    carbs: 14,
    fat: 0,
    tags: ['gluten'],
  },
  {
    key: 'vino',
    aliases: ['vino', 'calice', 'bicchiere di vino', 'prosecco'],
    emoji: '🍷',
    portion: '1 calice',
    grams: 150,
    unit: ['calice', 'calici'],
    kcal: 120,
    protein: 0,
    carbs: 4,
    fat: 0,
  },
  {
    key: 'spritz',
    aliases: ['spritz', 'aperitivo', 'cocktail', 'negroni'],
    emoji: '🍹',
    portion: '1 drink',
    grams: 200,
    unit: ['drink', 'drink'],
    kcal: 170,
    protein: 0,
    carbs: 16,
    fat: 0,
  },
];

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  "un'": 1,
  mezzo: 0.5,
  mezza: 0.5,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
  dieci: 10,
  doppio: 2,
  doppia: 2,
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9½.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Match {
  food: FoodEntry;
  start: number;
  end: number;
  alias: string;
}

/**
 * Finds foods mentioned in free text ("2 uova e un toast con avocado, poi un cappuccino")
 * and returns estimated items with quantities. Longest alias wins, overlaps are skipped.
 */
export function parseFoods(text: string): FoodItem[] {
  const t = ` ${normalize(text)} `;
  const candidates: Match[] = [];
  for (const food of FOODS) {
    for (const alias of food.aliases) {
      const a = normalize(alias);
      let idx = t.indexOf(` ${a}`);
      while (idx !== -1) {
        const end = idx + a.length + 1;
        const nextChar = t[end];
        if (nextChar === ' ' || nextChar === undefined || nextChar === ',' || nextChar === '.') {
          candidates.push({ food, start: idx + 1, end, alias: a });
        }
        idx = t.indexOf(` ${a}`, idx + 1);
      }
    }
  }
  candidates.sort((x, y) => y.alias.length - x.alias.length);
  const taken: Match[] = [];
  for (const c of candidates) {
    if (taken.some((m) => c.start < m.end && c.end > m.start)) continue;
    if (taken.some((m) => m.food.key === c.food.key)) continue;
    taken.push(c);
  }
  taken.sort((a, b) => a.start - b.start);

  // "poke al salmone", "panino al prosciutto": the second food is a filling of
  // the first dish, not a separate item.
  const items = taken.filter(
    (m, i) =>
      i === 0 || !/^ (al|alla|allo|ai|alle|agli|all) $/.test(t.slice(taken[i - 1].end, m.start))
  );

  return items.map(({ food, start }) => {
    const before = t.slice(Math.max(0, start - 18), start).trim();
    const lastWord = before.split(' ').pop() ?? '';
    let factor = 1;
    let qty = food.portion;

    const grams = before.match(/(\d+)\s*(?:g|gr|grammi)\s*(?:di)?$/);
    const count = before.match(/(?:^|\s)(\d+(?:[.,]\d+)?)$/);
    if (grams && Number(grams[1]) > 0) {
      factor = Number(grams[1]) / food.grams;
      qty = `${grams[1]} g`;
    } else if (
      count &&
      Number(count[1].replace(',', '.')) > 0 &&
      Number(count[1].replace(',', '.')) < 20
    ) {
      factor = Number(count[1].replace(',', '.'));
    } else if (lastWord in NUMBER_WORDS) {
      factor = NUMBER_WORDS[lastWord];
    }

    if (qty === food.portion && factor !== 1) {
      if (food.unit) {
        qty = `${factor === 0.5 ? '½' : factor} ${factor > 1 ? food.unit[1] : food.unit[0]}`;
      } else {
        qty = `${factor === 0.5 ? '½' : `${factor}×`} ${food.portion}`;
      }
    }

    return {
      name: capitalize(food.key),
      emoji: food.emoji,
      qty,
      kcal: Math.round(food.kcal * factor),
      protein: round1(food.protein * factor),
      carbs: round1(food.carbs * factor),
      fat: round1(food.fat * factor),
      confidence: qty === food.portion ? 0.72 : 0.86,
    };
  });
}

export function findFood(text: string): FoodEntry | undefined {
  const t = ` ${normalize(text)} `;
  let best: { food: FoodEntry; len: number } | undefined;
  for (const food of FOODS) {
    for (const alias of food.aliases) {
      const a = normalize(alias);
      if (t.includes(` ${a} `) && (!best || a.length > best.len)) best = { food, len: a.length };
    }
  }
  return best?.food;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
