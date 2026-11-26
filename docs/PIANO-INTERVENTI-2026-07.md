# Piano interventi FIRE Planner — luglio 2026

> **Come usare questo documento.** E' il risultato di un'analisi rigorosa a tre livelli
> (tecnologica, funzionale, documentale) del repository, pensato come mandato di lavoro per un
> agente AI (Opus) o un contributore. Gli interventi sono raggruppati in 4 fasi ordinate per
> priorita'. Ogni intervento ha: file coinvolti, cosa fare, criterio di accettazione.
> Le decisioni marcate **[DECISIONE UTENTE]** vanno confermate prima di procedere.
> Gate obbligatorio per ogni commit: `npm run check` + `npm test` verdi, CI verde.

---

## 0. Vincoli non negoziabili (leggere PRIMA di toccare qualsiasi cosa)

Invarianti consolidati del progetto — nessun intervento di questo piano deve romperli:

1. **Tutto client-side.** Nessun backend, nessuna chiamata a server proprietari, nessuna PII
   fuori dal dispositivo. Persistenza SOLO via `src/lib/db/` (mai IndexedDB diretto).
2. **Svelte 5 runes mode** ovunque (`$state`, `$derived`, `$effect`, `$props`). Niente
   `export let` ne' store `$:` legacy.
3. **`assumptions.ts` (`DEFAULT_2026`) e' l'unica fonte delle aliquote/parametri fiscali.**
   Ogni modifica a valori fiscali richiede fonte normativa citata nel commento.
   Nota: IRPEF 2026 con 2ª aliquota al **33% e' CORRETTA** (Legge di Bilancio 2026) — non
   "correggerla" al 35%.
4. **Invarianti motore Monte Carlo / FIRE** (fix del 2026-06-08, commit fa86c13):
   prelievo calcolato sulle spese reali; floor dei rendimenti > -100%; bande di percentile nei
   grafici. Il fondo pensione e' un asset differito (RITA/prestazione), non liquido (#41).
