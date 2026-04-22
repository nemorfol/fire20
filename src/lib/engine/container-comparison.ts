/**
 * Confronto tra i principali "contenitori fiscali" italiani per uno stesso
 * contributo mensile: ETF/azioni, Fondo Pensione, TFR, BTP.
 *
 * L'obiettivo e' fornire al risparmiatore italiano una stima rapida del netto
 * finale a parita' di contributo, considerando:
 * - la tassazione dei rendimenti (durante l'accumulo o all'uscita)
 * - il beneficio fiscale della deduzione (solo Fondo Pensione)
 * - la rivalutazione legata all'inflazione (solo TFR)
 * - la tassazione separata all'uscita (TFR) o agevolata (FP)
 *
 * I calcoli riutilizzano le funzioni di src/lib/engine/tax-italy.ts per
 * coerenza con il resto dell'app.
 */

import {
	calculateCapitalGainsTax,
	calculatePensionFundTax
} from './tax-italy';

/** Parametri di input per il confronto tra contenitori fiscali */
export interface ContainerInput {
	/** Contributo mensile in euro */
	monthlyContribution: number;
	/** Anni di accumulo */
	years: number;
	/** Rendimento atteso annuo lordo (es. 0.05 = 5%) */
	expectedReturn: number;
	/** Aliquota IRPEF marginale (es. 0.35 = 35%). Usata per deduzione FP e TFR */
	marginalIRPEF: number;
	/** Inflazione annua attesa (es. 0.02 = 2%). Usata per rivalutazione TFR */
	annualInflation: number;
	/** Eta' al momento del pensionamento (per contesto, non modifica il calcolo) */
	retirementAge: number;
}

/** Identificatore del contenitore fiscale */
export type ContainerId = 'etf' | 'pensionFund' | 'tfr' | 'btp';

/** Risultato per un singolo contenitore */
export interface ContainerResult {
	/** Identificatore del contenitore */
	id: ContainerId;
	/** Etichetta leggibile in italiano */
	label: string;
	/** Totale dei contributi versati (nominali) */
	contributionsTotal: number;
	/** Rendimenti lordi accumulati (prima delle tasse) */
	grossReturns: number;
	/** Tasse pagate durante l'accumulo (solo FP con tassazione annua rendimenti) */
	taxesDuringAccumulation: number;
	/** Tasse pagate all'uscita (capital gain, prestazione FP, tassazione separata TFR) */
	taxesOnExit: number;
	/** Beneficio fiscale cumulato da deduzione IRPEF (solo FP) */
	taxBenefitDeduction: number;
	/** Valore netto a fine periodo */
	netFinal: number;
	/** Nota esplicativa sulle ipotesi */
	notes: string;
}

/**
 * Calcola il Future Value di un'annualita' posticipata.
 * Gestisce il caso degenere r=0 (formula limite).
 */
function futureValueOfAnnuity(annualPayment: number, rate: number, years: number): number {
	if (years <= 0) return 0;
	if (Math.abs(rate) < 1e-9) {
		return annualPayment * years;
	}
	return annualPayment * (Math.pow(1 + rate, years) - 1) / rate;
}

/** Arrotonda a 2 decimali */
function r2(n: number): number {
	return Math.round(n * 100) / 100;
}

/**
 * Contenitore ETF / Azioni: tassazione 26% sul capital gain all'uscita.
 * Approccio: PAC con rendimento lordo durante l'accumulo, tasse pagate solo
 * alla liquidazione sul guadagno totale (scenario FIRE lungo termine).
 */
