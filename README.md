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
| Motion | Testo che arriva parola per parola, card che entrano in dissolvenza, numeri e anelli che si animano, feedback aptico leggero |

## Cosa fa

- **Onboarding conversazionale**: sei domande, una alla volta, poi Nouri mostra il tuo "ritmo" (kcal, macro, acqua).
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
- **Piano modificabile parlando**: *"voglio mettere massa"*, *"sono diventato vegano"*, *"ora peso 68 kg"*, *"sono intollerante al lattosio"*, *"voglio più proteine"*. Nouri ricalcola i target e mostra cosa è cambiato.
- **Brief del mattino**: al primo accesso di un nuovo giorno Nouri scrive per primo, con il resoconto di ieri, una nota e le idee per il prossimo pasto.
- **Foto del piatto**: scatta o carica una foto e Nouri riconosce ingredienti e porzioni.
- **Modalità voce**: orb a tutto schermo e risposte lette ad alta voce (`expo-speech`). La dettatura usa la Web Speech API su web e il microfono della tastiera su iOS e Android.
- **Oggi**: anelli concentrici, barre dei macro, acqua, timeline dei pasti e una nota di Nouri.

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
app/                 schermate (chat, onboarding, oggi, profilo, voce)
components/ui/       Orb, Glass/Card/Chip/bottoni, anelli, tipografia
components/chat/     header, composer, messaggi, testo in streaming, stato "sto pensando"
components/widgets/  le card generative
lib/ai/              askNouri() → Claude o motore offline
lib/store.ts         stato persistito (zustand + AsyncStorage)
constants/theme.ts   design token
```

Per aggiungere un widget:

1. aggiungi il tipo in `lib/types.ts`;
2. aggiungi lo schema in `lib/ai/claude.ts`;
3. crea la card in `components/widgets/`;
4. aggiungi il caso in `components/widgets/index.tsx`.

## Note

- Le stime nutrizionali sono indicative e **non sostituiscono un professionista**. Il prompt di sistema chiede a Claude di non incoraggiare restrizioni e di suggerire un professionista se emergono segnali di disturbi alimentari.
- Per la dettatura nativa dentro l'app, invece della tastiera, serve una development build con `expo-speech-recognition`.
