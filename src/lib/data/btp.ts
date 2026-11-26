/**
 * Rendimenti annuali totali dei titoli di Stato italiani a ~10 anni (1970-2025),
 * nominali in lire/euro.
 *
 * Composizione (dichiarata anche nella pagina /metodologia):
 * - 1970-2020: valori MISURATI dal Jorda-Schularick-Taylor Macrohistory Database
 *   (R6, variabile bond_tr, Italia), vedi ./jst-italia.ts (licenza CC BY-NC-SA 4.0).
 * - 2021: stima da yield BTP 10y e duration (~8), non misurata. Nessuna serie
 *   pubblica gratuita del 2021 trovata.
 * - 2022-2025: proxy ETF Amundi Italy BTP Government Bond 10Y (LU1598691217, indice
 *   a scadenza costante 10 anni), rendimenti annui da justETF (consultato il
 *   26/11/2026: 2022 -22,65%, 2023 +13,17%, 2024 +5,66%, 2025 +4,27%) con il TER
 *   (0,17%) aggiunto per riportarli al lordo dei costi, come gli altri indici.
 *
 * Questa serie sostituisce la precedente stima 1991-2024 (yield + duration), che
 * sottostimava molto gli anni '90: per esempio 1993 18,4% contro 40,2% misurato,
 * 1996 14,5% contro 31,5%.
 */

import type { AnnualReturn } from './utils';
import { jstItalyBondReturns } from './jst-italia';

/** Anni successivi alla fine della serie JST (2020): stima e proxy ETF */
export const btpReturnsAfterJst: AnnualReturn[] = [
	{ year: 2021, value: -3.4 }, // stima yield + duration (rialzo tassi ~0,5% -> ~1,2%)
	{ year: 2022, value: -22.5 }, // shock tassi BCE (ETF 10Y -22,65% + TER)
	{ year: 2023, value: 13.3 }, // ETF 10Y +13,17% + TER
	{ year: 2024, value: 5.8 }, // ETF 10Y +5,66% + TER
	{ year: 2025, value: 4.4 } // ETF 10Y +4,27% + TER
];

/** Ultimo anno della parte misurata (JST) */
export const BTP_MEASURED_UNTIL = 2020;

export const btpReturns: AnnualReturn[] = [...jstItalyBondReturns, ...btpReturnsAfterJst];
