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
npm run generate-icons # rigenera le icone PWA
```

- **Non esiste una test suite automatica.** Prima di un commit/PR esegui `npm run check`:
  e' l'unico gate (type check + diagnostica Svelte). Niente deve regredire.
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
- **jStat** / **simple-statistics** per le distribuzioni statistiche.
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

## Disclaimer

Strumento educativo e di simulazione. Non e' consulenza finanziaria.
