# FIRE Planner

Applicazione web completa per la pianificazione **F.I.R.E.** (Financial Independence, Retire Early), pensata specificamente per il contesto fiscale e previdenziale italiano.

Tutti i calcoli avvengono nel browser. I dati finanziari restano sul dispositivo dell'utente (IndexedDB) e non vengono mai inviati a server esterni. **Privacy by design.**

## Funzionalita'

### Profilo Finanziario
- Gestione multi-profilo con form a 6 sezioni (dati personali, reddito, spese, patrimonio, debiti, pensione)
- 9 classi di asset (azioni, obbligazioni, liquidita', immobili, oro, crypto, fondo pensione, TFR, altro)
- Salvataggio automatico in IndexedDB

### Calcolatore FIRE
- Calcolo FIRE Number, Coast FIRE, anni al FIRE, tasso di risparmio
- 4 strategie di prelievo: Regola del 4%, VPW, Guyton-Klinger Guardrails, CAPE-Based
- Proiezione anno per anno con grafico interattivo
- Ottimizzazione fiscale dell'ordine di prelievo

### Simulazione Monte Carlo
- Fino a 100.000 iterazioni via Web Worker (UI non si blocca)
- 3 modalita': parametrica (log-normale), bootstrap storico, block bootstrap
- Fan chart con bande di confidenza (P5-P95)
- Istogramma distribuzione, tasso di successo, scenari peggiore/mediano/migliore
- Salvataggio e confronto risultati

### Scenari di Rischio
- 8 scenari predefiniti: crash di mercato, inflazione elevata, crisi sanitaria, shock geopolitico, sequenza rendimenti negativi, perdita lavoro, divorzio, longevita' estrema
- Scenari personalizzati
- Stress test con confronto before/after su grafici sovrapposti

### Gestione Scenari
- Salvataggio, duplicazione e confronto side-by-side fino a 4 scenari
- Override parametri per scenario (spese, allocazione, rendimento atteso)

### Dati Storici
- 10 dataset integrati (S&P 500 dal 1928, obbligazioni USA, oro, inflazione USA/Italia, MSCI World, CAPE Shiller)
- Grafici rendimenti annuali, rendimenti rolling (1/5/10/20 anni)
- Heatmap matrice di correlazione tra asset
- Istogramma distribuzione rendimenti

### Fiscalita' Italiana
- IRPEF 2026 (23% / 33% / 43%)
- Capital gains: 26% azioni/ETF, 12.5% titoli di stato
- Fondi pensione: deducibilita' 5.300 EUR, rendimenti al 20%, prestazioni 9-15%
- Calcolo TFR con rivalutazione
- Pensione INPS contributiva con coefficienti di trasformazione
- Gap pensionistico (da FIRE a eta' pensionabile)

### Guida Interattiva
- 20 capitoli dalla A alla Z del FIRE, con focus su fiscalita' e previdenza italiana
- Esempi pratici con numeri reali (stipendi italiani, aliquote, ETF)
- Tracciamento progresso con segnalibri
- Ricerca e filtro per categoria

### Import/Export
- Export profili e scenari in JSON
- Export risultati in CSV
- Backup completo e ripristino
- Cancellazione selettiva dati

## Tech Stack

| Tecnologia | Versione | Ruolo |
|---|---|---|
| [SvelteKit](https://svelte.dev/docs/kit) | 2.57 | Framework |
| [Svelte 5](https://svelte.dev) | 5.55 | UI (runes mode) |
| [Tailwind CSS](https://tailwindcss.com) | 4.2 | Styling |
| [Flowbite-Svelte](https://flowbite-svelte.com) | 1.33 | Componenti UI |
| [Apache ECharts](https://echarts.apache.org) | 6.0 | Grafici |
| [Dexie.js](https://dexie.org) | 4.4 | Database locale (IndexedDB) |
| [jStat](https://jstat.github.io) | 1.9 | Distribuzioni statistiche |
| [PapaParse](https://www.papaparse.com) | 5.5 | Parsing CSV |

## Avvio rapido

```bash
# Clona il repository
git clone https://github.com/nemorfol/fire20.git
cd fire20

# Installa dipendenze
npm install

# Avvia in sviluppo
npm run dev

# Build per produzione
npm run build

# Preview build locale
npm run preview
```

## Deploy su Vercel

Il progetto usa `@sveltejs/adapter-static` ed e' pronto per il deploy statico:

1. Importa il repository su [Vercel](https://vercel.com)
2. Il framework viene rilevato automaticamente (SvelteKit)
3. La build produce file statici in `build/`

In alternativa, i file in `build/` possono essere serviti da qualsiasi hosting statico (Netlify, GitHub Pages, Cloudflare Pages, ecc.).

## Struttura del progetto

```
src/
├── routes/              # 10 pagine SvelteKit
│   ├── +page.svelte     # Dashboard
│   ├── profilo/         # Profilo finanziario
│   ├── calcolatore/     # Calcolatore FIRE
│   ├── simulazione/     # Monte Carlo
│   ├── scenari/         # Scenari salvati
│   ├── rischi/          # Stress test
│   ├── dati-storici/    # Esplorazione dati
│   ├── guida/           # Guida interattiva (20 step)
│   └── impostazioni/    # Import/export
├── lib/
│   ├── components/      # 44 componenti Svelte
│   ├── engine/          # Motore di calcolo (FIRE, Monte Carlo, tasse, pensione)
│   ├── data/            # Dati storici embedded (1928-2024)
│   ├── db/              # Schema e CRUD IndexedDB
│   ├── workers/         # Web Worker per simulazioni
│   ├── guida/           # Contenuti guida (20 capitoli)
│   └── utils/           # Formattazione, import/export
```

## Fonti dati

- **S&P 500**: [Damodaran, NYU Stern](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html)
- **CAPE Ratio**: [Robert Shiller, Yale](http://www.econ.yale.edu/~shiller/data.htm)
- **Inflazione USA**: [Bureau of Labor Statistics](https://www.bls.gov/cpi/)
- **Inflazione Italia**: [ISTAT](https://www.istat.it) / [World Bank](https://data.worldbank.org)
- **Correlazioni**: Morningstar / Vanguard

## Screenshot

> Avvia l'app con `npm run dev` per esplorare tutte le funzionalita'.

## Licenza

MIT

---

*Disclaimer: Questa applicazione e' uno strumento educativo e di simulazione. Non costituisce consulenza finanziaria. Consulta un professionista qualificato prima di prendere decisioni di investimento.*