function buildEtfResult(input: ContainerInput): ContainerResult {
	const annualContrib = input.monthlyContribution * 12;
	const contributionsTotal = annualContrib * input.years;
	const fvGross = futureValueOfAnnuity(annualContrib, input.expectedReturn, input.years);
	const grossReturns = Math.max(0, fvGross - contributionsTotal);
	const taxesOnExit = calculateCapitalGainsTax(grossReturns, 'etf');
	const netFinal = fvGross - taxesOnExit;

	return {
		id: 'etf',
		label: 'ETF / Azioni',
		contributionsTotal: r2(contributionsTotal),
		grossReturns: r2(grossReturns),
		taxesDuringAccumulation: 0,
		taxesOnExit: r2(taxesOnExit),
		taxBenefitDeduction: 0,
		netFinal: r2(netFinal),
		notes: 'PAC in ETF con tassazione 26% sul capital gain solo alla vendita finale. Nessun beneficio fiscale in ingresso.'
	};
}

/**
 * Contenitore BTP (e titoli di stato equiparati): aliquota agevolata 12,5%.
 * Stesso schema dell'ETF ma con aliquota ridotta.
 */
function buildBtpResult(input: ContainerInput): ContainerResult {
	const annualContrib = input.monthlyContribution * 12;
	const contributionsTotal = annualContrib * input.years;
	const fvGross = futureValueOfAnnuity(annualContrib, input.expectedReturn, input.years);
	const grossReturns = Math.max(0, fvGross - contributionsTotal);
	const taxesOnExit = calculateCapitalGainsTax(grossReturns, 'government_bonds');
	const netFinal = fvGross - taxesOnExit;

	return {
		id: 'btp',
		label: 'BTP / Titoli di Stato',
		contributionsTotal: r2(contributionsTotal),
		grossReturns: r2(grossReturns),
		taxesDuringAccumulation: 0,
		taxesOnExit: r2(taxesOnExit),
		taxBenefitDeduction: 0,
		netFinal: r2(netFinal),
		notes: 'Accumulo in titoli di Stato con aliquota agevolata 12,5% su cedole e capital gain. Rendimento atteso tipicamente inferiore a ETF azionari.'
	};
}

/**
 * Contenitore Fondo Pensione:
 * - Deduzione IRPEF sui contributi fino a 5.300€/anno (beneficio = quota * aliquota marginale)
 * - Rendimenti tassati annualmente al 20% (semplificazione: ignoriamo la quota BTP 12,5%)
 * - Prestazione finale tassata 15% → 9% in base agli anni di partecipazione
 * - La tassazione della prestazione si applica solo alla quota "contributi" del montante
 *   (i rendimenti sono gia' stati tassati annualmente durante l'accumulo)
 */
function buildPensionFundResult(input: ContainerInput): ContainerResult {
	const annualContrib = input.monthlyContribution * 12;
	const contributionsTotal = annualContrib * input.years;

	// Beneficio da deduzione IRPEF, limitato a 5.300€/anno
	const deductibleAnnual = Math.min(annualContrib, 5300);
	const annualBenefit = deductibleAnnual * input.marginalIRPEF;
	const taxBenefitDeduction = annualBenefit * input.years;

	// Montante accumulato con rendimento netto (rendimenti tassati 20% annuo)
	const pensionTax = calculatePensionFundTax(annualContrib, input.years);
	const returnTaxRate = pensionTax.returnTax; // 0.20
	const rNet = input.expectedReturn * (1 - returnTaxRate);
	const fvNet = futureValueOfAnnuity(annualContrib, rNet, input.years);

	// Calcolo del montante lordo "teorico" (senza tassazione annua) per stimare
	// quanto sarebbe stato il gross cumulato (informativo).
	const fvGrossEquivalent = futureValueOfAnnuity(annualContrib, input.expectedReturn, input.years);
	const grossReturns = Math.max(0, fvGrossEquivalent - contributionsTotal);
	const taxesDuringAccumulation = Math.max(0, fvGrossEquivalent - fvNet);

	// Tassazione alla prestazione: SOLO sulla quota contributi nel montante netto,
	// perche' i rendimenti sono gia' stati tassati.
	// taxableFraction = contributionsTotal / fvNet (limitata a 1)
	const taxableFraction = fvNet > 0 ? Math.min(1, contributionsTotal / fvNet) : 0;
	const taxesOnExit = fvNet * taxableFraction * pensionTax.benefitTax;
	const netFinal = fvNet - taxesOnExit;

	const benefitTaxPct = (pensionTax.benefitTax * 100).toFixed(1).replace('.', ',');
	const benefitEur = Math.round(taxBenefitDeduction).toLocaleString('it-IT');
	const notes = `Rendimenti tassati 20% annuo, prestazione ${benefitTaxPct}% sui soli contributi (${input.years} anni di partecipazione). Beneficio fiscale da deduzione: ${benefitEur}€ nel periodo (non incluso nel netto finale, arriva in busta paga anno per anno). Tetto deducibilita': 5.300€/anno.`;

	return {
		id: 'pensionFund',
		label: 'Fondo Pensione',
		contributionsTotal: r2(contributionsTotal),
		grossReturns: r2(grossReturns),
		taxesDuringAccumulation: r2(taxesDuringAccumulation),
		taxesOnExit: r2(taxesOnExit),
		taxBenefitDeduction: r2(taxBenefitDeduction),
		netFinal: r2(netFinal),
		notes
	};
}

