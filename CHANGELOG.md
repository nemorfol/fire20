# Changelog

Tutte le modifiche rilevanti a **FIRE Planner** sono documentate qui.

Il formato si ispira a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/),
adattato al progetto: non ci sono ancora release numerate né tag git, quindi la storia è
organizzata in **ondate** (macro-cicli di sviluppo) con la relativa data, dalla più recente
alla più vecchia. Ogni voce è raggruppata in **Aggiunto**, **Modificato**, **Corretto**,
**Rimosso**, **Sicurezza**.

Le date sono quelle reali dei commit. Da qui in avanti ogni `feat:`/`fix:` utente aggiunge la
sua riga nella sezione «Non rilasciato».

---

## [Non rilasciato]

### Aggiunto

- **Tab «Destinazione TFR»** nella pagina Fondo Pensione: confronta il netto a scadenza del TFR
  lasciato in azienda (rivalutazione 1,5% + 75% inflazione, tassazione separata) contro il
  conferimento al fondo pensione (D.Lgs. 252/2005), con grafico e rendimento netto annualizzato,
  e verifica l'eleggibilità all'anticipazione (art. 2120 c.c.: 8 anni di anzianità, una sola
  volta, fino al 70%) con importo massimo, tassazione stimata e tabella dei requisiti. I campi
  sono precompilati dal profilo attivo (empty state se manca). Espone i moduli finora orfani
  `checkTFRAnticipationEligibility` e `compareTFRDestination` di `tfr-rules.ts`, allineando la
  guida (capitolo «Fondi Pensione e TFR») alla funzionalità reale.
- Test di caratterizzazione per `tfr-rules.ts` (`src/lib/engine/tfr-rules.test.ts`) che fissano il
  comportamento di eleggibilità e confronto destinazione.
- **Modulo condiviso `inps-core.ts`** e test di coerenza `inps-coherence.test.ts`: unica fonte per
  aliquote di computo (33% dipendente / 26,23% autonomo / 33,72% gestione separata), tasso di
  rivalutazione del montante (1,5%, media PIL nominale, art. 1 c. 9 L. 335/1995) e primitiva di
  capitalizzazione, importata sia da `pension-italy.ts` (Profilo → Pensione) sia da
  `inps-simulator.ts` (`/pensione`). Nessun risultato utente cambia: il consolidamento è a parità
  di numeri (i 164 test preesistenti restano verdi). Il test di coerenza documenta che i due
  percorsi coincidono nella carriera piena (scarto < 2,5%) e fissa una **divergenza nota, non
  ancora consolidata**, nello scenario «stop contributi all'età FIRE» (#37): la pagina `/pensione`
  rivaluta il montante durante il gap fino alla pensione, mentre Profilo → Pensione lo congela,
  con una differenza di stima dell'ordine del 25-30%. L'allineamento richiede una revisione — con
  fonte — del modello di rivalutazione del montante ed è rimandato a un intervento dedicato.

### Modificato

- **i18n solo-italiano**: nascosto il selettore lingua in Impostazioni (prometteva un inglese non
  mantenuto). L'infrastruttura `src/lib/i18n/` resta in piedi per una localizzazione futura; il
  locale residuo `'en'` eventualmente salvato in `localStorage` viene normalizzato a `'it'` così
  la UI resta coerente. Uniformate le voci sidebar «Assistente AI» e «Metodologia e Fonti», ora
  passano da `t('nav.*')` come le altre (aggiunte le chiavi it/en).

---

## Igiene documentale e tecnica — 2026-07-19

Giro di manutenzione: allineamento della documentazione allo stato reale del progetto e
pulizia delle dipendenze.

### Aggiunto

- `CHANGELOG.md` (questo file), `docs/ASSUNZIONI-FISCALI.md` (registro navigabile delle
  assunzioni fiscali), `CONTRIBUTING.md` e i template GitHub (issue bug/feature, pull request).
- `docs/PIANO-INTERVENTI-2026-07.md` versionato come backlog corrente (fasi A–D).

### Modificato

- `CLAUDE.md` allineato a test e CI reali (Vitest fa parte del gate, non solo `npm run check`);
  aggiunte le sezioni «Invarianti da non rompere», «Fonti normative» e i moduli finora non
  documentati (`src/lib/llm/`, `src/lib/i18n/`, pagina `/metodologia`).
- Script `generate-icons.mjs` e `take-screenshots.mjs` spostati in `scripts/`.
- `puppeteer-core` spostato tra le `devDependencies`.

