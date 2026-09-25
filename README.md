# Nouri — il tuo nutrizionista che parla come un amico

Nouri è un'app Expo di **assistenza nutrizionale conversazionale**. Non ha dashboard piene di tabelle: la schermata principale è una conversazione. Racconti cosa hai mangiato, mandi una foto o chiedi un'idea per cena, e Nouri risponde con testo breve e **card interattive generate al volo** (generative UI).

## Direzione visiva

Chiara, tipografica e silenziosa, a metà tra ElevenLabs e ChatGPT: la conversazione è il prodotto e l'interfaccia si fa da parte.

| Elemento | Scelta |
| --- | --- |
| Superfici | Fondo bianco, card bianche con bordo sottile `#EAEAEE`, grigi chiari per le bolle dell'utente e gli stati. Niente gradienti, glow o texture |
| Colore | Inchiostro quasi nero `#0E0E10` per testo e azioni (bottoni a pillola neri). Il colore compare solo nei dati, con una tinta fissa per ogni macro (proteine `#EE8A62`, carboidrati `#8088F2`, grassi `#3FB595`, acqua `#4FA3EE`), e nell'orb |
| Tipografia | **Geist** in tutta l'app. Titoli in due toni (nero + grigio), numeri con cifre tabulari |
| Presenza AI | Un **orb pastello** (cielo, lilla, pesca, menta) con ombra morbida. Si muove piano a riposo e accelera quando Nouri ascolta, pensa o parla |
| Icone | Set **Solar** (480 Design): duotone su riquadri pastello per menu e scelte, lineari per i controlli |
| Menu | Drawer laterale come ChatGPT, bottom sheet trascinabili per il "+", i pasti e i messaggi, impostazioni modificabili in stile iOS |
| Motion | Testo che arriva parola per parola, card che entrano in dissolvenza, numeri e anelli che si animano, feedback aptico leggero |

## Cosa fa

- **Onboarding conversazionale**: sei domande, una alla volta, poi Nouri mostra il tuo "ritmo" (kcal, macro, acqua). Si fa una volta sola: le risposte vengono salvate man mano (se chiudi a metà riprendi da dove eri), il profilo è salvato appena vedi il piano e da lì in poi l'app apre sempre la chat. Le risposte restano in **Memoria › Il tuo profilo**.
- **Chat con widget generativi**:
  - `meal_log`: pasto scomposto in voci, con badge di confidenza. Tocchi una voce per cambiare la porzione, poi registri.
  - `macros`: anelli e barre della giornata, sempre aggiornati.
  - `ideas`: carosello di idee su misura per i macro rimanenti, la dieta e cosa eviti.
  - `recipe`: ricetta completa, registrabile con un tap.
  - `swap`: scambio furbo, per esempio patatine → patate al forno.
  - `grocery`: lista della spesa da spuntare.
  - `water`: tracker a bicchieri.
  - `week`: grafico degli ultimi 7 giorni.
  - `insight`: una nota concreta sui tuoi dati.
  - `targets`: il piano aggiornato, con il prima e il dopo, quando lo cambi parlando.
  - `meal_plan`: piano pasti di un giorno o di una settimana, con i giorni da scegliere.
  - `food_facts`: valori nutrizionali di un alimento o prodotto, con la tabella per 100 g.
  - `memory`: conferma di cosa Nouri ha memorizzato o dimenticato.
  - `workout_plan`: la scheda di allenamento, con le sedute da scegliere e *Segna fatto* per quella di oggi.
  - `exercise`: come si esegue un esercizio (muscoli, passaggi, un consiglio, un errore da evitare).
  - `exercises`: esercizi per un muscolo, da toccare per la spiegazione.
