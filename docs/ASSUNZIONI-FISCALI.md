# Registro delle assunzioni fiscali

> **Premessa — la fonte di verità è il codice.**
> Questo documento è un **indice navigabile** delle aliquote, soglie e coefficienti usati dal
> motore. I valori sono estratti dal preset `DEFAULT_2026` in
> [`src/lib/engine/assumptions.ts`](../src/lib/engine/assumptions.ts) e dalla pagina
> [`/metodologia`](../src/routes/metodologia/+page.svelte) che li legge a runtime.
> **In caso di divergenza fa fede il codice**, non questo file. Ogni modifica ai valori va
> fatta in `assumptions.ts`, con la fonte normativa citata nel commento, e verrà poi riflessa
> qui a mano.
>
> Le fonti riportate nella colonna «Fonte» sono copiate dai commenti già presenti nel codice e
> nella pagina metodologia; nessun valore è stato inventato.

Anno fiscale di riferimento del preset: **2026** (`DEFAULT_2026.year`).

---

## Redditi da lavoro e IRPEF

| Parametro                                                  | Valore 2026                                                 | Fonte normativa                                                                                    | Costante / file                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| IRPEF — 1° scaglione                                       | 23% da 0 a 28.000 €                                         | Riforma IRPEF 2024, confermata 2026                                                                | `DEFAULT_2026.irpefBrackets[0]` — `assumptions.ts`                                        |
| IRPEF — 2° scaglione                                       | **33%** da 28.000 a 50.000 €                                | Legge di Bilancio 2026 (riduzione della 2ª aliquota dal 35% al 33% — **valore corretto, non 35%**) | `DEFAULT_2026.irpefBrackets[1]` — `assumptions.ts`                                        |
| IRPEF — 3° scaglione                                       | 43% oltre 50.000 €                                          | Riforma IRPEF 2024, confermata 2026                                                                | `DEFAULT_2026.irpefBrackets[2]` — `assumptions.ts`                                        |
| Detrazioni da lavoro dipendente + no-tax area + cuneo 2026 | art. 13 TUIR (1.955 € fino a 15k, decrescente) + cuneo 2026 | Art. 13 co. 1 TUIR; riduzione del cuneo fiscale resa strutturale (Legge di Bilancio 2025/2026)     | calcolate in `tax-italy.ts` (non costante di `assumptions.ts`); esposte in `/metodologia` |
| Addizionale IRPEF regionale (media)                        | 1,73%                                                       | Media nazionale indicativa (varia per regione; selettore regione dedicato dal 2026-07)             | `DEFAULT_2026.surtaxes.regional` — `assumptions.ts`                                       |
| Addizionale IRPEF comunale (media)                         | 0,7%                                                        | Media nazionale indicativa (varia per comune)                                                      | `DEFAULT_2026.surtaxes.municipal` — `assumptions.ts`                                      |

---

## Redditi finanziari e imposte patrimoniali

