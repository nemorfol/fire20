/**
 * Sistema fiscale italiano per la pianificazione FIRE.
 * Include calcolo IRPEF, tassazione capital gain, fondi pensione, TFR
 * e ottimizzazione dell'ordine di prelievo.
 */

/** Risultato del calcolo IRPEF con dettaglio per scaglione */
export interface IRPEFResult {
	/** Imposta totale dovuta */
	tax: number;
	/** Aliquota effettiva (tax / income) */
	effectiveRate: number;
	/** Dettaglio per ogni scaglione */
	brackets: IRPEFBracket[];
}

/** Dettaglio di uno scaglione IRPEF */
export interface IRPEFBracket {
	/** Inizio scaglione */
	from: number;
	/** Fine scaglione */
	to: number;
	/** Aliquota dello scaglione */
	rate: number;
	/** Imposta calcolata per questo scaglione */
	tax: number;
}

/** Risultato del calcolo fiscale fondo pensione */
export interface PensionFundTaxResult {
	/** Deduzione massima sui contributi */
	contributionDeduction: number;
	/** Aliquota tassazione rendimenti */
	returnTax: number;
	/** Aliquota tassazione prestazione */
	benefitTax: number;
}

/** Piano di prelievo ottimizzato */
export interface WithdrawalPlan {
	/** Tipo di conto */
	accountType: 'taxable' | 'pension_fund' | 'government_bonds' | 'tfr';
	/** Ordine di prelievo (1 = primo) */
	order: number;
	/** Aliquota fiscale applicabile */
	taxRate: number;
	/** Note/motivazione in italiano */
	note: string;
}

/** Composizione del prelievo per tipologia di conto */
export interface WithdrawalComposition {
	/** Percentuale da conti tassabili (azioni/ETF) */
	taxable: number;
	/** Percentuale da fondo pensione */
	pensionFund: number;
	/** Percentuale da titoli di stato */
	governmentBonds: number;
	/** Percentuale da TFR */
	tfr: number;
}

/**
 * Scaglioni IRPEF 2026.
 * Aggiornati con la riforma fiscale:
 * - 23% fino a 28.000€
 * - 33% da 28.001€ a 50.000€
 * - 43% oltre 50.000€
 */
const IRPEF_BRACKETS: { from: number; to: number; rate: number }[] = [
	{ from: 0, to: 28000, rate: 0.23 },
	{ from: 28000, to: 50000, rate: 0.33 },
	{ from: 50000, to: Infinity, rate: 0.43 }
];

/**
 * Calcola l'IRPEF su un reddito annuale lordo.
 * Applica gli scaglioni progressivi del 2026.
 *
 * @param annualIncome - Reddito annuale lordo imponibile
 * @returns Oggetto con imposta totale, aliquota effettiva e dettaglio scaglioni
 */
export function calculateIRPEF(annualIncome: number): IRPEFResult {
	if (annualIncome <= 0) {
		return { tax: 0, effectiveRate: 0, brackets: [] };
	}

	let remainingIncome = annualIncome;
	let totalTax = 0;
	const brackets: IRPEFBracket[] = [];

	for (const bracket of IRPEF_BRACKETS) {
		if (remainingIncome <= 0) break;

		const bracketWidth = bracket.to === Infinity
			? remainingIncome
			: Math.min(bracket.to - bracket.from, remainingIncome);

		const taxableInBracket = Math.max(0, bracketWidth);
		const bracketTax = taxableInBracket * bracket.rate;

		brackets.push({
			from: bracket.from,
			to: bracket.to === Infinity ? annualIncome : Math.min(bracket.to, annualIncome),
			rate: bracket.rate,
			tax: bracketTax
		});

		totalTax += bracketTax;
		remainingIncome -= taxableInBracket;
	}

	return {
		tax: Math.round(totalTax * 100) / 100,
		effectiveRate: annualIncome > 0 ? totalTax / annualIncome : 0,
		brackets
	};
}

/**
 * Calcola la tassa sulle plusvalenze (capital gains tax) in Italia.
 *
 * Aliquote:
 * - 26% per azioni, ETF, obbligazioni corporate, fondi
 * - 12.5% per titoli di stato (BTP, BOT, CCT) e equiparati
 *
 * @param gains - Plusvalenze realizzate
 * @param assetType - Tipo di asset ('stocks' | 'etf' | 'corporate_bonds' | 'government_bonds')
 * @returns Imposta dovuta sulle plusvalenze
 */
export function calculateCapitalGainsTax(
	gains: number,
	assetType: 'stocks' | 'etf' | 'corporate_bonds' | 'government_bonds'
): number {
	if (gains <= 0) return 0;

	const rate = assetType === 'government_bonds' ? 0.125 : 0.26;
	return Math.round(gains * rate * 100) / 100;
}

/**
 * Calcola la tassazione del fondo pensione complementare italiano.
 *
 * Regole:
 * - Contributi deducibili fino a 5.300€/anno (dal 2026, Legge di Bilancio 2026)
 * - Rendimenti tassati al 20% (12.5% sulla quota investita in titoli di stato)
 * - Prestazione finale tassata al 15%, ridotta dello 0.3% per ogni anno oltre il 15°,
 *   fino a un minimo del 9% (dopo 35 anni di partecipazione)
 *
 * @param contributions - Contributo annuale al fondo
 * @param years - Anni di partecipazione al fondo
 * @returns Oggetto con deduzione, aliquota rendimenti e aliquota prestazione
 */