### Rimosso

- Dipendenze dichiarate ma mai importate: `jstat` e `simple-statistics` (le statistiche sono
  implementate in casa in `src/lib/engine/statistics.ts`).
- Bozze dei post per i forum escluse dal versioning.

---

## Patrimonio Italia, import GestPTF ed eredità — 2026-07-07

Ondata di evoluzione del prodotto sul lato patrimonio/decumulo, con due issue segnalate
(#37, #38) e il relativo fix di retrocompatibilità profili.

### Aggiunto

- **BFP (Buoni Fruttiferi Postali)** e **Conti Deposito** come classi di asset dedicate, con
  fiscalità propria (BFP 12,5% ed esenti bollo; CD 26% + bollo). Migrazione Dexie v6 additiva
  con normalizzazione anti-crash.
- **Import del patrimonio da GestPTF** (file JSON, tutto client-side) con modalità
  «Sostituisci» o «Somma».
- Evento **«Liquidazione immobile»**: plusvalenza con regola dei 5 anni ed esenzione prima
  casa, incasso unico o rateale (ammortamento francese) con TIR.
- **Selettore regione** per l'addizionale IRPEF regionale.
- **Funded ratio** e **spending smile** (modello Blanchett) nel decumulo.
- Import di backup **non distruttivo** (modalità «Unisci» di default vs «Sostituisci»).
- **#38 — bucket obiettivo per eredità liquide**: patrimonio a basso rischio tenuto fuori dal
  portafoglio ETF, con copertura automatica dei costi universitari dei figli.

### Modificato

- **Aliquota capital gain «blended»** derivata dalla composizione reale del portafoglio: rimosso
  il 26% hard-coded da dashboard, confronto profili, rischi, export PDF e calcolatore.
- **Cripto 33% dal 2026** (verificata) e adeguamento INPS alla speranza di vita 2027/2028.
- Il **Monte Carlo** ora tassa il capital gain (coerente col motore deterministico) e applica il
  bollo per-asset (BFP esenti) su entrambi i motori.
- **#37 — stop dei contributi INPS all'età FIRE** (calcolatore, simulatore avanzato e pagina
  `/pensione`): nel gap il montante si rivaluta senza nuovi versamenti.
- Claim della guida sulla «compensazione minusvalenze» allineato alla realtà normativa.

### Corretto

- **#33-bis / props_invalid_value su profili legacy**: campi nuovi (`stopContributionsAtFire`,
  allocazione/obiettivo eredità) `undefined` mandavano in errore il primo render della sezione
  Profilo. Normalizzati in `loadProfileIntoState`, stato iniziale e default.

### Qualità

- +33 test (149 totali) su previdenza, fiscalità, migrazioni DB (`fake-indexeddb`) e coerenza
  Monte Carlo. Guida aggiornata per ogni feature.

---

## Coppia, famiglia ed eredità — 2026-06-25 → 2026-06-26

Giro guidato dal feedback: patrimonio del coniuge, gestione delle eredità e strategia di
consumo del capitale.

### Aggiunto

- **#29 — investimenti e patrimonio propri del coniuge** nel tab _Profilo → Coniuge_: il
  capitale del partner si somma al patrimonio del nucleo nel calcolo FIRE (number, gap, anni).
- **#30 — evento «Eredità» dedicato** con imposta di successione per grado di parentela
  (coniuge/figli franchigia 1M€ al 4%, fratelli 100k€ al 6%, altri parenti 6%, estranei 8%) e
  distinzione tra eredità liquida (reinvestita) e immobile ereditato (illiquido).
- **#31 — strategia di prelievo «Die-with-X» (ammortamento)**: si imposta il valore da lasciare
  agli eredi (anche 0, «die with zero») e il motore ammortizza il capitale fino all'aspettativa
  di vita, ricalcolando ogni anno sul portafoglio corrente.

### Corretto

- **#32 — sidebar scrollabile** a viewport bassi (le ultime voci non finiscono più sotto lo
  schermo).
- **#33 — crash della sezione Coniuge su profili pre-update**: i profili salvati prima di #29 non
  avevano il nuovo campo; al caricamento il valore mancante viene ora impostato a 0 (nessun
  crash, dati intatti).

---

## Fondazione qualità, assistente AI e correttezza fiscale 2026 — 2026-06-24

Ondata su tre fronti: basi di affidabilità (test/CI), assistente AI locale e verifica
puntuale dei numeri fiscali.

### Aggiunto