| Parametro                                                           | Valore 2026                                                                                                         | Fonte normativa                                                                   | Costante / file                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Capital gain azioni / ETF / fondi / corporate bond                  | 26%                                                                                                                 | TUIR                                                                              | `DEFAULT_2026.capital.stocksAndEtf` — `assumptions.ts`         |
| Capital gain e cedole su titoli di Stato ed equiparati (white list) | 12,5%                                                                                                               | TUIR; aliquota agevolata su titoli di Stato ed equiparati (white list)            | `DEFAULT_2026.capital.governmentBonds` — `assumptions.ts`      |
| Plusvalenze su cripto-attività                                      | 33% dal 1/1/2026 (e-money/stablecoin in euro restano al 26%, qui non distinte; franchigia 2.000 € abolita dal 2025) | Legge di Bilancio 2025 art. 1 c. 25; conferma Manovra 2026                        | `DEFAULT_2026.capital.cryptoGains` — `assumptions.ts`          |
| Cedolare secca affitti (canone libero)                              | 21%                                                                                                                 | Regime sostitutivo canone libero (il 10% del canone concordato non è gestito qui) | `DEFAULT_2026.capital.cedolareSecca` — `assumptions.ts`        |
| Bollo titoli annuo (deposito titoli)                                | 0,2% sul controvalore                                                                                               | Imposta di bollo su prodotti finanziari                                           | `DEFAULT_2026.capital.stampDuty` — `assumptions.ts`            |
| IVAFE (attività finanziarie all'estero)                             | 0,2% annuo                                                                                                          | IVAFE su attività finanziarie estere                                              | `DEFAULT_2026.capital.ivafe` — `assumptions.ts`                |
| Imposta di bollo conto corrente (forfait)                           | 34,20 € annui (solo se giacenza > 5.000 €)                                                                          | Imposta di bollo su conto corrente                                                | `DEFAULT_2026.capital.stampDutyCash` — `assumptions.ts`        |
| Anni di compensazione minusvalenze                                  | 4 (anno di realizzo + N)                                                                                            | Standard italiano                                                                 | `DEFAULT_2026.capitalLossCompensationYears` — `assumptions.ts` |

---

## Contributi INPS

| Parametro                                        | Valore 2026                                                                          | Fonte normativa                                           | Costante / file                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| Aliquota IVS lavoratore dipendente               | 9,19% fino alla prima fascia                                                         | L. 335/1995 (massimale post-1995)                         | `DEFAULT_2026.inps.employeeBase` — `assumptions.ts`       |
| Addizionale 1%                                   | +1,00% sulla fascia eccedente la prima fascia (9,19% + 1,00% = 10,19%)               | Art. 3-ter L. 438/1992                                    | `DEFAULT_2026.inps.employeeAdditional` — `assumptions.ts` |
| Prima fascia di retribuzione                     | 56.224 € (oltre scatta l'1% aggiuntivo)                                              | L. 438/1992                                               | `DEFAULT_2026.inps.primaFascia` — `assumptions.ts`        |
| Massimale contributivo annuo                     | 122.295 € (oltre: nessun versamento IVS, iscritti post-1995; era 120.607 € nel 2025) | INPS, circolare n. 6 del 30/01/2026 (rivalutazione ISTAT) | `DEFAULT_2026.inps.massimale` — `assumptions.ts`          |
| Aliquota parasubordinato (quota collaboratore)   | 11,24%                                                                               | Gestione separata INPS                                    | `DEFAULT_2026.inps.parasubordinato` — `assumptions.ts`    |
| Aliquota autonomo (gestione separata, referenza) | 26,23%                                                                               | Gestione separata INPS                                    | `DEFAULT_2026.inps.autonomo` — `assumptions.ts`           |

### Coefficienti di trasformazione (montante → pensione annua)

Fonte unica per tutto il motore (`pension-italy.ts` e `inps-simulator.ts` li importano da qui):
`TRANSFORMATION_COEFFICIENTS_2025_2026` in `assumptions.ts`.

- **Biennio 2025-2026**: Decreto Direttoriale Ministero del Lavoro/MEF del **20 novembre 2024**,
  in vigore per le decorrenze 1/1/2025 – 31/12/2026.
- Mappa età intera → coefficiente, dai 57 ai 71 anni. Interpolazione lineare tra le età intere
  (`getTransformationCoefficient`); sotto i 57 usa il valore a 57, sopra i 71 quello a 71.

| Età | Coefficiente |     | Età | Coefficiente |
| --- | ------------ | --- | --- | ------------ |
| 57  | 4,204%       |     | 65  | 5,250%       |
| 58  | 4,308%       |     | 66  | 5,423%       |
| 59  | 4,419%       |     | 67  | **5,608%**   |
| 60  | 4,536%       |     | 68  | 5,808%       |
| 61  | 4,661%       |     | 69  | 6,024%       |
| 62  | 4,795%       |     | 70  | 6,258%       |
| 63  | 4,936%       |     | 71  | 6,510%       |
| 64  | 5,088%       |     |     |              |

Verifica col reciproco (divisore di speranza di vita): 1/17,831 = 5,608% a 67 anni;
1/15,360 = 6,510% a 71 anni.

---

## Fondo pensione complementare

| Parametro                                    | Valore 2026                   | Fonte normativa                                             | Costante / file                                                          |
| -------------------------------------------- | ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Deduzione massima annua sui contributi       | 5.300 €                       | D.Lgs. 252/2005; deduzione 5.300 € (Legge di Bilancio 2026) | `DEFAULT_2026.pensionFund.maxDeduction` — `assumptions.ts`               |
| Deduzione extra «nuovi lavoratori post-2007» | 2.650 € (aggiuntivi)          | D.Lgs. 252/2005 (extradeducibilità post-2007)               | `DEFAULT_2026.pensionFund.extraDeduction` — `assumptions.ts`             |
| Tassazione dei rendimenti annui              | 20%                           | D.Lgs. 252/2005                                             | `DEFAULT_2026.pensionFund.returnTaxRate` — `assumptions.ts`              |
| Aliquota base sulla prestazione finale       | 15%                           | D.Lgs. 252/2005                                             | `DEFAULT_2026.pensionFund.benefitTaxBase` — `assumptions.ts`             |
| Riduzione annua dopo il 15° anno             | −0,3% l'anno (fino al minimo) | D.Lgs. 252/2005                                             | `DEFAULT_2026.pensionFund.benefitTaxReductionPerYear` — `assumptions.ts` |
| Aliquota minima sulla prestazione            | 9%                            | D.Lgs. 252/2005                                             | `DEFAULT_2026.pensionFund.benefitTaxFloor` — `assumptions.ts`            |

---

## TFR (Trattamento di Fine Rapporto)

| Parametro                            | Valore 2026         | Fonte normativa | Costante / file                                                 |
| ------------------------------------ | ------------------- | --------------- | --------------------------------------------------------------- |
| Coefficiente di accantonamento annuo | stipendio ÷ 13,5    | Art. 2120 c.c.  | `DEFAULT_2026.tfr.divisor` — `assumptions.ts`                   |
| Rivalutazione — componente fissa     | 1,5%                | Art. 2120 c.c.  | `DEFAULT_2026.tfr.revaluationFixed` — `assumptions.ts`          |
| Rivalutazione — quota inflazione     | 75% dell'inflazione | Art. 2120 c.c.  | `DEFAULT_2026.tfr.revaluationInflationQuota` — `assumptions.ts` |

---

## Preset alternativi disponibili in UI

Oltre a `DEFAULT_2026`, `assumptions.ts` espone (in `PRESET_ASSUMPTIONS`):

- **`PRE_RIFORMA_2023`** — IRPEF a 4 scaglioni (23% / 25% / 35% / 43%), deduzione fondo pensione
  5.164,57 €. Utile per riconciliare CUD storici.
- **`IPOTESI_FLAT_2027`** — scenario **speculativo** con IRPEF a 2 aliquote 23% / 33%. Non
  corrisponde ad alcuna norma vigente: solo stress test fiscale.

L'utente può inoltre creare un set **custom** (`customizeAssumptions`) partendo da un preset e
sovrascrivendo i singoli valori dai pannelli del calcolatore.