5. **Retrocompatibilita' profili IndexedDB.** Ogni nuovo campo `$bindable` su `Profile` rompe
   i profili salvati vecchi (lezione delle issue #33/#37/#38): normalizzare SEMPRE in
   `loadProfileIntoState`, nello stato iniziale e nei default; se serve, migrazione Dexie
   `.upgrade()` con test in `src/lib/db/migration.test.ts`.
6. **Ogni feature utente richiede il suo capitolo in `src/lib/guida/steps.ts`.** Una feature
   senza capitolo nella guida non e' completa.
7. **Lingua italiana** per UI, commenti, commit (conventional-commit: `feat:`, `fix:`, ...).
   Identita' git: **nemorfol**.

---

## FASE A — Igiene documentale (priorita' massima, effort basso)

### A1. Correggere CLAUDE.md: informazione obsoleta sui test **[URGENTE]**

- **File:** `CLAUDE.md` (riga ~24).
- **Problema:** dichiara "Non esiste una test suite automatica... `npm run check` e' l'unico
  gate". E' FALSO da giugno 2026: esistono 11 file `*.test.ts` (Vitest) su engine/db/llm/utils
  e la CI (`.github/workflows/ci.yml`) esegue `npm run check` + `npm test` + `npm run build`.
  Un agente che legge CLAUDE.md oggi viene fuorviato sul gate di qualita'.
- **Fare:** riscrivere la sezione comandi/gate: `npm test` (Vitest) e' parte del gate; elencare
  cosa coprono i test (motore fiscale, monte-carlo con seed, migrazioni Dexie) e cosa no
  (componenti Svelte, E2E). Aggiungere `npm test` ai comandi.
- **Accettazione:** CLAUDE.md riflette lo stato reale di test e CI.

### A2. Estendere CLAUDE.md con le sezioni mancanti

- **File:** `CLAUDE.md`.
- **Fare:** aggiungere sezioni sintetiche (rimandando ai file per il dettaglio):
  - **Invarianti da non rompere** — riportare la lista della sezione 0 di questo documento.
  - **Fonti normative** — puntare a `src/lib/engine/assumptions.ts` come registro canonico e
    alla pagina `/metodologia` (`src/routes/metodologia/+page.svelte`) che lo legge a runtime.
  - **Moduli non menzionati** — `src/lib/llm/` (assistente AI locale Ollama/Prompt API,
    opt-in), `src/lib/i18n/`, pagina `/metodologia`.
  - **Retrocompatibilita' profili** — il gotcha `props_invalid_value` (vedi vincolo 5).
- **Accettazione:** un agente nuovo puo' lavorare senza scoprire queste cose per tentativi.

### A3. Creare CHANGELOG.md

- **File nuovo:** `CHANGELOG.md` (formato Keep a Changelog, in italiano).
- **Fonti:** distillare da `git log` e dalle bozze locali `FORUM_POST_UPDATE*.txt` (contengono
  changelog narrativi non versionati, a rischio perdita). Ricostruire almeno le macro-ondate:
  fondazione test/CI/PRNG, ondata trasparenza (metodologia, assumptions panel), ondata
  coppia/famiglia/eredita' (#29-#31), patrimonio IT + GestPTF (#37/#38), assistente AI.
- **Accettazione:** CHANGELOG versionato; da qui in poi ogni feat/fix utente aggiunge una riga.

### A4. Creare docs/ con il registro delle assunzioni fiscali

- **File nuovo:** `docs/ASSUNZIONI-FISCALI.md`.
- **Fare:** tabella {parametro, valore 2026, fonte normativa, file/costante nel codice} estratta
  da `assumptions.ts` e dalla pagina metodologia (IRPEF 33%, crypto 33%, L.335/1995 massimale,
  L.438/1992, D.Lgs. 252/2005, DM 20/11/2024 coefficienti, circolare INPS 6/2026, TUIR 12,5%
  white list, art. 2120 c.c. per TFR). Indicare esplicitamente che il codice
  (`assumptions.ts`) resta la fonte di verita' e questo file e' l'indice navigabile.
- **Accettazione:** ogni valore ha fonte citata; nessun valore in contrasto col codice.

### A5. CONTRIBUTING.md + template GitHub

- **File nuovi:** `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/bug.yml`,
  `.github/ISSUE_TEMPLATE/feature.yml`, `.github/PULL_REQUEST_TEMPLATE.md`.
- **Fare:** estrarre e ampliare la sezione "Contributi" del README: gate (`check`+`test`),
  convenzioni (italiano, runes, conventional-commit), regola della guida, regola fonti fiscali,
  regola retrocompatibilita' profili. Il PR template include la checklist: check/test verdi,
  guida aggiornata, migrazione profili considerata, CHANGELOG aggiornato.
- **Accettazione:** template attivi su GitHub; CONTRIBUTING linkato dal README.

### A6. Pulizia repo root

- **Fare:**
  - `git rm --cached FORUM_POST.md` e aggiornare `.gitignore` da `FORUM*.txt` a `FORUM*`
    (le bozze forum sono lavoro locale, il pattern attuale non copre il `.md`).
  - Valutare lo spostamento di `take-screenshots.mjs` e `generate-icons.mjs` in `scripts/`
    (aggiornando gli script npm relativi).
- **Nota (solo segnalazione, non azione):** sul disco esiste `utils/rggntn81c30a783a.xml`
  (estratto INPS personale, gia' ignorato da git) — verificare che resti fuori da ogni export.
- **Accettazione:** `git status` pulito, nessuna bozza personale tracciata.

---

## FASE B — Igiene tecnica (priorita' alta, effort basso/medio)

### B1. Dipendenze: rimuovere le morte, sistemare le fuori posto

- **File:** `package.json`.
- **Fare:**
  - Rimuovere `jstat` e `simple-statistics`: dichiarate ma con ZERO import in `src`
    (le statistiche sono in `src/lib/engine/statistics.ts` proprio). Attenzione: CLAUDE.md le
    cita nello stack — aggiornare anche quello (coordinare con A2).
  - Spostare `puppeteer-core` da `dependencies` a `devDependencies` (usato solo da
    `take-screenshots.mjs`).
- **Accettazione:** `npm ci && npm run check && npm test && npm run build` verdi.

### B2. `xlsx@0.18.5`: vulnerabilita' note **[DECISIONE UTENTE sulla strategia]**

- **File:** `package.json`, `src/lib/utils/broker-import.ts` (e ogni altro uso).
- **Problema:** la versione npm di SheetJS e' ferma e ha CVE note (prototype pollution/ReDoS);
  processa file caricati dall'utente.
- **Opzioni:** (a) passare alla distribuzione ufficiale SheetJS via tarball CDN
  (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`); (b) migrare a `exceljs` o simile.
  Raccomandata: (a), minimo impatto API.
- **Accettazione:** import XLSX funzionante su un file di prova; nessuna CVE nota sulla
  versione installata.

### B3. Introdurre lint/format

- **File nuovi:** config ESLint (flat config con `eslint-plugin-svelte` +
  `typescript-eslint`) e Prettier (`prettier-plugin-svelte`, `prettier-plugin-tailwindcss`).
- **Fare:** aggiungere `npm run lint` e `npm run format`; integrare `lint` nella CI; un unico
  commit separato di sola formattazione se si adotta Prettier sull'esistente.
- **Accettazione:** CI con step lint verde; nessun cambiamento funzionale.

### B4. Deduplicare componenti e setup worker

- **File:** `src/lib/components/shared/EChart.svelte` vs
  `src/lib/components/simulazione/EChart.svelte` (due wrapper ECharts distinti);
  setup del worker Monte Carlo duplicato tra `src/routes/simulazione/+page.svelte` e
  `src/routes/scenari/+page.svelte`; `ScenarioComparison.svelte` esiste con lo stesso nome in
  `rischi/` e `scenari/` (domini diversi: rinominare per disambiguare).
- **Fare:** un solo `EChart.svelte` in `shared/`; estrarre un helper/composable
  `createMonteCarloWorker` (es. in `src/lib/workers/`) usato da entrambe le pagine.
- **Accettazione:** grafici e simulazioni invariati in entrambe le pagine; check/test verdi.

### B5. Offload dei calcoli pesanti dal main thread (effort medio) **[DECISIONE UTENTE]**

- **Problema:** solo Monte Carlo gira nel worker. `projectPortfolio`
  (`src/lib/engine/fire-calculator.ts`, funzione da ~367 righe) e la sensitivity/tornado girano
  sincroni sul main thread, chiamati da ~19 punti (calcolatore, confronto-profili, rischi...):
  possibili freeze UI su input pesanti.
- **Fare (proposta):** misurare prima (profiling con un profilo carico di eventi/anni); se
  confermato, estrarre un worker generico per proiezioni/sensitivity riusando il pattern
  contratto-tipi di `monte-carlo.contract.ts`. Non cambiare i risultati numerici: i test golden
  esistenti devono restare verdi.
- **Accettazione:** nessuna regressione numerica; interazioni fluide sulle pagine pesanti.

### B6. Tipizzare i callback ECharts

- **File:** ~13 componenti `.svelte` con 30 usi di `any` (concentrati in
  `dati-storici/+page.svelte` e `impostazioni/+page.svelte`).
- **Fare:** usare i tipi di `echarts` (`ECElementEvent`, `EChartsOption`, formatter tipizzati).
  E' l'unica falla di tipizzazione: il motore ha 0 `any`.
- **Accettazione:** riduzione drastica degli `any` senza regressioni visive.

---

## FASE C — Coerenza funzionale (priorita' alta)

### C1. Modulo orfano `tfr-rules.ts`: promessa non mantenuta **[DECISIONE UTENTE]**

- **Problema:** `src/lib/engine/tfr-rules.ts` esporta `checkTFRAnticipationEligibility` e
  `compareTFRDestination` (TFR in azienda vs fondo pensione, art. 2120 c.c.) ma NESSUNA UI le
  usa. La guida (step 12, `steps.ts:~1321`) descrive la funzionalita' come esistente.
- **Opzioni:** (a) costruire la UI — sezione "Destinazione TFR" dentro `/fondo-pensione`
  (tab dedicato: confronto TFR in azienda vs fondo + verifica eleggibilita' anticipo);
  (b) rimuovere la promessa dalla guida e marcare il modulo come non esposto.
  Raccomandata: (a) — il motore c'e' gia' ed e' testabile, il valore utente e' alto.
- **Accettazione:** guida e UI allineate (in un senso o nell'altro); se (a), nuovo capitolo
  guida o aggiornamento dello step 12 + test sul modulo.

### C2. Guida: 5 feature reali senza capitolo (viola la regola di progetto)

- **File:** `src/lib/guida/steps.ts` (+ `src/routes/guida/+page.svelte`).
- **Mancano capitoli dedicati per:** `/scenari` (scenari salvati e confronto), `/dati-storici`,
  `/contenitori` (confronto contenitori fiscali), `/confronto-profili`, `/community`.
- **Fare:** scrivere i 5 capitoli nello stile esistente (HTML italiano, esempi numerici
  realistici, `appLink` alla route). Collocazione suggerita: contenitori in "Fiscalita'
  Italiana"; scenari, dati storici e confronto profili in "Calcoli e Simulazioni" o "Strategie
  Avanzate"; community in "Preparazione Finale".
- **Fix contestuali:** `routes/guida/+page.svelte` righe ~102 e ~113 dicono hardcoded
  "20 passi" ma gli step sono 21 → usare `guideSteps.length` invece del numero fisso.
  Riordinare lo step 21 (Assistente AI, oggi in "Strategie Avanzate" ma numerato dopo la
  checklist finale) in modo che numerazione e categorie siano coerenti.
- **Accettazione:** ogni route utente ha il suo capitolo; conteggio dinamico; ordine coerente.

### C3. i18n: decidere e uniformare **[DECISIONE UTENTE]**

- **Problema:** l'infrastruttura i18n esiste (`src/lib/i18n/`, ~85 chiavi it/en) ma e' usata da
  soli 6 file; ~95% della UI e' italiano hardcoded (guida inclusa, 2119 righe). Il selettore
  lingua in Impostazioni promette un inglese che non esiste: switch EN inutilizzabile.
- **Opzioni:** (a) rimuovere/nascondere il selettore lingua e dichiarare l'app solo-italiano
  (coerente col dominio fiscale IT; effort minimo); (b) completare l'i18n (effort enorme:
  tradurre anche la guida). Raccomandata: (a) per ora.
- **In ogni caso:** uniformare le 2 voci sidebar hardcoded ("Assistente AI",
  "Metodologia e Fonti") in `src/routes/+layout.svelte` che non passano da `t('nav.*')` come
  le altre 15.
- **Accettazione:** nessuna promessa di lingua non mantenuta; sidebar uniforme.

### C4. Doppia fonte di verita' sulla pensione INPS

- **File:** `src/lib/engine/pension-italy.ts` (usato da `PensionCalculator.svelte`) vs
  `src/lib/engine/inps-simulator.ts` (usato da `/pensione` e `INPSSimulator.svelte`).
- **Problema:** due moduli coprono la stima pensione contributiva in punti diversi della UI:
  rischio che `/pensione` e Profilo→Pensione divergano nei risultati.
- **Fare:** audit delle formule nei due moduli; consolidare i calcoli condivisi (coefficienti
  di trasformazione, montante) in un'unica implementazione importata da entrambi, o fondere i
  moduli. Aggiungere un test di coerenza: stesso input → stessa pensione dai due percorsi.
- **Accettazione:** test di coerenza verde; nessun valore fiscale cambiato senza fonte.

### C5. Discoverability delle feature "sepolte" (effort medio, UX)

- **Problema:** funzioni forti vivono solo dentro tab (Coniuge, Eventi di vita, import
  GestPTF/Banca/INPS nel Profilo; Cash flow e tornado nel Calcolatore); `/confronto-profili` e
  `/community` dipendono da dati creati altrove senza agganci contestuali; sidebar piatta a
  17 voci senza raggruppamento.
- **Fare (proposta minima):** raggruppare la sidebar in sezioni (es. "Pianifica" / "Simula" /
  "Fisco e pensione" / "Strumenti" / "Aiuto"); aggiungere link contestuali (da `/profilo` a
  `/confronto-profili` quando esistono 2+ profili; da `/scenari` a `/community`); empty-state
  che spiegano il prerequisito.
- **Accettazione:** ogni feature raggiungibile con un percorso evidente; issue #32 (sidebar
  scroll) non regredita.

---

## FASE D — Investimenti strutturali (priorita' media, effort alto) **[DECISIONE UTENTE]**

Da pianificare come lavori dedicati, non nello stesso ciclo delle fasi A-C:

- **D1. Split dei monoliti:** `guida/steps.ts` (2119 righe → un file per categoria o contenuti
  in Markdown importati), `tax-italy.ts` (1113), `fire-calculator.ts` (928, `projectPortfolio`
  da 367 righe da scomporre in funzioni pure testabili), `pension-fund.ts` (916),
  `db/index.ts` (401, separare i tipi dal setup Dexie). Refactor senza cambi di comportamento,
  protetto dai test esistenti.
- **D2. Test UI/E2E:** oggi 0 test su 65 componenti Svelte. Introdurre Playwright con 3-4
  smoke path critici (crea profilo → calcolatore → simulazione → salva scenario; import
  GestPTF; export/import backup). Copre anche il rischio migrazione profili.
- **D3. Test import/export:** `pdf-export.ts` (614), `bank-import.ts` (501),
  `inps-parser.ts` (417), `broker-import.ts` (353) non hanno test: aggiungere fixture
  anonimizzate e test di parsing (NON usare l'XML INPS personale presente sul disco).
- **D4. Onboarding attivo:** tour "primo avvio" e diffusione di `AssumptionTooltip` oltre il
  Calcolatore (Simulazione, Contenitori, Pensione, Dati Storici) per chiudere il rischio
  black-box residuo.

---

## Ordine di esecuzione consigliato

1. **A1** (CLAUDE.md stale — sblocca ogni agente successivo) → A2, A6, B1 (stesso giro: CLAUDE.md
   cita jstat/simple-statistics).
2. **C2** (guida) e **A3/A4/A5** (changelog, assunzioni, contributing) — paralleli, solo docs.
3. **B2, B3, B4, B6** — igiene tecnica incrementale.
4. **C1, C3, C4** dopo conferma delle decisioni utente; poi **C5**.
5. **Fase D** come cicli dedicati.

## Decisioni da confermare con l'utente prima di partire

| #   | Decisione                                               | Raccomandazione     |
| --- | ------------------------------------------------------- | ------------------- |
| B2  | Strategia xlsx (CDN SheetJS vs exceljs)                 | Tarball CDN SheetJS |
| B5  | Offload proiezioni in worker: fare ora o solo misurare? | Prima misurare      |
| C1  | TFR: costruire UI o togliere promessa dalla guida       | Costruire la UI     |
| C3  | i18n: nascondere selettore EN o completare traduzioni   | Nascondere per ora  |
| D   | Quale investimento strutturale prioritizzare            | D2 (E2E) per primo  |
