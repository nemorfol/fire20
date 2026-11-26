# CLAUDE.md

Guida per agenti AI (Claude Code) e contributori che lavorano su questo repository.

## Cos'e' il progetto

**FIRE Planner** e' una web app per la pianificazione finanziaria **F.I.R.E.** (Financial
Independence, Retire Early) calibrata sul contesto **fiscale e previdenziale italiano**
(IRPEF, INPS, TFR, fondo pensione, capital gain).

Principio chiave: **tutto gira nel browser**. Nessun backend, nessun dato inviato a server
esterni. I dati dell'utente vivono in IndexedDB (sul dispositivo). Privacy by design.

## Comandi

```bash
npm run dev            # dev server (Vite)
npm run build          # build statica in build/
npm run preview        # preview della build
npm run check          # svelte-check + type check (svelte-kit sync incluso)
npm test               # Vitest (una passata, non-watch); npm run test:watch per il watch
npm run generate-icons # rigenera le icone PWA
```

- **Gate obbligatorio prima di un commit/PR: `npm run check` + `npm test`** (entrambi verdi).
  La CI (`.github/workflows/ci.yml`) esegue in sequenza `npm run check`, `npm test` e
  `npm run build` su ogni push a `main` e su ogni PR. Niente deve regredire.
- **Test suite (Vitest, config in `vitest.config.ts`):** ~11 file `*.test.ts`. Coprono il
  **motore fiscale/previdenziale** (`tax-italy`, `pension-italy`, `assumptions`, `withdrawal`,
  `life-events`), il **Monte Carlo deterministico** (`monte-carlo` con PRNG seedato → risultati
  riproducibili), le **statistiche** (`statistics`), le **migrazioni Dexie**
  (`src/lib/db/migration.test.ts`, con `fake-indexeddb`) e utility varie (`llm`, `markdown`).
  **Non** coperti: componenti Svelte, E2E/UI (nessun Playwright — vedi backlog nel piano).
- Build di produzione: `@sveltejs/adapter-static` con `fallback: '200.html'` → e' una **SPA
  statica**, deployabile su qualsiasi hosting statico (Vercel, Netlify, GitHub Pages...).

## Stack

- **SvelteKit 2** + **Svelte 5 in runes mode** (vedi `svelte.config.js`: runes attivo per tutto
  cio' che non e' in `node_modules`). Usa SEMPRE le rune: `$state`, `$derived`, `$effect`,
  `$props`. Niente sintassi legacy (`export let`, store reattivi `$:`) nel codice nuovo.
