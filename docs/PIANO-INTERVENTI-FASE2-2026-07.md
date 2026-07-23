# Piano interventi FIRE Planner — Fase 2 (luglio 2026)

> **Come usare questo documento.** Seguito di `docs/PIANO-INTERVENTI-2026-07.md` (fasi A/B/C
> eseguite il 2026-07-19, commit da e75b026 a 5af0ee2). Raccoglie: (1) i difetti
> fiscali/previdenziali EMERSI durante l'esecuzione e deliberatamente non corretti perche'
> richiedono decisioni con fonte normativa; (2) l'intervento B5 rimasto in sospeso (misura);
> (3) la ex Fase D (investimenti strutturali). E' un mandato di lavoro per agenti Opus,
> da eseguire in batch sequenziali (stesso repo: mai batch in parallelo).
> Gate obbligatorio per ogni commit: `npm run check` + `npm test` + `npm run lint` +
> `npm run build` verdi. NON pushare: i commit restano locali per la revisione dell'utente.

---

## 0. Vincoli non negoziabili

Valgono INTEGRALMENTE i vincoli della sezione 0 di `docs/PIANO-INTERVENTI-2026-07.md`
(client-side only, runes, `assumptions.ts` unica fonte aliquote, invarianti Monte Carlo
fa86c13, retrocompatibilita' profili IndexedDB, guida sempre aggiornata, italiano,
identita' git nemorfol). In aggiunta, per questa fase:

1. **Ogni modifica a un numero fiscale/previdenziale visibile all'utente richiede fonte
   normativa primaria citata** (legge, decreto, circolare INPS/Agenzia Entrate) nel commento
   del codice E in `docs/ASSUNZIONI-FISCALI.md`. Se la fonte non e' reperibile con certezza,
   fermarsi e segnalare nel report invece di scegliere.
2. **Ogni cambiamento di stima visibile va dichiarato nel CHANGELOG** ("Non rilasciato") con
   una riga onesta che dice cosa cambia e perche' (es. "le stime pensione con stop contributi
   ora rivalutano il montante nel gap: valori piu' alti di prima").
3. I test di caratterizzazione esistenti che fissano il comportamento vecchio possono essere
   aggiornati SOLO insieme alla modifica giustificata da fonte, mai "per farli passare".
4. `src/lib/engine/inps-core.ts` e' il punto di consolidamento INPS: i calcoli condivisi
   nuovi vanno li', importati da `pension-italy.ts` e `inps-simulator.ts`. Non ricreare
   duplicazioni.
5. **Gotcha ambiente sandbox (Windows):** nei sandbox dei subagent `npm test` (pool `forks`
   di Vitest) puo' fallire all'import su TUTTI i file con `Cannot read properties of
   undefined (reading 'config')`. Non e' colpa del codice: validare con
   `npx vitest run --pool=vmThreads` e NON modificare `vitest.config.ts`. Nell'ambiente
   principale e in CI la suite e' verde (171+ test). Non lasciare server dev/preview attivi.
6. I domini utili per verificare fonti (inps.it, normattiva.it, agenziaentrate.gov.it,
   mefop.it...) sono raggiungibili via WebFetch; usarli per citare fonti primarie.

---

## FASE E — Correttezza fiscale/previdenziale (priorita' massima)

Questi difetti sono documentati nei report di esecuzione della fase 1 e nei commenti/test del
codice. Cambiano numeri visibili all'utente: applicare i vincoli 1-3 qui sopra.

### E1. Divergenza montante INPS nello scenario stop-contributi FIRE (#37) **[IL PIU' IMPORTANTE]**
- **File:** `src/lib/engine/pension-italy.ts`, `src/lib/engine/inps-simulator.ts`,
  `src/lib/engine/inps-core.ts`, `src/lib/engine/inps-coherence.test.ts`.
- **Problema (misurato):** con stop dei contributi all'eta' FIRE, `pension-italy` CONGELA il
  montante contributivo nel gap fino alla pensione, `inps-simulator` lo RIVALUTA ogni anno:
  fino a **+28%** di differenza sulla pensione stimata (caso: stop a 50, pensione a 67).
  Inoltre entrambi rivalutano il blocco "passato" solo fino ad oggi e non fino alla
  decorrenza, quindi nessuno dei due e' il modello corretto.
- **Riferimento normativo da verificare e citare:** art. 1, commi 8-9, L. 335/1995: il
  montante contributivo si rivaluta annualmente al tasso di capitalizzazione (media mobile
  quinquennale del PIL nominale) **indipendentemente dal versamento di nuovi contributi**;
  la rivalutazione si applica fino alla decorrenza della pensione. Confermare su fonte
  primaria (normattiva/INPS) prima di implementare; se la verifica smentisce, fermarsi e
  riportare.
- **Fare:** implementare in `inps-core.ts` UN modello unico di capitalizzazione del montante
  (contributi versati anno per anno + rivalutazione di TUTTO il montante ogni anno fino alla
  decorrenza, anche negli anni senza contributi), usarlo in entrambi i percorsi; aggiornare
  `inps-coherence.test.ts` perche' ora i due percorsi DEVONO coincidere anche nello scenario
  stop-FIRE (togliere la tolleranza/divergenza documentata); aggiornare i test golden di
  `pension-italy.test.ts` con i nuovi valori attesi, ricalcolati e spiegati nel commit.
- **Guida:** verificare i capitoli "Pensione INPS" e "Gap Pensionistico" e l'eventuale testo
  della feature #37 (stop contributi) in `/profilo` tab Pensione: allineare le descrizioni.
- **Accettazione:** stesso input → stessa pensione dai due percorsi in TUTTI gli scenari del
  test di coerenza; fonte citata nel codice e in ASSUNZIONI-FISCALI.md; CHANGELOG onesto.

### E2. Il selettore "autonomo" in PensionCalculator non ha effetto
- **File:** `src/lib/components/profilo/PensionCalculator.svelte` (o percorso attuale),
  `src/lib/engine/pension-italy.ts`, `src/lib/engine/inps-core.ts`.
- **Problema:** il componente calcola un `contributionRate` per `workerType` (autonomo
  0,2623) ma non lo passa a `calculateContributivePension`, che usa sempre 33%: la stima per
  gli autonomi e' silenziosamente quella dei dipendenti.
- **Fare:** far accettare a `calculateContributivePension` l'aliquota di computo (default
  33% dipendente) prendendola da `COMPUTATION_RATES` in `inps-core.ts`; collegare il
  selettore. ATTENZIONE semantica da verificare con fonte: per la gestione separata
  l'aliquota di computo coincide con la contributiva (26,23% professionisti senza altra
  cassa / 33,72% collaboratori — circolare INPS annuale); per artigiani/commercianti l'
  aliquota di computo e' diversa (storicamente 24%). Se il dato per la categoria mostrata
  nella UI non e' certo, limitare le opzioni della UI alle categorie con fonte certa invece
  di inventare aliquote.