- **Conversazioni**: il menu laterale è la lista delle chat, come in ChatGPT: *Nuova conversazione*, ricerca nei titoli e nei messaggi, gruppi per data (Oggi, Ieri, Ultimi 7 giorni…), rinomina ed elimina con una pressione lunga o dal menu **⋯**. Il titolo nasce dal primo messaggio; il brief del mattino apre una conversazione nuova. Diario, memoria e piani sono in comune a tutte le chat.
- **Strumenti dal +**: il **+** del composer raccoglie tutto il resto: foto, acqua, scorciatoie, *Alimentazione* (valori nutrizionali, piano pasti, registra un pasto, diario di oggi), *Allenamento* (scheda, cerca esercizio) e *Memoria*.
- **Memoria**: Nouri ricorda i cibi che ami (*"adoro il salmone"*), quelli che non ti piacciono (*"odio i funghi"*) e le abitudini (*"ricordati che a pranzo mangio in mensa"*). Li usa in idee, ricette e piani pasti. Si gestisce, e si spegne, da **Memoria** (dal **+** o dal profilo).
- **Scorciatoie**: salva un pasto con il segnalibro sulla sua card, oppure scrivendo *"salvalo come colazione solita"*. Poi basta scrivere *"la solita colazione"*, o toccarla dal **+** o dal saluto iniziale, e finisce subito nel diario (con *Annulla* se serve). Funzionano anche con Claude, senza chiamate di rete.
- **Ricerca rapida dei valori nutrizionali**: la lente nell'header apre una ricerca istantanea. Gli alimenti comuni arrivano subito dalla tabella interna, anche offline; i prodotti confezionati arrivano da [Open Food Facts](https://world.openfoodfacts.org) per nome o per codice a barre. Su iOS e Android c'è lo scanner (`expo-camera`), sul web si possono scrivere le cifre. Scegli la porzione e aggiungi al diario con un tocco.
- **Piano pasti giornaliero o settimanale**: *"fammi un piano pasti"* in chat, oppure **Piano pasti** dal **+**. Di default è la settimana; durata e stile predefiniti si scelgono da **Piano pasti** o da **Memoria**. Colazione, pranzo, spuntino e cena calibrati su calorie e macro, senza i cibi che eviti e con più spesso quelli che ami. Per ogni piatto puoi segnarlo come mangiato, cambiarlo o aprire la ricetta. Il piano di oggi compare anche in **Oggi** e nel brief del mattino.
- **Il piano resta in memoria**: Nouri sa cosa prevede ogni giorno (*"cosa mangio stasera?"*, *"cosa c'è giovedì a pranzo?"*) e ricorda cosa è già fatto. Se chiedi di nuovo un piano e ce l'hai già, ti mostra quello (lo rifà solo con *"rifai il piano"*). Cambiando piano, i pasti già mangiati restano e la spesa già presa resta spuntata. I piani sostituiti finiscono tra i **piani salvati**, da riusare (*"riusa il piano precedente"*). Un piatto del piano registrato da qualsiasi punto (per esempio dalla sua ricetta) viene spuntato da solo.
- **Lista della spesa con le quantità**: gli ingredienti delle ricette sono sommati su tutti i giorni rimasti e moltiplicati per le porzioni del piano (*"Salmone · 300 g · 2 pasti · lun, gio"*), divisi per reparto; spezie e condimenti vanno in *Da controllare in dispensa*. Le spunte sono condivise tra chat e piano e si azzerano con un tocco.
- **Piano modificabile parlando**: *"voglio mettere massa"*, *"sono diventato vegano"*, *"ora peso 68 kg"*, *"sono intollerante al lattosio"*, *"voglio più proteine"*. Nouri ricalcola i target e mostra cosa è cambiato.
- **Brief del mattino**: al primo accesso di un nuovo giorno Nouri scrive per primo, con il resoconto di ieri, una nota e le idee per il prossimo pasto.
- **Foto del piatto**: scatta o carica una foto e Nouri riconosce ingredienti e porzioni.
- **Modalità voce**: orb a tutto schermo e risposte lette ad alta voce (`expo-speech`). La dettatura usa la Web Speech API su web e il microfono della tastiera su iOS e Android.
- **Oggi**: anelli concentrici, barre dei macro, acqua, timeline dei pasti, i pasti del piano da segnare, l'allenamento del giorno (se il modulo è attivo) e una nota di Nouri.
- **Allenamento (modulo facoltativo)**: è spento finché non lo attivi dal profilo o chiedi una scheda. Fa per l'allenamento quello che il resto dell'app fa per il cibo:
  - **scheda di esercizi** (come il piano pasti): obiettivo (forza, massa, dimagrire, in forma), livello, 2–6 allenamenti a settimana, corpo libero / casa / palestra e minuti per seduta. La settimana è divisa in sedute (total body, parte alta/gambe, spinta/tirata/gambe) con serie, ripetizioni e recuperi adatti all'obiettivo. Ogni esercizio si può cambiare con un altro dello stesso movimento; la seduta di oggi si segna come fatta e le kcal stimate compaiono in **Oggi**. Le schede precedenti restano salvate.
  - **cerca esercizio** (come la ricerca dei valori nutrizionali): 51 esercizi in italiano, per nome o per muscolo, filtrabili per attrezzatura.
  - **spiegazione dell'esercizio**: muscoli, passaggi numerati, consigli, errori da evitare e la versione più facile o più difficile.
  - In chat: *"fammi una scheda 3 volte a corpo libero"*, *"cosa mi alleno oggi?"*, *"ho fatto l'allenamento"*, *"come si fa lo squat bulgaro?"*, *"esercizi per i glutei"*, *"cosa mangio dopo l'allenamento?"*. I comandi della scheda rispondono subito anche con Claude attivo; Claude riceve la scheda e le sedute fatte e sceglie i parametri, ma gli esercizi vengono sempre dal catalogo dell'app.