- **Tailwind CSS 4** (via `@tailwindcss/vite`) + **Flowbite-Svelte** per i componenti UI.
- **Apache ECharts 6** per i grafici.
- **Dexie 4** come wrapper IndexedDB.
- **PWA** via `@vite-pwa/sveltekit` (`generateSW`, autoUpdate). Lingua app: `it`.
- **Statistiche** implementate in casa in `src/lib/engine/statistics.ts` (nessuna dipendenza
  esterna: jStat/simple-statistics sono state rimosse perche' non usate).
- **jsPDF**, **xlsx**, **PapaParse** per export/report.

## Architettura

```
src/
├── routes/                 # pagine SvelteKit (una cartella per sezione)
│   ├── +page.svelte        # dashboard
│   ├── +layout.svelte/.ts  # layout e config (prerender/ssr)
│   ├── profilo/ calcolatore/ simulazione/ scenari/ rischi/
│   ├── dati-storici/ pensione/ fondo-pensione/ contenitori/
│   ├── confronto-profili/ performance/ community/ guida/ impostazioni/
├── lib/
│   ├── engine/             # MOTORE DI CALCOLO (TS puro, no UI) — vedi sotto
│   ├── db/                 # Dexie/IndexedDB: index.ts + profiles/results/scenarios
│   ├── workers/            # monte-carlo.worker.ts (simulazioni fuori dal main thread)
│   ├── data/              # dataset storici embedded (S&P500 1928+, CAPE, inflazione...)
│   ├── guida/              # steps.ts — contenuti della guida interattiva
│   ├── components/         # componenti Svelte riusabili
│   ├── i18n/               # stringhe/localizzazione
│   ├── utils/              # formattazione, import/export
│   └── assets/
```

### Il motore (`src/lib/engine/`)

Logica di dominio in TypeScript puro, **indipendente dalla UI** (facile da ragionarci e
modificare in isolamento). Moduli principali:

- `fire-calculator.ts` — FIRE Number, Coast FIRE, anni al FIRE, tasso di risparmio
- `monte-carlo.ts` + `statistics.ts` — simulazione Monte Carlo (parametrica / bootstrap)
- `withdrawal.ts` — strategie di prelievo (4%, VPW, Guyton-Klinger, CAPE-based)
- `tax-italy.ts` — IRPEF, capital gain (26% / 12.5% titoli di stato), bollo/IVAFE
- `pension-italy.ts` / `inps-simulator.ts` — pensione INPS contributiva, coefficienti
- `pension-fund.ts` / `tfr-rules.ts` — fondo pensione (deducibilita', tassazione) e TFR
- `risk-scenarios.ts` — scenari di stress (crash, inflazione, sequenza rendimenti...)
- `sensitivity.ts` — analisi di sensitivita' (tornado)
- `container-comparison.ts` — confronto contenitori fiscali
- `couple.ts` / `family.ts` — planner di coppia/famiglia
- `life-events.ts` — eventi di vita (bonus, spese una tantum)
- `assumptions.ts` — ipotesi/parametri condivisi
- `twr-calculator.ts` — time-weighted return

## Convenzioni e regole del progetto

- **Lingua: italiano.** UI, contenuti, commenti e messaggi di commit sono in italiano. Mantieni
  questo stile. (Nota: gli accenti nei file sono spesso resi come apostrofo, es. `funzionalita'`.)
- **Messaggi di commit**: conventional-commit in italiano → `feat:`, `fix:`, `refactor:`, ...
- **Dominio fiscale italiano**: aliquote, soglie e coefficienti (IRPEF, INPS, TFR, fondo
  pensione) sono numeri reali e sensibili. Verifica sempre i valori prima di modificarli e cita
  la fonte; un errore qui falsa tutte le proiezioni.
- **REGOLA IMPORTANTE — la guida va sempre aggiornata.** Ogni nuova funzionalita' utente
  richiede un blocco descrittivo dedicato in `src/lib/guida/steps.ts` (la guida interattiva e'
  parte integrante del prodotto: spiega all'utente cosa fa ogni feature). Non considerare una
  feature "completa" senza il relativo capitolo nella guida.
- **Tutto client-side**: niente segreti, niente chiamate a server proprietari, niente PII fuori
  dal dispositivo. I calcoli pesanti vanno in un Web Worker (vedi Monte Carlo) per non bloccare
  la UI.
- **Persistenza**: passa sempre dai moduli in `src/lib/db/`, non toccare IndexedDB direttamente.

## Invarianti da non rompere

Consolidati del progetto (dettaglio nella sezione 0 di `docs/PIANO-INTERVENTI-2026-07.md`):

1. **Tutto client-side.** Nessun backend, nessuna PII fuori dal dispositivo. Persistenza SOLO
   via `src/lib/db/` (mai IndexedDB diretto).
2. **Svelte 5 runes ovunque** (`$state`, `$derived`, `$effect`, `$props`). Niente `export let`
   ne' store `$:` legacy.
3. **`src/lib/engine/assumptions.ts` (`DEFAULT_2026`) e' l'unica fonte di aliquote/parametri
   fiscali.** Ogni modifica richiede la fonte normativa citata nel commento. Nota: IRPEF 2026
   con 2ª aliquota al **33% e' CORRETTA** (Legge di Bilancio 2026) — non "correggerla" al 35%.
4. **Invarianti motore Monte Carlo / FIRE** (fix del 2026-06-08, commit `fa86c13`): prelievo
   calcolato sulle **spese reali**; **floor dei rendimenti > -100%**; **bande di percentile** nei
   grafici. Il fondo pensione **non** e' tra i liquidi: e' un asset differito che diventa reddito
   via RITA/prestazione (`src/lib/engine/rita.ts`, #41, superata la scelta del 2026-06-08).
5. **Retrocompatibilita' profili IndexedDB.** Ogni nuovo campo `$bindable` su `Profile` rompe i
   profili salvati vecchi (gotcha `props_invalid_value`, lezione delle issue #33/#37/#38):
   normalizzare SEMPRE il campo in `loadProfileIntoState`, nello stato iniziale e nei default;
   se serve una migrazione Dexie `.upgrade()`, testarla in `src/lib/db/migration.test.ts`.
6. **Ogni feature utente richiede il suo capitolo in `src/lib/guida/steps.ts`.** Una feature
   senza capitolo nella guida non e' completa.
7. **Lingua italiana** per UI, commenti, commit; identita' git: **nemorfol**.

## Fonti normative

- `src/lib/engine/assumptions.ts` e' il **registro canonico** delle aliquote/soglie/coefficienti
  (IRPEF, INPS, TFR, fondo pensione, capital gain): resta la fonte di verita' del codice.
- La pagina **`/metodologia`** (`src/routes/metodologia/+page.svelte`) legge quei valori **a
  runtime** e li mostra all'utente con le fonti: e' la vetrina della trasparenza, non
  duplicare i numeri altrove.
- `docs/PIANO-INTERVENTI-2026-07.md` e' il **backlog corrente** (fasi A-D con criteri di
  accettazione): consultarlo prima di iniziare un intervento.

## Moduli non menzionati altrove

- **`src/lib/llm/`** — assistente AI **locale e opt-in** (Ollama o Chrome Prompt API): nessun
  dato lascia il dispositivo, coerente col principio client-side.
- **`src/lib/i18n/`** — infrastruttura di localizzazione (chiavi it/en). Oggi la UI e'
  di fatto solo italiano; usare `t('...')` per le stringhe che gia' vi passano.
- **`/metodologia`** — pagina che espone assunzioni e fonti (vedi sopra).

## Disclaimer

Strumento educativo e di simulazione. Non e' consulenza finanziaria.
