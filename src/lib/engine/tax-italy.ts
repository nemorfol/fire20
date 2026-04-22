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

/** Stock di minusvalenze compensabili con scadenze */
export interface CapitalLossStock {
	/** Anno in cui e' stata realizzata la minusvalenza */
	year: number;
	/** Importo residuo ancora compensabile */
	remaining: number;
}

/** Risultato della compensazione minusvalenze in un anno */
export interface CapitalLossOffsetResult {
	/** Plusvalenza originale dell'anno */
	grossGain: number;
	/** Minusvalenza utilizzata per compensare in questo anno */
	lossUsed: number;
	/** Plusvalenza netta tassabile (grossGain - lossUsed) */
	netTaxableGain: number;
	/** Imposta dovuta dopo compensazione */
	taxDue: number;
	/** Stock minusvalenze residuo dopo la compensazione (scadute escluse) */
	updatedLossStock: CapitalLossStock[];
}

/**
 * Gestione della compensazione di minusvalenze con plusvalenze in Italia.
 *
 * Regole (TUIR art. 68):
 * - Le minusvalenze pregresse si possono portare in compensazione delle
 *   plusvalenze future per 4 anni (l'anno della minus + 4 successivi).
 * - La compensazione e' possibile solo tra redditi diversi dello STESSO tipo
 *   (equiparati: azioni, ETF azionari, obbligazioni corporate; esclusi i
 *   proventi da fondi comuni / ETF armonizzati che sono redditi di capitale
 *   e non compensabili con minus di redditi diversi — semplificazione qui).
 * - Aliquota 26% su etf/azioni/corporate, 12.5% sui titoli di stato.
 * - FIFO: si usa prima la minusvalenza piu' vecchia (per non farla scadere).
 *
 * @param grossGain - Plusvalenza realizzata nell'anno corrente (stesso tipo delle minus)
 * @param currentYear - Anno di realizzo della plusvalenza
 * @param lossStock - Stock minusvalenze pregresse
 * @param assetType - Tipo asset (determina aliquota)
 * @param maxAgeYears - Numero di anni di validita' della minus (default 4: anno + 4)
 */
export function applyCapitalLossOffset(
	grossGain: number,
	currentYear: number,
	lossStock: CapitalLossStock[],
	assetType: 'stocks' | 'etf' | 'corporate_bonds' | 'government_bonds' = 'etf',
	maxAgeYears: number = 4
): CapitalLossOffsetResult {
	// Rimuovi minusvalenze scadute (piu' vecchie di maxAgeYears anni)
	const valid = lossStock
		.filter((l) => currentYear - l.year <= maxAgeYears && l.remaining > 0)
		.map((l) => ({ ...l }))
		.sort((a, b) => a.year - b.year); // FIFO

	if (grossGain <= 0) {
		return {
			grossGain,
			lossUsed: 0,
			netTaxableGain: 0,
			taxDue: 0,
			updatedLossStock: valid
		};
	}

	let remainingGain = grossGain;
	let lossUsed = 0;
	for (const l of valid) {
		if (remainingGain <= 0) break;
		const use = Math.min(l.remaining, remainingGain);
		l.remaining -= use;
		remainingGain -= use;
		lossUsed += use;
	}

	const netTaxableGain = Math.max(0, grossGain - lossUsed);
	const taxDue = calculateCapitalGainsTax(netTaxableGain, assetType);

	return {
		grossGain,
		lossUsed: Math.round(lossUsed * 100) / 100,
		netTaxableGain: Math.round(netTaxableGain * 100) / 100,
		taxDue,
		updatedLossStock: valid.filter((l) => l.remaining > 0)
	};
}

/**
 * Registra una nuova minusvalenza nello stock.
 * Se esiste gia' una minus per quell'anno, la somma; altrimenti la aggiunge.
 */
export function addCapitalLoss(
	stock: CapitalLossStock[],
	year: number,
	amount: number
): CapitalLossStock[] {
	if (amount <= 0) return stock;
	const copy = stock.map((l) => ({ ...l }));
	const existing = copy.find((l) => l.year === year);
	if (existing) {
		existing.remaining += amount;
	} else {
		copy.push({ year, remaining: amount });
	}
	return copy;
}