- **Fondazione qualità**: suite di test **Vitest**, **PRNG seedabile** (Monte Carlo
  riproducibile), **golden test** sul motore e **CI** GitHub Actions (`check` + `test` +
  `build` su ogni push/PR).
- **Assistente AI locale e opt-in** (off di default): AI del browser (Chrome/Edge, Gemini Nano)
  oppure **Ollama** in locale, con scelta del modello da menu e auto-selezione del migliore.
  Chat «grounded» sui numeri dell'utente e sui contenuti della guida, con input/output vocale
  (Web Speech). Nessun dato lascia il dispositivo. Route `/assistente`.
- **Pagina «Metodologia e Fonti»** (`/metodologia`): tabella di ogni aliquota/soglia/coefficiente
  usato dal motore con la relativa fonte normativa (anti-black-box, letta a runtime da
  `assumptions.ts`).
- **Varianti FIRE calcolate** (Lean / Standard / Barista / Chubby / Fat) nel calcolatore, con
  soglie modificabili.
- **Error boundary** su tutte le route (`svelte:boundary`): un errore in una sezione non manda
  più in crash l'intera app.
- **Ricerca fuzzy della guida** (Fuse.js): tollera refusi e accenti.
- **SEO**: meta OG/Twitter, title per-pagina, sitemap e robots.

### Modificato

- **IRPEF 2026** confermata a 23% / 33% / 43% (la Legge di Bilancio 2026 riduce la 2ª aliquota
  dal 35% al 33%).
- **Coefficienti di trasformazione INPS 2025-2026** aggiornati al DM 20/11/2024 (es. 5,608% a
  67 anni) e centralizzati in un unico punto condiviso dai due percorsi pensione.
- **Massimale contributivo 2026** a 122.295 € e **addizionale 1%** (L.438/1992) applicata sulla
  fascia oltre la prima fascia (56.224 €), non oltre il massimale.
- **Monte Carlo più onesto**: il tasso di successo mostra l'incertezza statistica (es.
  «88% ± 1pp»).

### Corretto

- **Detrazioni da lavoro dipendente + no-tax area + cuneo 2026**: prima il netto in busta
  ignorava le detrazioni e sovrastimava l'IRPEF; ora il netto stimato è realistico.
- **Compensazione minusvalenze** bloccata correttamente sulle plusvalenze da ETF/fondi
  armonizzati (reddito di capitale, non compensabile); success rate con distribuzione binomiale.
- La strategia di prelievo di default ora risulta effettivamente spuntata.
- Persistenza dell'assistente AI e rendering markdown delle risposte (niente asterischi letti a
  voce, textarea a tutta larghezza).

---

## Realismo del motore e QA — 2026-06-07 → 2026-06-21

### Aggiunto

- **Calcolatore FIRE personalizzabile**: possibilità di escludere pensione/altri redditi e di
  derivare il rendimento atteso dall'allocazione.
- Il **Monte Carlo considera la pensione INPS e gli altri redditi**, allineato al calcolatore
  deterministico.
- Licenza **MIT**, `CLAUDE.md` e sezione «Contributi» nel README.

### Modificato / Corretto

- **Simulazione Monte Carlo e calcolatore FIRE più realistici** (commit `fa86c13`, invarianti da
  non rompere): prelievo calcolato sulle spese reali; floor dei rendimenti > −100%; fondo
  pensione conteggiato tra i liquidi (RITA, intenzionale); bande di percentile nei grafici.