export function calculatePensionFundTax(
	contributions: number,
	years: number
): PensionFundTaxResult {
	// Deduzione massima annuale
	const maxDeduction = 5300;
	const contributionDeduction = Math.min(contributions, maxDeduction);

	// Tassazione sui rendimenti: 20% (aliquota standard)
	const returnTax = 0.20;

	// Tassazione sulla prestazione: 15% base, -0.3% per ogni anno oltre il 15°
	const extraYears = Math.max(0, years - 15);
	const reduction = Math.min(extraYears * 0.003, 0.06); // max riduzione 6% (da 15% a 9%)
	const benefitTax = 0.15 - reduction;

	return {
		contributionDeduction: Math.round(contributionDeduction * 100) / 100,
		returnTax,
		benefitTax: Math.round(benefitTax * 1000) / 1000
	};
}

/**
 * Calcola il TFR (Trattamento di Fine Rapporto) accantonato.
 *
 * Il TFR si accantona come stipendio annuo / 13.5 per ogni anno,
 * e viene rivalutato annualmente con un tasso pari a 1.5% + 75% * inflazione.
 *
 * @param annualSalary - Stipendio annuo lordo
 * @param years - Anni di lavoro
 * @param inflation - Tasso di inflazione medio annuale (es. 0.02)
 * @returns TFR totale accantonato (lordo)
 */
export function calculateTFR(
	annualSalary: number,
	years: number,
	inflation: number
): number {
	if (annualSalary <= 0 || years <= 0) return 0;

	const annualAccrual = annualSalary / 13.5;
	const revaluationRate = 0.015 + 0.75 * inflation;

	let totalTFR = 0;

	for (let i = 0; i < years; i++) {
		// Rivaluta il TFR accantonato degli anni precedenti
		if (i > 0) {
			totalTFR *= (1 + revaluationRate);
		}
		// Aggiungi l'accantonamento dell'anno corrente
		totalTFR += annualAccrual;
	}

	return Math.round(totalTFR * 100) / 100;
}

/**
 * Suggerisce l'ordine ottimale di prelievo dai diversi tipi di conto
 * per minimizzare l'impatto fiscale in fase di decumulo.
 *
 * Ordine tipico ottimale:
 * 1. Conti tassabili (26%) - svuotare prima per ridurre la tassazione futura sui gain
 * 2. Fondo pensione (9-15%) - tassazione agevolata, ma vincolato
 * 3. Titoli di stato (12.5%) - tassazione ridotta, utili come ultimo baluardo
 *
 * @param accounts - Tipi di conto disponibili con saldi
 * @returns Piano di prelievo ordinato
 */
export function optimizeWithdrawalOrder(
	accounts: { type: 'taxable' | 'pension_fund' | 'government_bonds' | 'tfr'; balance: number }[]
): WithdrawalPlan[] {
	const plans: WithdrawalPlan[] = [];

	// Ordine ottimale: taxable (26%) -> pension_fund (9-15%) -> government_bonds (12.5%) -> TFR
	// Il taxable va per primo perché i gain continuano a crescere se non prelevati
	const orderMap: Record<string, { order: number; taxRate: number; note: string }> = {
		taxable: {
			order: 1,
			taxRate: 0.26,
			note: 'Prelevare per primi: le plusvalenze continuano a crescere e saranno tassate al 26%'
		},
		pension_fund: {
			order: 2,
			taxRate: 0.12, // media tra 9% e 15%
			note: 'Tassazione agevolata dal 15% al 9% in base agli anni di partecipazione'
		},
		government_bonds: {
			order: 3,
			taxRate: 0.125,
			note: 'Tassazione ridotta al 12.5% sui titoli di stato italiani ed equiparati'
		},
		tfr: {
			order: 4,
			taxRate: 0.15, // tassazione separata
			note: 'TFR soggetto a tassazione separata, utilizzare come riserva finale'
		}
	};

	for (const account of accounts) {
		if (account.balance <= 0) continue;
		const info = orderMap[account.type];
		if (info) {
			plans.push({
				accountType: account.type,
				order: info.order,
				taxRate: info.taxRate,
				note: info.note
			});
		}
	}

	return plans.sort((a, b) => a.order - b.order);
}

/**
 * Calcola l'aliquota fiscale effettiva su un prelievo composito,
 * basata sulla composizione per tipo di conto.
 *
 * @param withdrawal - Importo totale del prelievo
 * @param composition - Percentuali per tipo di conto (somma deve essere ~1.0)
 * @returns Aliquota fiscale effettiva ponderata
 */
export function calculateEffectiveTaxRate(
	withdrawal: number,
	composition: WithdrawalComposition
): number {
	if (withdrawal <= 0) return 0;

	const rates: Record<keyof WithdrawalComposition, number> = {
		taxable: 0.26,
		pensionFund: 0.12, // media fondo pensione
		governmentBonds: 0.125,
		tfr: 0.15
	};

	let weightedRate = 0;
	for (const [key, percentage] of Object.entries(composition)) {
		weightedRate += (percentage || 0) * (rates[key as keyof WithdrawalComposition] || 0);
	}

	return Math.round(weightedRate * 10000) / 10000;
}