/** Risultato dell'extradeducibilita' per nuovi lavoratori post-2007 */
export interface ExtraDeductibilityResult {
	/** Se il lavoratore ha diritto all'extradeducibilita' */
	eligible: boolean;
	/** Deduzione ordinaria massima */
	ordinaryDeduction: number;
	/** Extradeducibilita' annuale massima */
	extraDeduction: number;
	/** Deduzione totale massima (ordinaria + extra) */
	totalMaxDeduction: number;
	/** Plafond residuo non utilizzato recuperabile */
	unusedAllowance: number;
	/** Note esplicative */
	notes: string;
}

/**
 * Calcola l'extradeducibilita' per i "nuovi lavoratori" (primo impiego dal 1/1/2007).
 *
 * Regole (Legge di Bilancio 2026):
 * - Si applica a chi ha iniziato a versare contributi previdenziali obbligatori dopo il 1/1/2007
 * - Nei primi 5 anni di partecipazione al fondo pensione, se non si e' utilizzato tutto
 *   il plafond di deducibilita' ordinaria (5.300€/anno), la differenza puo' essere recuperata
 *   nei 20 anni successivi, fino a un massimo aggiuntivo di 2.650€/anno
 * - Tetto massimo totale: 5.300 + 2.650 = 7.950€/anno
 * - Il quinquennio utile decorre dalla data di primo impiego, non dall'iscrizione al fondo
 * - Per importi versati fino al 2025 si applica il vecchio limite (5.164,57€)
 *
 * @param firstEmploymentYear - Anno del primo impiego (deve essere >= 2007)
 * @param fundJoinYear - Anno di iscrizione al fondo pensione
 * @param currentYear - Anno corrente
 * @param avgAnnualContributions - Media contributi annui versati nei primi 5 anni
 */
export function calculateExtraDeductibility(
	firstEmploymentYear: number,
	fundJoinYear: number,
	currentYear: number,
	avgAnnualContributions: number
): ExtraDeductibilityResult {
	const ORDINARY_LIMIT = 5300;
	const EXTRA_LIMIT = 2650;
	const OLD_ORDINARY_LIMIT = 5164.57;

	// Requisito base: primo impiego dopo 1/1/2007
	if (firstEmploymentYear < 2007) {
		return {
			eligible: false,
			ordinaryDeduction: ORDINARY_LIMIT,
			extraDeduction: 0,
			totalMaxDeduction: ORDINARY_LIMIT,
			unusedAllowance: 0,
			notes: 'Non idoneo: il primo impiego e\' precedente al 1/1/2007. Si applica solo la deducibilita\' ordinaria di 5.300€/anno.'
		};
	}

	// Calcola il plafond non utilizzato nei primi 5 anni di partecipazione al fondo
	const yearsInFund = currentYear - fundJoinYear;
	const firstFiveYearsEnd = fundJoinYear + 5;

	if (yearsInFund <= 5) {
		// Ancora nei primi 5 anni: non si puo' ancora recuperare
		return {
			eligible: true,
			ordinaryDeduction: ORDINARY_LIMIT,
			extraDeduction: 0,
			totalMaxDeduction: ORDINARY_LIMIT,
			unusedAllowance: 0,
			notes: `Idoneo all'extradeducibilita'. Sei nel ${yearsInFund}° anno di partecipazione al fondo. Il recupero del plafond inutilizzato sara' possibile dal ${firstFiveYearsEnd + 1}° anno, per i successivi 20 anni.`
		};
	}

	// Dopo i primi 5 anni: calcola il plafond non utilizzato
	// Per anni fino al 2025 si usa il vecchio limite, dal 2026 il nuovo
	let totalAllowance = 0;
	for (let y = fundJoinYear; y < fundJoinYear + 5; y++) {
		totalAllowance += y < 2026 ? OLD_ORDINARY_LIMIT : ORDINARY_LIMIT;
	}

	const totalUsed = avgAnnualContributions * 5;
	const unusedAllowance = Math.max(0, totalAllowance - totalUsed);

	// L'extra recuperabile e' limitato a 2.650€/anno per max 20 anni
	const recoveryYearsLeft = Math.max(0, 20 - (yearsInFund - 5));
	const annualExtra = recoveryYearsLeft > 0 ? Math.min(EXTRA_LIMIT, unusedAllowance / recoveryYearsLeft) : 0;

	const totalMax = ORDINARY_LIMIT + annualExtra;

	let notes = `Idoneo all'extradeducibilita'. Plafond non utilizzato nei primi 5 anni: ${unusedAllowance.toLocaleString('it-IT', { maximumFractionDigits: 0 })}€.`;
	if (recoveryYearsLeft > 0) {
		notes += ` Recuperabile in ${recoveryYearsLeft} anni rimanenti, fino a ${annualExtra.toLocaleString('it-IT', { maximumFractionDigits: 0 })}€/anno in aggiunta alla deduzione ordinaria.`;
	} else {
		notes += ' Periodo di recupero (20 anni) esaurito.';
	}
	notes += ` Tetto massimo annuo: ${totalMax.toLocaleString('it-IT', { maximumFractionDigits: 0 })}€ (ordinaria 5.300€ + extra ${Math.round(annualExtra)}€).`;

	return {
		eligible: true,
		ordinaryDeduction: ORDINARY_LIMIT,
		extraDeduction: Math.round(annualExtra * 100) / 100,
		totalMaxDeduction: Math.round(totalMax * 100) / 100,
		unusedAllowance: Math.round(unusedAllowance * 100) / 100,
		notes
	};
}

