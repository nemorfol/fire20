# Post per FinanzaOnline.com

---

## Titolo del thread:

**[OPEN SOURCE] FIRE Planner - App web gratuita per pianificare l'indipendenza finanziaria (con fiscalita' italiana)**

---

## Corpo del messaggio (copia da qui):

---

Ciao a tutti,

vi presento **FIRE Planner**, un'applicazione web gratuita e open source che ho sviluppato per pianificare il percorso verso l'indipendenza finanziaria (FIRE - Financial Independence, Retire Early), pensata **specificamente per il contesto italiano** (fiscalita', INPS, TFR, fondi pensione).

L'app e' completamente gratuita, non richiede registrazione, e **tutti i dati restano nel vostro browser** (IndexedDB). Nessun dato viene inviato a server esterni. Privacy totale.

**Repository GitHub:** https://github.com/nemorfol/fire20

---

### Cosa fa in sintesi

E' un simulatore/pianificatore FIRE completo che vi permette di:
- Calcolare il vostro **FIRE Number** e gli anni mancanti al FIRE
- Eseguire **simulazioni Monte Carlo** (fino a 100.000 iterazioni) con dati storici reali
- Testare **scenari di rischio** (crash di mercato, inflazione alta, problemi sanitari, ecc.)
- Ottimizzare la **fiscalita' italiana** del prelievo in fase di decumulo
- Confrontare **4 strategie di prelievo** diverse (4%, VPW, Guyton-Klinger, CAPE-based)
- Esplorare **dati storici** dal 1928 ad oggi con grafici interattivi

---

### Le 10 sezioni dell'app in dettaglio

---

**1. DASHBOARD**

Vista d'insieme con patrimonio netto, FIRE Number, progresso verso il FIRE (%), anni rimanenti, tasso di risparmio. Grafico proiezione del patrimonio e pie chart dell'asset allocation.

![Dashboard](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/01-dashboard.png)

---

**2. PROFILO FINANZIARIO**

Form completo a 6 schede per inserire la propria situazione:
- **Dati Personali**: anno di nascita, eta' pensionamento desiderato, aspettativa di vita
- **Reddito**: reddito netto annuo, crescita attesa, entrate extra
- **Spese**: spese annuali correnti, spese stimate in FIRE, inflazione personale
- **Patrimonio**: 9 classi di asset (azioni, obbligazioni, liquidita', immobili, oro, crypto, fondo pensione, TFR, altro) + contributi mensili per ciascuna
- **Debiti**: lista dinamica con importo, tasso, rata, durata residua
- **Pensione**: anni di contributi, stima pensione INPS, eta' pensionabile

Supporta **profili multipli** (es. "Scenario base", "Scenario aggressivo"). Salvataggio automatico.

![Profilo Finanziario](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/02-profilo.png)

---

**3. CALCOLATORE FIRE**

Il cuore dell'app:
- **FIRE Number** prominente con calcolo esplicito (Spese Annuali / SWR)
- **6 metriche chiave**: FIRE Number, Anni al FIRE, Coast FIRE, Tasso di Risparmio, Gap da colmare, Reddito mensile stimato in FIRE
- **4 strategie di prelievo** selezionabili con spiegazione:
  - **Regola del 4%** (classica, aggiustata per inflazione)
  - **VPW** - Variable Percentage Withdrawal (percentuale variabile per eta')
  - **Guyton-Klinger Guardrails** (taglia 10% se SWR sale troppo, aumenta 10% se scende)
  - **CAPE-Based** (adattiva alle valutazioni di mercato: portfolio * (2% + 0.5/CAPE))
- **Parametri regolabili** con slider: SWR (1-8%), rendimento atteso, inflazione, aliquota fiscale
- **Grafico proiezione** interattivo con fase di accumulazione e decumulo
- **Tabella anno per anno**: patrimonio, contributi, rendimenti, prelievi, tasse
- **Ottimizzatore fiscale**: ordine ottimale di prelievo (conto titoli 26% -> fondo pensione 9-15% -> BTP 12.5%)

![Calcolatore FIRE](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/03-calcolatore.png)

---

**4. SIMULAZIONE MONTE CARLO**

La funzionalita' piu' avanzata. Esegue migliaia di simulazioni con rendimenti casuali:
- **Fino a 100.000 iterazioni** eseguite in un Web Worker (l'interfaccia non si blocca)
- **3 modalita'**:
  - Parametrica (distribuzione log-normale)
  - Bootstrap storico (campiona rendimenti reali S&P 500 dal 1928)
  - Block Bootstrap (preserva l'autocorrelazione dei mercati)
- **Risultati**:
  - **Tasso di successo** (% simulazioni senza esaurimento portafoglio)
  - **Fan chart** con bande P5-P95 (dal pessimista all'ottimista)
  - **Istogramma** distribuzione dei valori finali
  - **Tabella percentili** per decennio
  - Dettaglio scenario peggiore / mediano / migliore
- Salvataggio risultati e confronto tra simulazioni diverse

![Simulazione Monte Carlo](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/04-simulazione.png)

---

**5. SCENARI SALVATI**

Gestione e confronto tra piani diversi:
- Creare scenari con parametri diversi (es. "SWR 3.5% + 80% azioni" vs "SWR 4% + 60% azioni")
- **Confronto side-by-side** fino a 4 scenari con grafici sovrapposti
- Duplica e modifica scenari esistenti

![Scenari Salvati](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/05-scenari.png)

---

**6. SCENARI DI RISCHIO (STRESS TEST)**

Testa la resilienza del tuo piano contro eventi avversi. **8 scenari predefiniti**:

| Scenario | Impatto |
|---|---|
| Crisi sanitaria grave | Spese +40%, durata 3 anni |
| Crash di mercato | Portafoglio -40% |
| Inflazione elevata persistente | +5% extra per 5 anni |
| Shock geopolitico | Portafoglio -25%, inflazione +3% |
| Sequenza rendimenti negativi | 5 anni peggiori all'inizio del FIRE |
| Perdita lavoro pre-FIRE | Reddito 0 per 12 mesi |
| Divorzio | Patrimonio -50% |
| Longevita' estrema | Vivere fino a 100 anni |

Puoi anche creare **scenari personalizzati** e confrontare l'impatto su grafico sovrapposto (before vs after).

![Scenari di Rischio](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/06-rischi.png)

---

**7. DATI STORICI**

Esplorazione interattiva di rendimenti storici con grafici:
- **S&P 500** Total Return (1928-2024, 97 anni di dati)
- **Obbligazioni USA** 10Y Treasury (1928-2024)
- **Oro** (1971-2024)
- **Inflazione USA** (1928-2024)
- **Inflazione Italia** (1960-2024, dati ISTAT)
- **Azioni internazionali** MSCI World ex-USA (1970-2024)
- **Shiller CAPE Ratio** (1881-2024)

Per ogni dataset: grafici a barre (verde/rosso), **rendimenti rolling** (1, 5, 10, 20 anni), **heatmap correlazioni** tra asset, istogramma distribuzione, statistiche (media, dev. standard, Sharpe).

![Dati Storici](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/07-dati-storici.png)

---

**8. GUIDA INTERATTIVA**

20 capitoli dalla A alla Z del FIRE, con **focus specifico sulla fiscalita' e previdenza italiana**:

**Fondamenti:** Cos'e' il FIRE, profilo finanziario, FIRE Number, tasso di risparmio

**Calcoli e Simulazioni:** Asset allocation, regola del 4%, strategie avanzate, Monte Carlo, rischio sequenza rendimenti, inflazione

**Fiscalita' Italiana:** Tassazione investimenti (26%/12.5%), fondi pensione e TFR (deducibilita' 5.300 EUR, tassazione agevolata 9-15%), pensione INPS (contributivo, coefficienti trasformazione), gap pensionistico, ottimizzazione fiscale del prelievo

**Strategie Avanzate:** Scenari di rischio, immobili nel piano FIRE (IMU, cedolare secca), debiti e mutuo, monitoraggio e ribilanciamento

**Preparazione Finale:** Checklist completa pre-FIRE

Ogni capitolo ha esempi pratici con numeri reali italiani, consigli, avvertenze, e link alla sezione dell'app correlata.

![Guida - Indice](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/08-guida.png)

![Guida - Capitolo](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/09-guida-step.png)

---

**9. IMPOSTAZIONI / IMPORT-EXPORT**

- Export profili e scenari in JSON
- Export risultati simulazioni in CSV (apribile in Excel)
- Backup completo e ripristino
- Cancellazione selettiva dati

![Impostazioni](https://raw.githubusercontent.com/nemorfol/fire20/main/screenshots/10-impostazioni.png)

---

### Fiscalita' italiana integrata

L'app modella in dettaglio il sistema fiscale italiano:

| Voce | Dettaglio |
|---|---|
| **IRPEF 2026** | 23% fino a 28.000, 33% da 28.001 a 50.000, 43% oltre |
| **Capital gains azioni/ETF** | 26% |
| **Capital gains BTP/titoli stato** | 12.5% |
| **Fondi pensione** | Deducibilita' 5.300 EUR/anno, rendimenti 20%, prestazioni 9-15% |
| **TFR** | Stipendio/13.5, rivalutazione 1.5% + 75% inflazione |
| **Pensione INPS** | Contributivo, coefficienti da 4.186% (57 anni) a 6.466% (71 anni) |
| **Ordine prelievo ottimale** | Conto titoli (26%) -> Fondo pensione (9-15%) -> BTP (12.5%) |

---

### Aspetti tecnici

Per chi e' interessato al lato tech:

**Stack tecnologico:**
- **SvelteKit 2.57 + Svelte 5** (runes mode) - Framework web moderno e velocissimo
- **Tailwind CSS 4.2 + Flowbite-Svelte** - UI responsive e componenti pronti
- **Apache ECharts 6.0** - Grafici finanziari interattivi (fan chart, heatmap, proiezioni)
- **Dexie.js 4.4** - Database locale IndexedDB (i dati restano nel browser)
- **jStat 1.9** - Distribuzioni statistiche per Monte Carlo
- **Web Workers** - Le simulazioni pesanti girano in un thread separato
- **PapaParse 5.5** - Import/export CSV

**Numeri:**
- 71 file sorgente (44 componenti Svelte + 27 moduli TypeScript)
- 14.709 righe di codice
- 10 dataset storici embedded (dal 1881 al 2024)
- Build statica pronta per Vercel/Netlify/GitHub Pages

**Architettura:**
- Tutto client-side, nessun server backend
- I dati finanziari dell'utente non lasciano mai il browser
- Compilato in file statici HTML/JS/CSS
- Open source, licenza MIT

**Repository:** https://github.com/nemorfol/fire20

---

### Come provarlo

```
git clone https://github.com/nemorfol/fire20.git
cd fire20
npm install
npm run dev
```

Aprite http://localhost:5173 nel browser. Requisiti: Node.js 18+.

---

### Roadmap / idee future

- Deploy pubblico su Vercel (link diretto senza installazione)
- PWA installabile su smartphone
- Calcolo pensione INPS automatico da estratto conto
- Integrazione API quotazioni in tempo reale
- Export report PDF
- Localizzazione multilingua

---

### Disclaimer

Questa applicazione e' uno strumento educativo e di simulazione. **Non costituisce consulenza finanziaria.** I dati storici non garantiscono rendimenti futuri. Consultate un professionista qualificato prima di prendere decisioni di investimento.

---

Feedback, suggerimenti, segnalazioni bug e contributi sono benvenuti! Aprite una issue su GitHub o rispondete qui nel thread.

Spero possa essere utile a chi sta pianificando il proprio percorso FIRE in Italia!
