import { normalize } from './foods';

/**
 * Exercise catalogue for the training module: what each exercise works, what
 * it needs, and how to do it well (steps, tips, common mistakes, easier and
 * harder versions). Used by "Cerca esercizio", by the workout plan generator
 * and by the offline brain.
 */

export type Equipment =
  | 'corpo'
  | 'manubri'
  | 'elastico'
  | 'kettlebell'
  | 'bilanciere'
  | 'panca'
  | 'macchine'
  | 'sbarra';

export type Muscle =
  | 'petto'
  | 'schiena'
  | 'lombari'
  | 'spalle'
  | 'bicipiti'
  | 'tricipiti'
  | 'addome'
  | 'glutei'
  | 'quadricipiti'
  | 'femorali'
  | 'polpacci'
  | 'cardio';

export type Pattern =
  | 'squat'
  | 'lunge'
  | 'hinge'
  | 'glutes'
  | 'legs_iso'
  | 'calves'
  | 'push_h'
  | 'push_v'
  | 'shoulders'
  | 'pull_h'
  | 'pull_v'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  pattern: Pattern;
  /** Main muscles first. */
  muscles: Muscle[];
  /** Everything it needs. */
  equipment: Equipment[];
  level: 1 | 2 | 3;
  /** How it's dosed: repetitions, seconds held, or minutes (cardio). */
  unit: 'reps' | 'secondi' | 'minuti';
  /** Metabolic equivalent, for a rough calorie estimate. */
  met: number;
  steps: string[];
  tips: string[];
  mistakes: string[];
  easier?: string;
  harder?: string;
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  petto: 'Petto',
  schiena: 'Schiena',
  lombari: 'Lombari',
  spalle: 'Spalle',
  bicipiti: 'Bicipiti',
  tricipiti: 'Tricipiti',
  addome: 'Addome',
  glutei: 'Glutei',
  quadricipiti: 'Quadricipiti',
  femorali: 'Femorali',
  polpacci: 'Polpacci',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  corpo: 'Corpo libero',
  manubri: 'Manubri',
  elastico: 'Elastico',
  kettlebell: 'Kettlebell',
  bilanciere: 'Bilanciere',
  panca: 'Panca',
  macchine: 'Macchine',
  sbarra: 'Sbarra',
};

export const LEVEL_LABELS = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzato' } as const;

/** Muscle filters for search, in the words people use. */
export const MUSCLE_GROUPS: { label: string; muscles: Muscle[] }[] = [
  { label: 'Gambe', muscles: ['quadricipiti', 'femorali', 'polpacci'] },
  { label: 'Glutei', muscles: ['glutei'] },
  { label: 'Petto', muscles: ['petto'] },
  { label: 'Schiena', muscles: ['schiena', 'lombari'] },
  { label: 'Spalle', muscles: ['spalle'] },
  { label: 'Braccia', muscles: ['bicipiti', 'tricipiti'] },
  { label: 'Addome', muscles: ['addome'] },
  { label: 'Cardio', muscles: ['cardio'] },
];