/**
 * Calcola la tassazione del fondo pensione complementare italiano.
 *
 * Regole (aggiornate Legge di Bilancio 2026):
 * - Contributi deducibili fino a 5.300€/anno (ordinaria)
 * - Per nuovi lavoratori post-2007: extradeducibilita' fino a 2.650€/anno (totale max 7.950€)
 * - Rendimenti tassati al 20% (12.5% sulla quota investita in titoli di stato)
 * - Prestazione finale tassata al 15%, ridotta dello 0.3% per ogni anno oltre il 15°,
 *   fino a un minimo del 9% (dopo 35 anni di partecipazione)
 *
 * @param contributions - Contributo annuale al fondo
 * @param years - Anni di partecipazione al fondo
 * @param extraDeductionEligible - Se il lavoratore ha diritto all'extradeducibilita'
 * @param extraDeductionAmount - Importo extra deducibile annuo (default 0)
 * @returns Oggetto con deduzione, aliquota rendimenti e aliquota prestazione
 */
export function calculatePensionFundTax(
	contributions: number,
	years: number,
	extraDeductionEligible: boolean = false,
	extraDeductionAmount: number = 0
): PensionFundTaxResult {
	// Deduzione massima annuale (ordinaria + eventuale extra)
	const ordinaryMax = 5300;
	const extraMax = extraDeductionEligible ? Math.min(extraDeductionAmount, 2650) : 0;
	const maxDeduction = ordinaryMax + extraMax;
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

/** Risultato della tassazione complessiva sul reddito da lavoro */
export interface TotalIncomeTaxResult {
	/** IRPEF ordinaria calcolata a scaglioni */
	irpef: number;
	/** Addizionale regionale (media stimata) */
	regional: number;
	/** Addizionale comunale (media stimata) */
	municipal: number;
	/** Imposte totali (irpef + addizionali) */
	total: number;
	/** Aliquota effettiva totale */
	effectiveRate: number;
}

/**
 * Tassazione complessiva del reddito da lavoro dipendente: IRPEF + addizionali
 * regionali e comunali. Le addizionali sono approssimate con medie nazionali
 * perche' il valore esatto dipende da comune di residenza e reddito.
 *
 * - Addizionale regionale: media italiana ~1.73% (range 1.23%-3.33%)
 * - Addizionale comunale: media italiana ~0.7% (range 0%-0.9%)
 *
 * @param grossIncome - Reddito lordo annuale imponibile
 * @param regionalRate - Aliquota regionale (default 0.0173)
 * @param municipalRate - Aliquota comunale (default 0.007)
 */
export function calculateTotalIncomeTax(
	grossIncome: number,
	regionalRate: number = 0.0173,
	municipalRate: number = 0.007
): TotalIncomeTaxResult {
	if (grossIncome <= 0) {
		return { irpef: 0, regional: 0, municipal: 0, total: 0, effectiveRate: 0 };
	}
	const irpef = calculateIRPEF(grossIncome).tax;
	const regional = grossIncome * regionalRate;
	const municipal = grossIncome * municipalRate;
	const total = irpef + regional + municipal;
	return {
		irpef: Math.round(irpef * 100) / 100,
		regional: Math.round(regional * 100) / 100,
		municipal: Math.round(municipal * 100) / 100,
		total: Math.round(total * 100) / 100,
		effectiveRate: total / grossIncome
	};
}

/**
 * Contributi previdenziali INPS a carico del lavoratore (trattenuti in busta
 * paga). Aliquote 2026:
 * - Dipendente: 9.19% fino al massimale (~105.000€), poi 10.19%
 * - Parasubordinato (co.co.co iscritti alla gestione separata): 1/3 del 33.72% a carico ~11.24%
 * - Autonomo iscritto alla gestione separata: per convenzione consideriamo il
 *   26.23% nominale (in realta' l'autonomo paga tutto ma qui si calcola la
 *   quota "equivalente lavoratore" per simmetria, usata solo per il breakdown)
 *
 * @param grossIncome - Reddito lordo annuale
 * @param contractType - Tipo di contratto
 */
export function calculateInpsWorkerContribution(
	grossIncome: number,
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato' = 'dipendente'
): number {
	if (grossIncome <= 0) return 0;

	// Massimale contributivo 2026 (approssimato)
	const MASSIMALE = 105014;

	let rate: number;
	let additionalRate = 0; // quota eccedente il massimale
	switch (contractType) {
		case 'dipendente':
			rate = 0.0919;
			additionalRate = 0.0101; // oltre il massimale paga 10.19%
			break;
		case 'parasubordinato':
			rate = 0.1124; // 1/3 a carico del collaboratore
			break;
		case 'autonomo':
			// L'autonomo paga tutto ma per il breakdown da lavoratore mostriamo
			// la quota "comparabile": usiamo comunque 0.2623 come indicativo
			rate = 0.2623;
			break;
	}

	if (grossIncome <= MASSIMALE || additionalRate === 0) {
		return Math.round(grossIncome * rate * 100) / 100;
	}
	const base = MASSIMALE * rate;
	const excess = (grossIncome - MASSIMALE) * (rate + additionalRate);
	return Math.round((base + excess) * 100) / 100;
}

/** Breakdown della busta paga annuale stimata */
export interface NetSalaryBreakdown {
	gross: number;
	inpsContribution: number;
	irpef: number;
	regionalTax: number;
	municipalTax: number;
	totalTax: number;
	net: number;
	/** Aliquota effettiva totale (fiscale + previdenziale) su gross */
	effectiveRate: number;
}

/**
 * Calcolo netto in busta paga approssimato: gross - INPS lavoratore - IRPEF
 * su imponibile (gross - INPS) - addizionali. Non considera detrazioni da
 * lavoro dipendente (dipendono da reddito e non vogliamo inventare valori).
 * Utile per il breakdown del cash flow annuale.
 */
export function calculateNetSalary(
	grossIncome: number,
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato' = 'dipendente',
	regionalRate: number = 0.0173,
	municipalRate: number = 0.007
): NetSalaryBreakdown {
	if (grossIncome <= 0) {
		return {
			gross: 0, inpsContribution: 0, irpef: 0, regionalTax: 0,
			municipalTax: 0, totalTax: 0, net: 0, effectiveRate: 0
		};
	}
	const inps = calculateInpsWorkerContribution(grossIncome, contractType);
	const taxable = Math.max(0, grossIncome - inps);
	const tax = calculateTotalIncomeTax(taxable, regionalRate, municipalRate);
	const totalTax = tax.total;
	const net = Math.max(0, grossIncome - inps - totalTax);
	return {
		gross: grossIncome,
		inpsContribution: Math.round(inps * 100) / 100,
		irpef: tax.irpef,
		regionalTax: tax.regional,
		municipalTax: tax.municipal,
		totalTax: Math.round(totalTax * 100) / 100,
		net: Math.round(net * 100) / 100,
		effectiveRate: (inps + totalTax) / grossIncome
	};
}