- Correzioni QA segnalate: IRPEF 2026, validazioni input, dark mode, leggibilità grafici e
  responsività mobile (#1), profilo nel MC (#5), blur (#7), ticker (#8), tab mobile (#13),
  chiave del tema (#18), item minori (#21).

---

## Trasparenza delle ipotesi, coppia e fiscalità patrimoniale — 2026-05-05

Ondata «trasparenza»: rendere ispezionabile ogni ipotesi fiscale, introdurre la
pianificazione di coppia e chiudere i buchi della copertura fiscale patrimoniale.

### Aggiunto

- **Pannello «Ipotesi attive»** (assumptions panel) sopra al calcolatore: mostra tutte le
  aliquote/parametri applicati, con preset selezionabili (Normativa 2026, Pre-riforma 2023,
  Ipotesi flat 23/33) e modalità **custom**.
- **Pianificazione di coppia** (tab _Profilo → Coniuge_): due IRPEF separate, due INPS,
  eventuali due fondi pensione; le spese restano di nucleo, il netto del coniuge riduce il
  prelievo necessario.
- **Bollo titoli e IVAFE** (0,2% annuo) applicati ogni anno della proiezione, con campo «quota su
  broker estero» per ripartire correttamente le due imposte.
- **Sensitivity analysis (tornado chart)** nella tab Simulazione: shock ±10% su ogni leva chiave,
  barre ordinate per impatto sul portafoglio finale.
- **Cedolare secca vs IRPEF** sugli affitti (`compareRentalTax`) con risparmio annuo della scelta
  migliore.
- **Inversione lordo→netto in formula chiusa** (`invertNetSalary`, `invertIRPEF`): risultato
  esatto, non più iterativo al ±2%.
- **Glide path equity → bond** (anche «rising» post-pensione) cablato nel proiettore
  deterministico e nel ribilanciamento Monte Carlo.
- **Ammortamento francese esatto** del mutuo (`frenchAmortizationSchedule`,
  `mortgageAnnualInterest`) per il capitale residuo e la detrazione interessi.
- **Serie storiche italiane di default** per il Monte Carlo (MSCI World ex-USA, BTP 7-10y
  stimati, inflazione ISTAT), con switch verso il preset US classico.

---

## Planner familiare, contenitori fiscali e strumenti avanzati — 2026-04-22

### Aggiunto

- **Planner familiare** e **cash flow dettagliato** anno per anno.
- **Pagina Pensione INPS** dedicata e **stress test combinabili**.
- **Confronto contenitori fiscali**, **confronto profili**, **eventi di vita** (bonus e spese una
  tantum), **preset** e regole **TFR** (`tfr-rules.ts`).
- **Separazione patrimonio liquido/illiquido** e rendite passive perpetue.
- Tasso di rivalutazione della rendita vitalizia configurabile.

### Modificato / Corretto

- Calcolatore FIRE riorganizzato in 4 tab (Panoramica, Simulazione, Cash flow, Prelievi).
- Surplus post-FIRE (bonus, altri redditi) ora reinvestito nel portafoglio.
- Fondo pensione: tassazione solo sui contributi e rendita vitalizia rivalutata.
- L'inflazione impatta realmente FIRE Number, anni al FIRE e proiezione del portafoglio.
- FIRE Number tiene conto del bridge prima della pensione INPS; savings rate coerente;
  posticipare il pensionamento non riduce più la pensione stimata.

---

## Nascita del progetto e roadmap completa — 2026-04-15 → 2026-04-16

Prima release pubblica di FIRE Planner e completamento della roadmap iniziale.

### Aggiunto

- **Applicazione completa** per la pianificazione FIRE nel contesto italiano: dashboard,
  profilo multi-sezione, calcolatore FIRE, simulazione Monte Carlo, scenari di rischio, gestione
  scenari, dati storici, guida interattiva, impostazioni.
- **Calcolatore FIRE**: FIRE Number, Coast FIRE, anni al FIRE, tasso di risparmio; 4 strategie di
  prelievo (4%, VPW, Guyton-Klinger, CAPE-based); ottimizzatore fiscale dell'ordine di prelievo.
- **Monte Carlo** fino a 100.000 iterazioni in Web Worker; modalità parametrica, bootstrap
  storico e block bootstrap; **multi-asset** con matrice di correlazione NxN (Cholesky); fan
  chart P5-P95.
- **Fiscalità italiana**: IRPEF, capital gain 26% / 12,5% titoli di stato, fondo pensione (con
  extradeducibilità 2.650 € per i nuovi lavoratori post-2007), TFR, pensione INPS contributiva.
- **Pensione INPS**: simulatore avanzato (montante, coefficienti di trasformazione, RITA, gap
  pensionistico, riscatto laurea) e **parser XML dell'estratto conto INPS** ufficiale.
- **Sezione Fondo Pensione 2026** con 5 strategie di erogazione.
- **Performance portafoglio (TWR)** con metodo Modified Dietz e confronto vs benchmark.
- **Modalità «What If»** interattiva con slider su tutti i parametri.
- **Import** da broker italiani (Directa, Fineco, DEGIRO, CSV) e movimenti bancari; **export**
  JSON/CSV, **report PDF**, backup completo.
- **PWA** installabile e offline, **i18n** (it/en), multi-valuta, **community benchmark**
  (condivisione anonima via URL, no backend), confronto FIRE internazionale.
- **10 dataset storici embedded** (S&P 500 dal 1928, CAPE Shiller, inflazione USA/Italia, MSCI
  World, oro, obbligazioni USA...).