export const EXERCISES: Exercise[] = [
  // ——— gambe: squat e affondi ———
  {
    id: 'squat-corpo-libero',
    name: 'Squat a corpo libero',
    aliases: ['squat', 'accosciata', 'air squat'],
    pattern: 'squat',
    muscles: ['quadricipiti', 'glutei', 'addome'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 5,
    steps: [
      'Piedi alla larghezza delle spalle, punte leggermente in fuori.',
      'Porta il bacino indietro e piega le ginocchia come per sederti, braccia avanti per bilanciarti.',
      'Scendi finché le cosce sono circa parallele al pavimento, schiena lunga e petto aperto.',
      'Spingi con tutto il piede e torna su stringendo i glutei.',
    ],
    tips: [
      'Le ginocchia seguono la direzione delle punte dei piedi.',
      'Inspira scendendo, espira salendo.',
    ],
    mistakes: ['Talloni che si staccano da terra.', 'Ginocchia che cadono verso l’interno.'],
    easier: 'wall-sit',
    harder: 'goblet-squat',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    aliases: ['squat con manubrio', 'squat goblet', 'squat con kettlebell'],
    pattern: 'squat',
    muscles: ['quadricipiti', 'glutei', 'addome'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 5.5,
    steps: [
      'Tieni un manubrio verticale contro il petto, con entrambe le mani sotto la testa del peso.',
      'Piedi poco più larghi delle spalle, punte in fuori.',
      'Scendi tra le ginocchia tenendo il busto dritto e i gomiti che sfiorano l’interno delle cosce.',
      'Risali spingendo il pavimento, senza perdere la posizione del peso.',
    ],
    tips: ['Il peso davanti aiuta a stare dritti: ottimo per imparare lo squat.'],
    mistakes: ['Peso che si allontana dal petto e schiena che si incurva.'],
    easier: 'squat-corpo-libero',
    harder: 'squat-bilanciere',
  },
  {
    id: 'squat-bilanciere',
    name: 'Squat con bilanciere',
    aliases: ['back squat', 'squat bilanciere', 'squat al rack'],
    pattern: 'squat',
    muscles: ['quadricipiti', 'glutei', 'lombari'],
    equipment: ['bilanciere'],
    level: 2,
    unit: 'reps',
    met: 6,
    steps: [
      'Bilanciere sui trapezi, mani strette appena fuori dalle spalle, gomiti verso il basso.',
      'Esci dal rack con due passi, piedi alla larghezza delle spalle.',
      'Inspira, contrai l’addome e scendi controllato fino al parallelo o poco sotto.',
      'Risali mantenendo il petto alto e le ginocchia in linea con i piedi.',
    ],
    tips: [
      'Usa i fermi di sicurezza del rack.',
      'Aumenta il carico solo se la tecnica resta pulita.',
    ],
    mistakes: ['Busto che crolla in avanti in salita.', 'Scendere senza addome contratto.'],
    easier: 'goblet-squat',
  },
  {
    id: 'leg-press',
    name: 'Leg press',
    aliases: ['pressa', 'pressa per gambe', 'leg press 45'],
    pattern: 'squat',
    muscles: ['quadricipiti', 'glutei'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 5,
    steps: [
      'Siediti con schiena e bacino ben appoggiati, piedi al centro della pedana alla larghezza delle spalle.',
      'Sblocca le sicure e scendi piegando le ginocchia verso il petto.',
      'Fermati prima che il bacino si sollevi dallo schienale.',
      'Spingi con i talloni fino quasi a distendere le gambe, senza bloccare le ginocchia.',
    ],
    tips: ['Piedi più alti sulla pedana lavorano di più glutei e femorali.'],
    mistakes: ['Ginocchia bloccate in fondo alla spinta.', 'Bacino che si arrotola in basso.'],
    harder: 'squat-bilanciere',
  },
  {
    id: 'wall-sit',
    name: 'Wall sit (sedia al muro)',
    aliases: ['wall sit', 'sedia al muro', 'sedia', 'isometria al muro'],
    pattern: 'squat',
    muscles: ['quadricipiti', 'glutei'],
    equipment: ['corpo'],
    level: 1,
    unit: 'secondi',
    met: 4,
    steps: [
      'Appoggia la schiena al muro e fai scivolare i piedi circa mezzo metro avanti.',
      'Scendi finché le ginocchia sono piegate a circa 90 gradi.',
      'Resta fermo respirando con calma, braccia rilassate o incrociate.',
    ],
    tips: ['Se brucia troppo, sali un po’: conta il tempo sotto tensione.'],
    mistakes: ['Ginocchia oltre le punte dei piedi.', 'Trattenere il respiro.'],
    harder: 'squat-corpo-libero',
  },
  {
    id: 'affondi',
    name: 'Affondi indietro',
    aliases: ['affondi', 'affondo', 'reverse lunge', 'lunges', 'affondi dietro'],
    pattern: 'lunge',
    muscles: ['quadricipiti', 'glutei', 'femorali'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 4.5,
    steps: [
      'In piedi, piedi sotto le anche.',
      'Fai un passo lungo indietro e scendi finché entrambe le ginocchia sono piegate a circa 90 gradi.',
      'Il ginocchio dietro sfiora il pavimento, il busto resta dritto.',
      'Spingi con il piede davanti e torna in posizione. Alterna le gambe.',
    ],
    tips: ['Il passo indietro è più gentile con le ginocchia di quello in avanti.'],
    mistakes: ['Passo troppo corto, con il ginocchio davanti molto oltre la punta.'],
    harder: 'affondi-manubri',
  },
  {
    id: 'affondi-manubri',
    name: 'Affondi con manubri',
    aliases: ['affondi manubri', 'affondi con pesi', 'walking lunges'],
    pattern: 'lunge',
    muscles: ['quadricipiti', 'glutei', 'femorali'],
    equipment: ['manubri'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Un manubrio per mano lungo i fianchi, spalle basse.',
      'Fai un passo indietro e scendi con il busto verticale.',
      'Spingi con il tallone del piede davanti per risalire.',
      'Alterna le gambe o completa tutte le ripetizioni da un lato.',
    ],
    tips: ['Guarda un punto fisso davanti a te per l’equilibrio.'],
    mistakes: ['Busto che si piega in avanti per il peso.'],
    easier: 'affondi',
    harder: 'split-squat-bulgaro',
  },
  {
    id: 'split-squat-bulgaro',
    name: 'Split squat bulgaro',
    aliases: ['bulgarian split squat', 'squat bulgaro', 'affondo bulgaro'],
    pattern: 'lunge',
    muscles: ['quadricipiti', 'glutei'],
    equipment: ['corpo'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Appoggia il collo del piede dietro su una sedia o panca, a circa un passo di distanza.',
      'Scendi piegando la gamba davanti finché la coscia è quasi parallela al pavimento.',
      'Risali spingendo con il piede davanti. Completa un lato, poi l’altro.',
    ],
    tips: [
      'Busto un po’ inclinato in avanti = più glutei; dritto = più quadricipiti.',
      'Aggiungi manubri quando diventa facile.',
    ],
    mistakes: ['Piede davanti troppo vicino alla sedia.'],
    easier: 'affondi',
  },
  {
    id: 'step-up',
    name: 'Step-up',
    aliases: ['step up', 'salita sul gradino', 'salita sulla panca'],
    pattern: 'lunge',
    muscles: ['quadricipiti', 'glutei'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 5,
    steps: [
      'Mettiti davanti a un gradino o una panca stabile, all’altezza del ginocchio o poco sotto.',
      'Appoggia tutto il piede sul gradino e sali spingendo con quella gamba.',
      'Scendi lentamente con l’altra gamba. Completa un lato, poi cambia.',
    ],
    tips: ['Evita di darti la spinta con la gamba a terra: lavora quella sopra.'],
    mistakes: ['Gradino troppo alto per il tuo livello.'],
    harder: 'split-squat-bulgaro',
  },

  // ——— glutei e femorali ———
  {
    id: 'ponte-glutei',
    name: 'Ponte per i glutei',
    aliases: ['glute bridge', 'ponte glutei', 'ponte', 'bridge'],
    pattern: 'glutes',
    muscles: ['glutei', 'femorali'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Sdraiati sulla schiena, ginocchia piegate e piedi a terra vicino ai glutei.',
      'Spingi con i talloni e solleva il bacino fino ad allineare spalle, anche e ginocchia.',
      'Stringi forte i glutei in alto per un secondo.',
      'Scendi controllato senza appoggiare del tutto.',
    ],
    tips: ['Per renderlo più duro: una gamba sola, o un peso sul bacino.'],
    mistakes: ['Inarcare la zona lombare invece di spingere con i glutei.'],
    harder: 'hip-thrust',
  },
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    aliases: ['hip thrust', 'hip thrust bilanciere', 'spinta dell anca'],
    pattern: 'glutes',
    muscles: ['glutei', 'femorali'],
    equipment: ['bilanciere', 'panca'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Siediti a terra con le scapole appoggiate al bordo di una panca, bilanciere imbottito sulle anche.',
      'Piedi a terra alla larghezza delle anche, ginocchia a 90 gradi in alto.',
      'Spingi con i talloni e porta il bacino in linea con busto e ginocchia.',
      'Mento verso il petto, stringi i glutei, poi scendi controllato.',
    ],
    tips: ['Usa un cuscinetto sul bilanciere per non farti male alle anche.'],
    mistakes: ['Iperestendere la schiena in alto.'],
    easier: 'ponte-glutei',
  },
  {
    id: 'stacco-rumeno-manubri',
    name: 'Stacco rumeno con manubri',
    aliases: ['stacco rumeno', 'rdl', 'romanian deadlift', 'stacco a gambe tese'],
    pattern: 'hinge',
    muscles: ['femorali', 'glutei', 'lombari'],
    equipment: ['manubri'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'In piedi, un manubrio per mano davanti alle cosce, ginocchia appena piegate.',
      'Porta il bacino indietro e fai scivolare i pesi lungo le gambe, schiena dritta.',
      'Scendi finché senti tirare dietro le cosce (di solito sotto le ginocchia).',
      'Torna su spingendo il bacino in avanti e stringendo i glutei.',
    ],
    tips: ['Pensa a “chiudere una porta con il sedere”, non a piegarti in avanti.'],
    mistakes: [
      'Schiena che si arrotonda.',
      'Piegare troppo le ginocchia trasformandolo in uno squat.',
    ],
    easier: 'ponte-glutei',
    harder: 'stacco-da-terra',
  },
  {
    id: 'stacco-da-terra',
    name: 'Stacco da terra',
    aliases: ['stacco', 'deadlift', 'stacco con bilanciere'],
    pattern: 'hinge',
    muscles: ['femorali', 'glutei', 'lombari', 'schiena'],
    equipment: ['bilanciere'],
    level: 3,
    unit: 'reps',
    met: 6,
    steps: [
      'Piedi sotto il bilanciere, alla larghezza delle anche; il bilanciere sopra metà piede.',
      'Afferra il bilanciere appena fuori dalle gambe, abbassa il bacino finché le tibie toccano la barra.',
      'Petto alto, schiena neutra, addome contratto: spingi il pavimento con le gambe.',
      'Quando la barra supera le ginocchia, porta il bacino avanti. Scendi con lo stesso percorso.',
    ],
    tips: [
      'La barra resta a contatto con le gambe per tutto il movimento.',
      'Meglio impararlo con un istruttore.',
    ],
    mistakes: ['Strattonare la barra da terra.', 'Schiena curva sotto carico.'],
    easier: 'stacco-rumeno-manubri',
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell swing',
    aliases: ['swing', 'kettlebell swing', 'slancio kettlebell'],
    pattern: 'hinge',
    muscles: ['glutei', 'femorali', 'cardio'],
    equipment: ['kettlebell'],
    level: 2,
    unit: 'reps',
    met: 9,
    steps: [
      'Kettlebell a terra poco davanti a te, piedi poco più larghi delle spalle.',
      'Afferralo con due mani, portalo indietro tra le gambe piegando le anche.',
      'Spingi le anche in avanti con decisione: il kettlebell sale fino al petto grazie alla spinta.',
      'Lascialo ricadere tra le gambe e ripeti in modo fluido.',
    ],
    tips: ['Le braccia sono “corde”: la forza arriva dai glutei.'],
    mistakes: ['Alzarlo con le spalle.', 'Fare uno squat invece di un movimento d’anca.'],
    easier: 'ponte-glutei',
  },
  {
    id: 'leg-curl',
    name: 'Leg curl',
    aliases: ['leg curl', 'curl femorali', 'femorali alla macchina'],
    pattern: 'legs_iso',
    muscles: ['femorali'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Regola la macchina: il rullo appoggia appena sopra i talloni, ginocchia in linea con il perno.',
      'Porta i talloni verso i glutei in modo controllato.',
      'Ritorna lentamente senza far sbattere i pesi.',
    ],
    tips: ['La fase di ritorno lenta vale quanto la salita.'],
    mistakes: ['Sollevare il bacino per aiutarsi.'],
  },
  {
    id: 'leg-extension',
    name: 'Leg extension',
    aliases: ['leg extension', 'estensioni gambe', 'quadricipiti alla macchina'],
    pattern: 'legs_iso',
    muscles: ['quadricipiti'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Schiena appoggiata, ginocchia allineate al perno della macchina, rullo sopra le caviglie.',
      'Distendi le gambe fino quasi a bloccarle e fermati un attimo in alto.',
      'Torna giù lentamente.',
    ],
    tips: ['Carichi moderati e ripetizioni controllate: è un esercizio di rifinitura.'],
    mistakes: ['Movimento a scatti con carichi troppo alti.'],
  },
  {
    id: 'calf-raise',
    name: 'Calf raise',
    aliases: ['calf raise', 'polpacci', 'sollevamento talloni', 'alzate sui talloni'],
    pattern: 'calves',
    muscles: ['polpacci'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'In piedi sul bordo di un gradino con le punte, talloni fuori.',
      'Sali sulle punte il più possibile e fermati un secondo.',
      'Scendi lentamente sotto il livello del gradino.',
    ],
    tips: [
      'Tieniti a un muro per l’equilibrio.',
      'Con un manubrio in mano diventa più impegnativo.',
    ],
    mistakes: ['Rimbalzare in basso.'],
  },

  // ——— petto e spinta ———
  {
    id: 'push-up',
    name: 'Piegamenti (push-up)',
    aliases: ['piegamenti', 'push up', 'flessioni', 'piegamenti sulle braccia'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti', 'spalle', 'addome'],
    equipment: ['corpo'],
    level: 2,
    unit: 'reps',
    met: 4,
    steps: [
      'Mani a terra poco più larghe delle spalle, corpo dritto dalla testa ai talloni.',
      'Scendi piegando i gomiti a circa 45 gradi dal busto, finché il petto sfiora il pavimento.',
      'Spingi e torna su tenendo addome e glutei contratti.',
    ],
    tips: ['Se non arrivi giù con la forma giusta, fai la versione sulle ginocchia.'],
    mistakes: ['Bacino che cade verso terra.', 'Gomiti spalancati a 90 gradi.'],
    easier: 'push-up-ginocchia',
    harder: 'pike-push-up',
  },
  {
    id: 'push-up-ginocchia',
    name: 'Piegamenti sulle ginocchia',
    aliases: ['piegamenti ginocchia', 'push up ginocchia', 'flessioni facilitate'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti', 'spalle'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Mani a terra poco più larghe delle spalle, ginocchia appoggiate.',
      'Allinea ginocchia, anche e spalle.',
      'Scendi con il petto verso il pavimento e risali spingendo.',
    ],
    tips: ['Appena fai 3 serie da 15, passa ai piegamenti completi.'],
    mistakes: ['Sedere in alto: il corpo deve restare una linea.'],
    harder: 'push-up',
  },
  {
    id: 'floor-press',
    name: 'Floor press con manubri',
    aliases: ['floor press', 'distensioni a terra', 'panca a terra con manubri'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Sdraiati a terra con le ginocchia piegate, un manubrio per mano sopra il petto.',
      'Scendi finché i gomiti toccano leggermente il pavimento, a circa 45 gradi dal busto.',
      'Spingi i manubri verso l’alto fino a distendere le braccia.',
    ],
    tips: ['È la panca di casa: il pavimento limita il movimento e protegge le spalle.'],
    mistakes: ['Far rimbalzare i gomiti a terra.'],
    harder: 'distensioni-manubri',
  },
  {
    id: 'distensioni-manubri',
    name: 'Distensioni con manubri su panca',
    aliases: ['distensioni manubri', 'panca con manubri', 'dumbbell press', 'chest press manubri'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti', 'spalle'],
    equipment: ['manubri', 'panca'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Sdraiati sulla panca, piedi a terra, un manubrio per mano all’altezza del petto.',
      'Scapole strette e basse, leggero arco naturale della schiena.',
      'Spingi i manubri verso l’alto avvicinandoli sopra il petto.',
      'Scendi lentamente finché i gomiti sono poco sotto la panca.',
    ],
    tips: ['Più escursione della panca col bilanciere: carichi un po’ più bassi.'],
    mistakes: ['Manubri che scendono troppo in basso stressando le spalle.'],
    easier: 'floor-press',
    harder: 'panca-piana',
  },
  {
    id: 'panca-piana',
    name: 'Panca piana con bilanciere',
    aliases: ['panca piana', 'bench press', 'panca', 'distensioni su panca'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti', 'spalle'],
    equipment: ['bilanciere', 'panca'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Sdraiati con gli occhi sotto il bilanciere, piedi ben piantati a terra.',
      'Mani poco più larghe delle spalle, scapole strette e basse.',
      'Stacca il bilanciere e scendi controllato fino a sfiorare la parte bassa del petto.',
      'Spingi verso l’alto e leggermente indietro, sopra le spalle.',
    ],
    tips: ['Con carichi importanti chiedi a qualcuno di assisterti.'],
    mistakes: ['Glutei che si staccano dalla panca.', 'Barra che rimbalza sul petto.'],
    easier: 'distensioni-manubri',
  },
  {
    id: 'chest-press',
    name: 'Chest press',
    aliases: ['chest press', 'pettorali alla macchina', 'spinta petto macchina'],
    pattern: 'push_h',
    muscles: ['petto', 'tricipiti'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Regola il sedile: le maniglie sono all’altezza della metà del petto.',
      'Schiena appoggiata, spingi in avanti fino quasi a distendere le braccia.',
      'Ritorna lentamente senza far toccare i pesi.',
    ],
    tips: ['Ottima per imparare il movimento di spinta in sicurezza.'],
    mistakes: ['Spalle che salgono verso le orecchie.'],
    harder: 'panca-piana',
  },

  // ——— spalle ———
  {
    id: 'lento-avanti-manubri',
    name: 'Lento avanti con manubri',
    aliases: ['lento avanti', 'shoulder press', 'military press manubri', 'spinte sopra la testa'],
    pattern: 'push_v',
    muscles: ['spalle', 'tricipiti'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'In piedi o seduto, manubri all’altezza delle spalle, palmi in avanti.',
      'Contrai addome e glutei.',
      'Spingi i manubri sopra la testa fino a distendere le braccia.',
      'Scendi controllato all’altezza delle spalle.',
    ],
    tips: ['Da seduto con schienale è più facile tenere la schiena ferma.'],
    mistakes: ['Inarcare la schiena per spingere di più.'],
    harder: 'military-press',
  },
  {
    id: 'military-press',
    name: 'Military press con bilanciere',
    aliases: ['military press', 'lento avanti bilanciere', 'overhead press'],
    pattern: 'push_v',
    muscles: ['spalle', 'tricipiti', 'addome'],
    equipment: ['bilanciere'],
    level: 2,
    unit: 'reps',
    met: 5,
    steps: [
      'Bilanciere appoggiato sulla parte alta del petto, mani poco più larghe delle spalle.',
      'Glutei e addome contratti, piedi alla larghezza delle anche.',
      'Spingi il bilanciere sopra la testa spostando il viso indietro per farlo passare.',
      'In alto porta la testa “dentro” tra le braccia, poi scendi.',
    ],
    tips: ['Meglio in piedi: allena anche il core.'],
    mistakes: ['Iperestendere la schiena.'],
    easier: 'lento-avanti-manubri',
  },
  {
    id: 'pike-push-up',
    name: 'Pike push-up',
    aliases: ['pike push up', 'piegamenti a v', 'piegamenti per spalle'],
    pattern: 'push_v',
    muscles: ['spalle', 'tricipiti'],
    equipment: ['corpo'],
    level: 2,
    unit: 'reps',
    met: 4,
    steps: [
      'Parti in posizione di piegamento e porta il bacino in alto: il corpo forma una V rovesciata.',
      'Piega i gomiti e porta la testa verso il pavimento tra le mani.',
      'Spingi e torna su.',
    ],
    tips: ['Più avvicini i piedi alle mani, più lavora la spalla.'],
    mistakes: ['Gomiti che si aprono troppo di lato.'],
    easier: 'push-up-ginocchia',
  },
  {
    id: 'alzate-laterali',
    name: 'Alzate laterali',
    aliases: ['alzate laterali', 'lateral raise', 'alzate per le spalle'],
    pattern: 'shoulders',
    muscles: ['spalle'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'In piedi, manubri leggeri lungo i fianchi, gomiti appena piegati.',
      'Solleva le braccia di lato fino all’altezza delle spalle.',
      'Scendi lentamente.',
    ],
    tips: ['Pesi leggeri: conta il controllo, non il carico.'],
    mistakes: ['Aiutarsi con uno slancio del busto.', 'Alzare le spalle verso le orecchie.'],
  },
  {
    id: 'face-pull',
    name: 'Face pull',
    aliases: ['face pull', 'tirate al viso', 'face pull elastico'],
    pattern: 'shoulders',
    muscles: ['spalle', 'schiena'],
    equipment: ['elastico'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Fissa l’elastico all’altezza del viso e afferralo con i palmi rivolti verso il basso.',
      'Tira verso il viso aprendo i gomiti in alto e di lato.',
      'Stringi le scapole un secondo, poi torna lentamente.',
    ],
    tips: ['Fa bene alla postura di chi passa molte ore seduto.'],
    mistakes: ['Tirare con la schiena inarcata.'],
  },

  // ——— schiena: tirate ———
  {
    id: 'rematore-manubrio',
    name: 'Rematore con manubrio',
    aliases: ['rematore', 'rematore manubrio', 'one arm row', 'rematore a un braccio'],
    pattern: 'pull_h',
    muscles: ['schiena', 'bicipiti'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 4.5,
    steps: [
      'Appoggia mano e ginocchio sinistri su una panca o sedia, schiena parallela al pavimento.',
      'Manubrio nella mano destra, braccio disteso.',
      'Tira il manubrio verso l’anca portando il gomito indietro.',
      'Scendi controllato. Completa il lato, poi cambia.',
    ],
    tips: ['Pensa a portare il gomito in tasca, non la mano alla spalla.'],
    mistakes: ['Ruotare il busto per sollevare di più.'],
    harder: 'trazioni',
  },
  {
    id: 'rematore-elastico',
    name: 'Rematore con elastico',
    aliases: ['rematore elastico', 'row elastico', 'tirate con elastico'],
    pattern: 'pull_h',
    muscles: ['schiena', 'bicipiti'],
    equipment: ['elastico'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Seduto a terra con le gambe distese, passa l’elastico sotto i piedi.',
      'Afferra le estremità con le braccia tese, schiena dritta.',
      'Tira verso l’ombelico stringendo le scapole.',
      'Torna lentamente in avanti.',
    ],
    tips: ['Più corto impugni l’elastico, più diventa duro.'],
    mistakes: ['Piegarsi indietro con il busto.'],
    harder: 'rematore-manubrio',
  },
  {
    id: 'pulley',
    name: 'Pulley basso',
    aliases: ['pulley', 'rematore al cavo', 'seated row', 'pulley basso'],
    pattern: 'pull_h',
    muscles: ['schiena', 'bicipiti'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Siediti con i piedi sulle pedane e ginocchia leggermente piegate.',
      'Afferra la maniglia, busto dritto.',
      'Tira verso l’addome portando i gomiti indietro e il petto in fuori.',
      'Torna in avanti allungando le braccia senza curvare la schiena.',
    ],
    tips: ['Il busto resta quasi fermo: lavorano le braccia e la schiena.'],
    mistakes: ['Dondolare avanti e indietro con il busto.'],
  },
  {
    id: 'rematore-inverso',
    name: 'Rematore inverso',
    aliases: ['rematore inverso', 'australian pull up', 'inverted row', 'trazioni orizzontali'],
    pattern: 'pull_h',
    muscles: ['schiena', 'bicipiti', 'addome'],
    equipment: ['corpo'],
    level: 2,
    unit: 'reps',
    met: 4,
    steps: [
      'Sdraiati sotto un tavolo robusto (o una sbarra bassa) e afferra il bordo con le mani.',
      'Corpo dritto, talloni a terra.',
      'Tira il petto verso il bordo stringendo le scapole.',
      'Scendi lentamente.',
    ],
    tips: [
      'Ginocchia piegate = più facile; gambe distese = più difficile.',
      'Controlla che il tavolo regga il tuo peso.',
    ],
    mistakes: ['Bacino che cede verso il basso.'],
    easier: 'superman',
    harder: 'trazioni',
  },
  {
    id: 'superman',
    name: 'Superman',
    aliases: ['superman', 'estensioni lombari a terra', 'back extension'],
    pattern: 'pull_h',
    muscles: ['lombari', 'glutei', 'schiena'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'Sdraiati a pancia in giù, braccia distese in avanti.',
      'Solleva insieme braccia, petto e gambe di qualche centimetro.',
      'Resta un secondo in alto e scendi.',
    ],
    tips: ['Sguardo verso il pavimento per non caricare il collo.'],
    mistakes: ['Movimenti bruschi: sali e scendi con calma.'],
    harder: 'rematore-inverso',
  },
  {
    id: 'lat-machine',
    name: 'Lat machine',
    aliases: ['lat machine', 'lat pulldown', 'lat'],
    pattern: 'pull_v',
    muscles: ['schiena', 'bicipiti'],
    equipment: ['macchine'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Siediti con le cosce bloccate sotto i rulli, afferra la barra poco più larga delle spalle.',
      'Busto leggermente inclinato indietro, petto in fuori.',
      'Tira la barra verso la parte alta del petto portando i gomiti in basso.',
      'Risali controllato allungando le braccia.',
    ],
    tips: ['È la preparazione ideale alle trazioni.'],
    mistakes: ['Tirare la barra dietro la nuca.', 'Oscillare con il busto.'],
    harder: 'trazioni',
  },
  {
    id: 'lat-elastico',
    name: 'Lat pulldown con elastico',
    aliases: ['lat elastico', 'pulldown elastico', 'tirate in alto con elastico'],
    pattern: 'pull_v',
    muscles: ['schiena', 'bicipiti'],
    equipment: ['elastico'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Fissa l’elastico in alto (sopra una porta, con l’apposito ancoraggio).',
      'In ginocchio, afferralo a braccia tese sopra la testa.',
      'Tira verso il petto portando i gomiti in basso e indietro.',
      'Torna su lentamente.',
    ],
    tips: ['Stringi le scapole verso il basso a fine movimento.'],
    mistakes: ['Tirare solo con le braccia, senza scapole.'],
    harder: 'trazioni',
  },
  {
    id: 'trazioni',
    name: 'Trazioni alla sbarra',
    aliases: ['trazioni', 'pull up', 'chin up', 'trazioni alla sbarra'],
    pattern: 'pull_v',
    muscles: ['schiena', 'bicipiti', 'addome'],
    equipment: ['sbarra'],
    level: 3,
    unit: 'reps',
    met: 8,
    steps: [
      'Appenditi alla sbarra con le mani poco più larghe delle spalle.',
      'Abbassa le spalle e contrai l’addome.',
      'Tira fino a portare il mento sopra la sbarra.',
      'Scendi controllato fino a braccia distese.',
    ],
    tips: ['Se non ne fai ancora una: elastico di assistenza o solo la discesa lenta.'],
    mistakes: ['Dondolarsi per salire.', 'Mezze ripetizioni.'],
    easier: 'lat-machine',
  },

  // ——— braccia ———
  {
    id: 'curl-manubri',
    name: 'Curl con manubri',
    aliases: ['curl', 'curl bicipiti', 'curl manubri', 'bicipiti'],
    pattern: 'biceps',
    muscles: ['bicipiti'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'In piedi, manubri lungo i fianchi con i palmi in avanti.',
      'Piega i gomiti portando i manubri verso le spalle.',
      'Scendi lentamente fino a distendere le braccia.',
    ],
    tips: ['I gomiti restano incollati ai fianchi.'],
    mistakes: ['Dondolare con il busto per sollevare il peso.'],
  },
  {
    id: 'curl-elastico',
    name: 'Curl con elastico',
    aliases: ['curl elastico', 'bicipiti elastico'],
    pattern: 'biceps',
    muscles: ['bicipiti'],
    equipment: ['elastico'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'In piedi al centro dell’elastico, estremità in mano con i palmi in avanti.',
      'Piega i gomiti portando le mani verso le spalle.',
      'Torna giù lentamente contro la resistenza.',
    ],
    tips: ['Allarga i piedi per aumentare la tensione.'],
    mistakes: ['Lasciare che l’elastico “tiri giù” le braccia di colpo.'],
    harder: 'curl-manubri',
  },
  {
    id: 'dip-panca',
    name: 'Dip su sedia',
    aliases: ['dip', 'dip panca', 'dip sedia', 'tricipiti alla sedia', 'bench dip'],
    pattern: 'triceps',
    muscles: ['tricipiti', 'spalle', 'petto'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 4,
    steps: [
      'Siediti sul bordo di una sedia stabile, mani ai lati del bacino.',
      'Scivola in avanti con il sedere fuori dalla sedia, gambe piegate.',
      'Piega i gomiti indietro e scendi di qualche centimetro.',
      'Spingi e torna su distendendo le braccia.',
    ],
    tips: ['Gambe distese rendono l’esercizio più duro.'],
    mistakes: ['Scendere troppo in basso forzando le spalle.'],
  },
  {
    id: 'french-press',
    name: 'Estensioni tricipiti sopra la testa',
    aliases: ['french press', 'estensioni tricipiti', 'tricipiti manubrio', 'overhead extension'],
    pattern: 'triceps',
    muscles: ['tricipiti'],
    equipment: ['manubri'],
    level: 1,
    unit: 'reps',
    met: 3.5,
    steps: [
      'Seduto o in piedi, tieni un manubrio con due mani sopra la testa.',
      'Piega i gomiti e porta il peso dietro la testa.',
      'Distendi le braccia tornando in alto.',
    ],
    tips: ['I gomiti puntano in avanti, vicini alla testa.'],
    mistakes: ['Inarcare la schiena.'],
  },

  // ——— addome e core ———
  {
    id: 'plank',
    name: 'Plank',
    aliases: ['plank', 'tenuta prona', 'plank sugli avambracci'],
    pattern: 'core',
    muscles: ['addome', 'spalle', 'glutei'],
    equipment: ['corpo'],
    level: 1,
    unit: 'secondi',
    met: 3.5,
    steps: [
      'Appoggia gli avambracci a terra, gomiti sotto le spalle.',
      'Distendi le gambe: il corpo è una linea dritta dalla testa ai talloni.',
      'Contrai addome e glutei e respira con calma.',
    ],
    tips: ['Meglio 20 secondi perfetti che un minuto con la schiena che cede.'],
    mistakes: ['Bacino troppo alto o che cade verso terra.'],
    harder: 'mountain-climber',
  },
  {
    id: 'plank-laterale',
    name: 'Plank laterale',
    aliases: ['plank laterale', 'side plank', 'plank di lato'],
    pattern: 'core',
    muscles: ['addome', 'glutei'],
    equipment: ['corpo'],
    level: 1,
    unit: 'secondi',
    met: 3.5,
    steps: [
      'Sdraiati sul fianco, avambraccio a terra sotto la spalla.',
      'Solleva il bacino finché il corpo è una linea dritta.',
      'Resta in posizione, poi cambia lato.',
    ],
    tips: ['Ginocchio a terra per la versione più facile.'],
    mistakes: ['Bacino che scende o ruota in avanti.'],
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    aliases: ['dead bug', 'insetto morto', 'scarafaggio'],
    pattern: 'core',
    muscles: ['addome'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'Sdraiati sulla schiena, braccia verso il soffitto, ginocchia piegate a 90 gradi sopra le anche.',
      'Premi la zona lombare contro il pavimento.',
      'Allunga insieme il braccio destro dietro la testa e la gamba sinistra in avanti, senza toccare terra.',
      'Torna al centro e alterna.',
    ],
    tips: ['Movimento lento: la schiena non deve staccarsi da terra.'],
    mistakes: ['Inarcare la zona lombare quando si allunga la gamba.'],
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    aliases: ['bird dog', 'quadrupedia', 'cane uccello'],
    pattern: 'core',
    muscles: ['addome', 'lombari', 'glutei'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'A quattro zampe: mani sotto le spalle, ginocchia sotto le anche.',
      'Allunga insieme il braccio destro in avanti e la gamba sinistra indietro.',
      'Resta un secondo senza ruotare il bacino, poi torna e alterna.',
    ],
    tips: ['Immagina un bicchiere d’acqua appoggiato sulla schiena.'],
    mistakes: ['Sollevare la gamba troppo in alto inarcando la schiena.'],
  },
  {
    id: 'crunch',
    name: 'Crunch',
    aliases: ['crunch', 'addominali', 'sit up'],
    pattern: 'core',
    muscles: ['addome'],
    equipment: ['corpo'],
    level: 1,
    unit: 'reps',
    met: 3,
    steps: [
      'Sdraiati sulla schiena, ginocchia piegate, mani vicino alle tempie.',
      'Solleva testa e spalle da terra arrotolando il busto verso il bacino.',
      'Scendi controllato.',
    ],
    tips: ['Espira salendo: aiuta a contrarre l’addome.'],
    mistakes: ['Tirare la testa con le mani.'],
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    aliases: ['mountain climber', 'scalatore', 'corsa in plank'],
    pattern: 'core',
    muscles: ['addome', 'cardio', 'spalle'],
    equipment: ['corpo'],
    level: 2,
    unit: 'secondi',
    met: 8,
    steps: [
      'Parti in posizione di piegamento con le braccia tese.',
      'Porta un ginocchio verso il petto, poi riportalo indietro mentre avanza l’altro.',
      'Alterna velocemente mantenendo il bacino basso.',
    ],
    tips: ['Inizia lento e accelera quando la posizione è stabile.'],
    mistakes: ['Bacino che sale e scende a ogni passo.'],
    easier: 'plank',
  },

  // ——— cardio ———
  {
    id: 'jumping-jack',
    name: 'Jumping jack',
    aliases: ['jumping jack', 'saltelli', 'saltelli a stella'],
    pattern: 'cardio',
    muscles: ['cardio', 'polpacci'],
    equipment: ['corpo'],
    level: 1,
    unit: 'secondi',
    met: 8,
    steps: [
      'In piedi, piedi uniti e braccia lungo i fianchi.',
      'Salta aprendo le gambe e portando le braccia sopra la testa.',
      'Salta di nuovo tornando alla posizione iniziale. Mantieni un ritmo costante.',
    ],
    tips: ['Senza salti: apri un piede alla volta.'],
    mistakes: ['Atterrare sui talloni a gambe rigide.'],
    harder: 'burpee',
  },
  {
    id: 'burpee',
    name: 'Burpee',
    aliases: ['burpee', 'burpees'],
    pattern: 'cardio',
    muscles: ['cardio', 'petto', 'quadricipiti'],
    equipment: ['corpo'],
    level: 2,
    unit: 'reps',
    met: 8,
    steps: [
      'Da in piedi, accosciati e appoggia le mani a terra.',
      'Porta i piedi indietro in posizione di plank.',
      'Riporta i piedi vicino alle mani.',
      'Alzati e fai un piccolo salto con le braccia in alto.',
    ],
    tips: ['Versione facile: niente salto e piedi indietro uno alla volta.'],
    mistakes: ['Schiena che cede nella posizione di plank.'],
    easier: 'jumping-jack',
  },
  {
    id: 'camminata-veloce',
    name: 'Camminata veloce',
    aliases: ['camminata', 'camminata veloce', 'walking', 'passeggiata'],
    pattern: 'cardio',
    muscles: ['cardio'],
    equipment: ['corpo'],
    level: 1,
    unit: 'minuti',
    met: 4.3,
    steps: [
      'Cammina a un passo che ti fa respirare più forte ma ti lascia parlare.',
      'Braccia che oscillano, passi ampi, sguardo in avanti.',
      'Mantieni il ritmo per tutto il tempo indicato.',
    ],
    tips: ['Una salita o il tapis roulant inclinato la rendono più intensa.'],
    mistakes: ['Andare troppo piano: deve essere un po’ faticoso.'],
    harder: 'corsa',
  },
  {
    id: 'corsa',
    name: 'Corsa leggera',
    aliases: ['corsa', 'corsetta', 'running', 'jogging', 'correre'],
    pattern: 'cardio',
    muscles: ['cardio', 'quadricipiti', 'polpacci'],
    equipment: ['corpo'],
    level: 2,
    unit: 'minuti',
    met: 8,
    steps: [
      'Riscaldati con 5 minuti di camminata.',
      'Corri a un ritmo in cui riesci ancora a dire una frase.',
      'Passi corti e frequenti, appoggio sotto il bacino.',
      'Chiudi con qualche minuto di camminata.',
    ],
    tips: ['Se sei agli inizi, alterna 1 minuto di corsa e 2 di camminata.'],
    mistakes: ['Partire troppo forte.'],
    easier: 'camminata-veloce',
  },
  {
    id: 'cyclette',
    name: 'Cyclette',
    aliases: ['cyclette', 'bici', 'bike', 'spinning', 'bicicletta'],
    pattern: 'cardio',
    muscles: ['cardio', 'quadricipiti'],
    equipment: ['macchine'],
    level: 1,
    unit: 'minuti',
    met: 6.8,
    steps: [
      'Regola il sellino: a pedale in basso la gamba è quasi distesa.',
      'Pedala a un ritmo costante e una resistenza che ti fa respirare più forte.',
      'Negli ultimi minuti riduci la resistenza per defaticare.',
    ],
    tips: ['Prova 30 secondi forti e 90 secondi facili per variare.'],
    mistakes: ['Sellino troppo basso: stressa le ginocchia.'],
  },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const exerciseById = (id: string) => BY_ID.get(id);

export type EquipmentSetting = 'none' | 'home' | 'gym';

export const EQUIPMENT_SETTING: Record<
  EquipmentSetting,
  { label: string; hint: string; has: Equipment[] }
> = {
  none: { label: 'Corpo libero', hint: 'Nessun attrezzo, ovunque', has: ['corpo'] },
  home: {
    label: 'Casa',
    hint: 'Manubri, elastici, kettlebell',
    has: ['corpo', 'manubri', 'elastico', 'kettlebell'],
  },
  gym: {
    label: 'Palestra',
    hint: 'Bilanciere, macchine, sbarra',
    has: [
      'corpo',
      'manubri',
      'elastico',
      'kettlebell',
      'bilanciere',
      'panca',
      'macchine',
      'sbarra',
    ],
  },
};

export function canDo(e: Exercise, setting: EquipmentSetting): boolean {
  const has = EQUIPMENT_SETTING[setting].has;
  return e.equipment.every((x) => has.includes(x));
}

/** Name/alias search, with muscle words too ("esercizi per i glutei"). */
export function searchExercises(
  query: string,
  opts: { muscles?: Muscle[]; setting?: EquipmentSetting } = {}
): Exercise[] {
  const q = normalize(query);
  const pool = EXERCISES.filter(
    (e) =>
      (!opts.muscles?.length || e.muscles.some((m) => opts.muscles!.includes(m))) &&
      (!opts.setting || canDo(e, opts.setting))
  );
  if (!q) return pool;
  const scored: { e: Exercise; score: number }[] = [];
  for (const e of pool) {
    let score = 0;
    for (const alias of [e.name, ...e.aliases]) {
      const a = normalize(alias);
      if (a === q) score = Math.max(score, 6);
      else if (a.startsWith(q)) score = Math.max(score, 5);
      else if (a.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 4);
      else if (q.length >= 4 && a.includes(q)) score = Math.max(score, 3);
    }
    const muscle = MUSCLE_GROUPS.find(
      (g) => normalize(g.label).startsWith(q) || q.startsWith(normalize(g.label))
    );
    if (!score && muscle && e.muscles.some((m) => muscle.muscles.includes(m)))
      score = e.muscles[0] && muscle.muscles.includes(e.muscles[0]) ? 2.5 : 1.5;
    if (!score && e.muscles.some((m) => normalize(m).startsWith(q))) score = 2;
    if (score) scored.push({ e, score: score - e.level * 0.1 });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

/** The exercise a message is about ("come si fa lo squat bulgaro?"): the longest alias wins. */
export function findExercise(text: string): Exercise | undefined {
  const t = ` ${normalize(text)} `;
  let best: { e: Exercise; len: number } | undefined;
  for (const e of EXERCISES) {
    for (const alias of [e.name, ...e.aliases]) {
      const a = normalize(alias);
      if (a.length >= 3 && t.includes(` ${a} `) && (!best || a.length > best.len))
        best = { e, len: a.length };
    }
  }
  return best?.e;
}

/** Muscle group named in a message ("esercizi per i glutei"). */
export function muscleGroupIn(text: string): (typeof MUSCLE_GROUPS)[number] | undefined {
  const t = normalize(text);
  const words: [RegExp, string][] = [
    [/\b(gambe|cosce|quadricipiti|femorali|polpacci)\b/, 'Gambe'],
    [/\b(glutei|sedere|lato b)\b/, 'Glutei'],
    [/\b(petto|pettorali)\b/, 'Petto'],
    [/\b(schiena|dorsali|lombari)\b/, 'Schiena'],
    [/\b(spalle|deltoidi)\b/, 'Spalle'],
    [/\b(braccia|bicipiti|tricipiti)\b/, 'Braccia'],
    [/\b(addome|addominali|pancia|core)\b/, 'Addome'],
    [/\b(cardio|fiato|resistenza)\b/, 'Cardio'],
  ];
  const label = words.find(([re]) => re.test(t))?.[1];
  return MUSCLE_GROUPS.find((g) => g.label === label);
}

export function prescriptionUnit(e: Exercise): string {
  return e.unit === 'reps' ? 'ripetizioni' : e.unit;
}
