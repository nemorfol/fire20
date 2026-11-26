# Contribuire a FIRE Planner

Grazie per l'interesse! I contributi sono benvenuti: il progetto **accetta Pull Request su
GitHub**. Questa guida raccoglie tutto ciò che serve per contribuire senza scoprire le
convenzioni per tentativi.

Per un quadro d'insieme di architettura, comandi e invarianti, parti da
[`CLAUDE.md`](CLAUDE.md). Il backlog corrente con i criteri di accettazione è in
[`docs/PIANO-INTERVENTI-2026-07.md`](docs/PIANO-INTERVENTI-2026-07.md).

## Prima di iniziare

Per modifiche rilevanti, **apri prima una issue** per discuterne: così evitiamo lavoro
duplicato e ci allineiamo sull'approccio.

## Setup

Requisiti: Node.js 18+ (la CI usa Node 22).

```bash
npm ci            # installazione riproducibile (usa package-lock.json)
npm run dev       # dev server (Vite) su http://localhost:5173
npm run build     # build statica in build/
npm run preview   # preview della build
```

## Gate obbligatorio prima di aprire una PR

Entrambi i comandi devono essere **verdi**:

```bash
npm run check     # svelte-check + type check (svelte-kit sync incluso)
npm test          # Vitest (una passata; npm run test:watch per il watch)
```

La **CI** (`.github/workflows/ci.yml`) esegue in sequenza `npm run check`, `npm test` e
`npm run build` su ogni push a `main` e su ogni PR. **Niente deve regredire.**

La test suite Vitest copre il motore fiscale/previdenziale, il Monte Carlo deterministico (PRNG
seedato → risultati riproducibili), le statistiche e le migrazioni Dexie
(`src/lib/db/migration.test.ts`, con `fake-indexeddb`). Non sono coperti componenti Svelte ed
E2E: se tocchi quella superficie, verifica manualmente.

## Convenzioni

- **Lingua italiana ovunque**: UI, contenuti, commenti e messaggi di commit. (Gli accenti nei
  file sono spesso resi come apostrofo, es. `funzionalita'`.)
- **Messaggi di commit conventional-commit in italiano**: `feat:`, `fix:`, `refactor:`,
  `docs:`, `chore:`, ... — con scope quando utile, es. `fix(fiscale): ...`.
- **Svelte 5 in runes mode**: usa sempre `$state`, `$derived`, `$effect`, `$props`. Niente
  sintassi legacy (`export let`, store reattivi `$:`) nel codice nuovo.
- **Persistenza solo via `src/lib/db/`**: mai toccare IndexedDB direttamente.
- **Tutto client-side**: niente backend, niente segreti, nessuna PII fuori dal dispositivo. I
  calcoli pesanti vanno in un Web Worker (vedi il Monte Carlo) per non bloccare la UI.

## Regole specifiche del progetto

Queste tre regole sono la causa più frequente di PR da rilavorare. Leggile.

### 1. Ogni feature utente richiede il suo capitolo nella guida

La guida interattiva è **parte integrante del prodotto**: spiega all'utente cosa fa ogni
funzionalità. Ogni nuova feature utente richiede un blocco descrittivo dedicato in
[`src/lib/guida/steps.ts`](src/lib/guida/steps.ts) (HTML italiano, esempi numerici realistici,
`appLink` alla route). **Una feature senza capitolo nella guida non è completa.**

### 2. Mai cambiare aliquote/valori fiscali senza fonte citata

[`src/lib/engine/assumptions.ts`](src/lib/engine/assumptions.ts) (`DEFAULT_2026`) è l'**unica
fonte** delle aliquote/soglie/coefficienti fiscali; la pagina `/metodologia` li legge a runtime
e li mostra con le fonti. Ogni modifica a un valore fiscale richiede la **fonte normativa
citata nel commento**. Un errore qui falsa tutte le proiezioni.

> Nota: l'IRPEF 2026 con 2ª aliquota al **33% è corretta** (Legge di Bilancio 2026) — non
> «correggerla» al 35%.

Vedi il registro navigabile in [`docs/ASSUNZIONI-FISCALI.md`](docs/ASSUNZIONI-FISCALI.md).

### 3. Retrocompatibilità dei profili salvati (gotcha `props_invalid_value`)

I profili degli utenti vivono in IndexedDB e possono essere stati creati con versioni
precedenti. Ogni nuovo campo `$bindable` su `Profile` rompe i profili vecchi (lezione delle
issue #33 / #37 / #38: un campo `undefined` legato a una prop `$bindable` lancia
`props_invalid_value` al primo render e mostra l'error boundary sull'intera sezione).

Quando aggiungi un campo a `Profile`, **normalizzalo sempre** in:

- `loadProfileIntoState` (al caricamento del profilo),
- lo **stato iniziale** del componente,
- i **default** (`getDefaultProfileData`).

Se serve una migrazione Dexie `.upgrade()`, **testala** in `src/lib/db/migration.test.ts`
(con `fake-indexeddb`).

## Prima di aprire la PR

- Aggiorna il [`CHANGELOG.md`](CHANGELOG.md) (voce nella sezione «Non rilasciato»).
- Compila il template di PR (checklist inclusa).
- Mantieni i commit atomici e in italiano.

## Licenza

Contribuendo, accetti che il tuo contributo sia distribuito con licenza
[MIT](LICENSE), come il resto del progetto.