/**
 * Contenitore TFR lasciato in azienda:
 * - Rivalutazione annua fissa: 1,5% + 75% dell'inflazione
 * - Tassazione separata alla liquidazione con aliquota media IRPEF degli ultimi 5 anni
 *   (approssimata con marginalIRPEF * 0.85)
 *
 * NOTA: il "contributo mensile" rappresenta qui l'accantonamento TFR nominale,
 * non uno stipendio. Non usiamo calculateTFR(stipendio,...) perche' vogliamo
 * confrontare a parita' di euro versati.
 */
function buildTfrResult(input: ContainerInput): ContainerResult {
	const annualContrib = input.monthlyContribution * 12;
	const contributionsTotal = annualContrib * input.years;

	// Tasso di rivalutazione TFR: 1,5% + 75% inflazione
	const revalRate = 0.015 + 0.75 * input.annualInflation;
	const fvGross = futureValueOfAnnuity(annualContrib, revalRate, input.years);
	const grossReturns = Math.max(0, fvGross - contributionsTotal);

	// Tassazione separata: approssimiamo con marginale * 0,85 (la media IRPEF
	// sugli ultimi 5 anni e' tipicamente piu' bassa della marginale corrente)
	const tfrTaxRate = Math.max(0.09, Math.min(0.43, input.marginalIRPEF * 0.85));
	const taxesOnExit = fvGross * tfrTaxRate;
	const netFinal = fvGross - taxesOnExit;

	const revalPct = (revalRate * 100).toFixed(2).replace('.', ',');
	const taxPct = (tfrTaxRate * 100).toFixed(1).replace('.', ',');
	const notes = `TFR in azienda con rivalutazione ${revalPct}% annuo (1,5% + 75% inflazione). Tassazione separata all'uscita stimata ${taxPct}% (media IRPEF ultimi 5 anni ≈ marginale × 0,85). Per chi sceglie di destinarlo al fondo pensione va confrontato con "Fondo Pensione".`;

	return {
		id: 'tfr',
		label: 'TFR in azienda',
		contributionsTotal: r2(contributionsTotal),
		grossReturns: r2(grossReturns),
		taxesDuringAccumulation: 0,
		taxesOnExit: r2(taxesOnExit),
		taxBenefitDeduction: 0,
		netFinal: r2(netFinal),
		notes
	};
}

/**
 * Confronta i 4 contenitori fiscali a parita' di contributo mensile.
 * Ritorna i risultati nell'ordine: etf, pensionFund, tfr, btp.
 */
export function compareContainers(input: ContainerInput): ContainerResult[] {
	return [
		buildEtfResult(input),
		buildPensionFundResult(input),
		buildTfrResult(input),
		buildBtpResult(input)
	];
}