## Avvio

```bash
bun install
bun start        # oppure: bun run web / bun run ios / bun run android
```

Senza configurazione Nouri usa il **motore demo offline** (`lib/ai/local.ts`): un motore di intenti in italiano con una tabella di alimenti e ricette. Riconosce frasi come *"ho mangiato 2 uova e un toast"*, *"idee per la cena"*, *"alternativa alle patatine"* e *"ho bevuto mezzo litro d'acqua"*. Le foto in modalità demo producono stime dimostrative.

## Attivare Claude

Copia `.env.example` in `.env` e imposta **una** delle due variabili:

```bash
# Consigliato: un tuo proxy che aggiunge la chiave lato server
EXPO_PUBLIC_NOURI_API_URL=https://nouri-proxy.example.workers.dev

# Solo per prototipi in locale: la chiave finisce nel bundle dell'app!
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

Con Claude attivo (`claude-opus-5`, effort `low` per risposte rapide) Nouri:

- risponde con **structured outputs**: lo schema JSON dei widget è in `lib/ai/claude.ts`, quindi ogni risposta si disegna come card;
- riceve a ogni messaggio il contesto della giornata (target, pasti registrati, macro rimanenti, dieta, cibi da evitare);
- analizza davvero le **foto** con la visione;
- usa i `fallbacks` lato server se una richiesta viene rifiutata dai classificatori;
- se la rete non risponde, passa al motore offline e lo segnala in chat.

Un proxy minimale, per esempio un Cloudflare Worker:

```js
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const headers = new Headers(req.headers);
    headers.set('x-api-key', env.ANTHROPIC_API_KEY);
    headers.delete('anthropic-dangerous-direct-browser-access');
    const res = await fetch(`https://api.anthropic.com${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: req.body,
    });
    const out = new Response(res.body, res);
    out.headers.set('access-control-allow-origin', '*');
    return out;
  },
};
```

In produzione aggiungi autenticazione e rate limiting al proxy, e gestisci la richiesta CORS preflight se usi la versione web.

## Struttura

```
app/                 schermate (chat, onboarding, oggi, profilo, voce, ricerca, memoria, piano pasti,
                     allenamento, cerca esercizio)
components/ui/       Orb, Glass/Card/Chip/bottoni, anelli, tipografia, sheet, menu, toast
components/chat/     header, composer (+ con gli strumenti), messaggi, menu laterale delle conversazioni
components/training/ spiegazione dell'esercizio, impostazioni della scheda
components/widgets/  le card generative
components/food/     scheda alimento, tabella nutrizionale, scanner del codice a barre
lib/ai/              askNouri() → Claude o motore offline (scorciatoie sempre istantanee)
lib/memory.ts        memoria: gusti, abitudini e scorciatoie
lib/mealplan.ts      generatore dei piani pasti, riuso dei piani salvati
lib/grocery.ts       lista della spesa: ingredienti sommati con le quantità, per reparto
lib/foodfacts.ts     valori nutrizionali della tabella interna
lib/foodsearch.ts    Open Food Facts: ricerca per nome e codice a barre
lib/exercises.ts     catalogo degli esercizi (passaggi, consigli, errori, varianti) e ricerca
lib/workout.ts       generatore della scheda: split per giorni, serie e ripetizioni per obiettivo
lib/ai/training.ts   comandi di allenamento del motore locale (scheda, oggi, fatto, spiegazioni)
lib/store.ts         stato persistito (zustand + AsyncStorage)
constants/theme.ts   design token
```

Per aggiungere un widget:

1. aggiungi il tipo in `lib/types.ts`;
2. aggiungi lo schema in `lib/ai/claude.ts`;
3. crea la card in `components/widgets/`;
4. aggiungi il caso in `components/widgets/index.tsx`.

## Note

- Le stime nutrizionali e le kcal degli allenamenti sono indicative e **non sostituiscono un professionista**. Se in chat si parla di dolore o infortuni, Nouri suggerisce di fermarsi e sentire un medico o un fisioterapista. Il prompt di sistema chiede a Claude di non incoraggiare restrizioni e di suggerire un professionista se emergono segnali di disturbi alimentari.
- Per la dettatura nativa dentro l'app, invece della tastiera, serve una development build con `expo-speech-recognition`.
- Icone: set Solar di 480 Design, licenza CC BY 4.0.
- Dati dei prodotti confezionati: Open Food Facts, licenza ODbL.
- Lo scanner del codice a barre usa `expo-camera`, incluso in Expo Go. Sul web `expo-camera` legge solo i QR code, per questo la versione web mostra la ricerca per nome o per cifre.