- **Accettazione:** cambiare workerType cambia la stima; aliquote con fonte; test dedicato.

### E3. Netto pensione con IRPEF hardcoded in inps-simulator
- **File:** `src/lib/engine/inps-simulator.ts`, `src/lib/engine/tax-italy.ts`.
- **Problema:** il calcolo del netto usa scaglioni IRPEF duplicati hardcoded + addizionali
  2% invece delle funzioni di `tax-italy.ts` e dei valori di `assumptions.ts` (1,73% + 0,7%).
  Rischio di divergenza dal resto dell'app (che usa gia' la fonte unica).
- **Fare:** sostituire il calcolo locale con le funzioni esistenti di `tax-italy.ts`
  (comprese le detrazioni da pensione se gia' modellate — verificare cosa fa il resto
  dell'app per i redditi da pensione e restare coerenti). Nessun nuovo valore: solo
  eliminazione del duplicato.
- **Accettazione:** zero scaglioni hardcoded fuori da `tax-italy.ts`/`assumptions.ts`;
  test aggiornati se i netti cambiano (con delta spiegato nel commit).

### E4. Massimale contributivo L.335/1995 non applicato
- **File:** `src/lib/engine/inps-core.ts` + entrambi i percorsi.
- **Problema:** il massimale (122.295 € nel 2026, gia' presente in `assumptions.ts`) non e'
  applicato: per redditi alti i contributi vengono accreditati anche sulla parte eccedente,
  gonfiando il montante. Vale solo per iscritti post-1995 al contributivo puro.
- **Fare:** applicare il cap alla retribuzione imponibile annua in `inps-core.ts` (con flag
  o data di prima iscrizione per distinguere ante/post 1996 se il dato esiste nel modello;
  se non esiste, assumere post-1995 — coerente col target FIRE dell'app — e dichiararlo).
  Il massimale e' indicizzato: usare il valore di `assumptions.ts`, non hardcodare.
- **Accettazione:** scenario 150k del test di coerenza mostra il cap applicato; fonte citata;
  CHANGELOG (le stime per redditi alti si abbassano).

### E5. Tassazione TFR piu' fedele in tfr-rules
- **File:** `src/lib/engine/tfr-rules.ts`, `src/lib/engine/tfr-rules.test.ts`,
  componente `TFRDestination.svelte`, `docs/ASSUNZIONI-FISCALI.md`.
- **Problema (approssimazioni oggi dichiarate nei commenti):**
  1. la RIVALUTAZIONE del TFR in azienda e' tassata come il capitale, mentre sconta
     l'imposta sostitutiva del **17%** anno per anno (L. 190/2014, dal 2015; prima 11%) e
     NON rientra nella base della tassazione separata;
  2. l'aliquota di tassazione separata del capitale e' approssimata come `marginale*0,85`
     invece dell'aliquota media IRPEF di riferimento (art. 19 TUIR: aliquota media sul
     reddito di riferimento = TFR annualizzato sugli anni di servizio).
- **Fare:** (1) separare nel montante aziendale la quota capitale dalla quota rivalutazione,
  tassare la rivalutazione al 17% annuo e solo il capitale in tassazione separata;
  (2) sostituire l'approssimazione con il calcolo dell'aliquota media da art. 19 TUIR
  usando gli scaglioni di `tax-italy.ts` (reddito di riferimento = TFR maturato * 12 /
  anni di servizio, verificare la formula esatta su fonte). Aggiornare i 13 test di
  caratterizzazione con i nuovi valori spiegati; aggiornare la UI del tab Destinazione TFR
  se espone le vecchie approssimazioni nel testo; aggiornare ASSUNZIONI-FISCALI.md.
- **Accettazione:** fonti citate (L. 190/2014; art. 19 TUIR; art. 2120 c.c. invariato);
  confronto azienda-vs-fondo aggiornato; CHANGELOG onesto (il TFR in azienda rende
  leggermente di piu' di prima al netto).

---

## FASE F — B5: misura e (solo se serve) offload dal main thread

### F1. Misurare prima di ottimizzare
- **Contesto:** solo Monte Carlo gira nel worker; `projectPortfolio`
  (`src/lib/engine/fire-calculator.ts`) e la sensitivity/tornado girano sincroni, chiamati
  da ~19 punti.
- **Fare:** costruire un profilo di stress realistico (orizzonte 60 anni, coniuge, molti
  eventi di vita, glide path) e misurare con `performance.now()` i tempi reali di
  `projectPortfolio`, `calculateFireVariants` e della sensitivity nelle pagine calcolatore,
  confronto-profili e rischi (misura ripetuta, riportare mediana). Riportare i numeri nel
  report e in una nota nel piano.
- **Decisione incorporata:** se la mediana del percorso peggiore resta sotto ~50ms,
  DOCUMENTARE e chiudere B5 senza toccare nulla (niente ottimizzazioni speculative).
  Se supera nettamente (>100ms percepibili), procedere con F2.

### F2. Offload (solo se F1 lo giustifica)
- **Fare:** estrarre un worker per proiezioni/sensitivity riusando il pattern
  `monte-carlo.contract.ts` + `monte-carlo-client.ts` (contratto tipi serializzabile,
  helper client condiviso). Identico output numerico: i test esistenti restano verdi.
  Le pagine mostrano uno stato di caricamento coerente con quello della simulazione.
- **Accettazione:** stessi numeri di prima (test verdi senza modifiche); UI fluida.

---

## FASE G — Investimenti strutturali (ex Fase D)

Ordine deciso dall'utente: G1 (E2E) per primo. Un batch per intervento.

### G1. Test E2E con Playwright
- **Fare:** introdurre Playwright (`@playwright/test`, devDependency; config dedicata;
  browser chromium in CI). 4 smoke path critici contro `npm run preview`:
  1. crea profilo → calcolatore mostra FIRE Number → simulazione MC completa → salva scenario;
  2. import GestPTF (fixture anonima in `tests/fixtures/`);
  3. export backup → cancella dati → import backup → dati identici;
  4. profilo "legacy" (fixture JSON senza i campi nuovi) importato → nessun crash
     `props_invalid_value` (copre l'invariante retrocompatibilita').
  Job CI separato (non bloccare il job veloce esistente: step dedicato dopo build).
- **Accettazione:** 4 path verdi in locale e in CI; README/CONTRIBUTING aggiornati
  (`npm run test:e2e`).

### G2. Test import/export con fixture anonime
- **File:** `src/lib/utils/pdf-export.ts` (614 righe), `bank-import.ts` (501),
  `inps-parser.ts` (417), `broker-import.ts` (353) — oggi senza test.
- **Fare:** fixture SINTETICHE e anonime (VIETATO usare l'XML INPS personale presente in
  `utils/` sul disco o dati reali dell'utente) per: CSV banca tipo, XLSX broker tipo
  (generato col round-trip xlsx esistente), XML estratto conto INPS minimale sintetico.
  Test di parsing (casi felici + malformati: colonne mancanti, encoding, separatori
  decimali it). Per pdf-export: smoke test che il PDF si genera senza errori con un
  profilo campione.
- **Accettazione:** i 4 moduli hanno test; nessun dato personale nelle fixture.

### G3. Split dei monoliti (refactor senza cambi di comportamento)
- **Target in ordine:** `src/lib/guida/steps.ts` (2100+ righe → un file per categoria in
  `src/lib/guida/`, indice che li concatena: l'API `guideSteps` resta identica);
  `fire-calculator.ts` (scomporre `projectPortfolio` ~367 righe in funzioni pure per fase:
  redditi/spese/tasse/contributi/prelievi — stessi output, coperti dai test);
  `tax-italy.ts` (1113); `pension-fund.ts` (916); `db/index.ts` (tipi in un file separato,
  setup Dexie nell'altro; attenzione alle import circolari).
- **Regola:** un target per commit, test verdi dopo ognuno, zero cambi di output. Se un
  target si rivela rischioso, saltarlo e segnalare (meglio un monolite che una regressione).
- **Accettazione:** nessun file di codice sopra ~800 righe tra i target trattati; suite
  verde invariata.

### G4. Onboarding attivo e trasparenza diffusa
- **Fare:** (1) diffondere `AssumptionTooltip`/spiegazioni inline oltre il Calcolatore:
  Simulazione (parametri MC), Contenitori (ipotesi fiscali del confronto), Pensione
  (assunzioni del contributivo, incluso il modello E1), Dati Storici (provenienza dataset);
  (2) tour "primo avvio" leggero: banner/checklist sulla dashboard vuota che guida
  Profilo → Calcolatore → Simulazione → Guida (dismissibile, stato in localStorage via
  modulo dedicato, NON toccare IndexedDB direttamente).
- **Guida:** aggiornare i capitoli toccati se il testo descrive elementi UI cambiati.
- **Accettazione:** le 4 pagine hanno spiegazioni delle assunzioni; tour dismissibile.

---

## Ordine di esecuzione consigliato (batch sequenziali, mai paralleli)

1. **Batch E1** (da solo: e' il piu' delicato e cambia i golden test INPS)
2. **Batch E2+E3+E4** (stessi file INPS, si coordinano bene insieme, dopo E1)
3. **Batch E5** (TFR, indipendente)
4. **Batch F1** (misura; F2 solo se giustificato dai numeri)
5. **Batch G1** (E2E — protegge tutto quello che segue)
6. **Batch G2**, poi **G3** (con G1+G2 come rete di sicurezza), poi **G4**

## Decisioni gia' prese dall'utente (non ridiscutere)

- Le correzioni fiscali E1-E5 si FANNO (cambiano le stime: dichiararlo nel CHANGELOG).
- F2 si fa SOLO se F1 lo giustifica coi numeri (soglia ~100ms).
- Ordine Fase G: G1 per primo.
- Niente push automatico: commit locali, revisione dell'utente, push manuale.

## Punto di ripartenza per l'orchestratore

Ogni batch: leggere questo file + CLAUDE.md + CONTRIBUTING.md; commit atomici
conventional-commit in italiano chiusi da `Co-Authored-By: Claude Fable 5
<noreply@anthropic.com>`; mai committare `.claude/settings.local.json`; report finale con
esito gate, hash commit, numeri cambiati (prima/dopo/fonte) e dubbi segnalati.
