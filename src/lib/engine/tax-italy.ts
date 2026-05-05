/**
 * Sistema fiscale italiano per la pianificazione FIRE.
 * Include calcolo IRPEF, tassazione capital gain, fondi pensione, TFR
 * e ottimizzazione dell'ordine di prelievo.
 *
 * Le funzioni accettano (in modalita' opzionale, retrocompatibile) un
 * AssumptionSet che rende esplicite le aliquote applicate. Se non passato
 * usano i default 2026.
 */
import { DEFAULT_2026, type AssumptionSet, type IRPEFBracketDef } from './assumptions';

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
 * Scaglioni IRPEF di default (2026, riforma confermata):
 * - 23% fino a 28.000€
 * - 33% da 28.001€ a 50.000€
 * - 43% oltre 50.000€
 *
 * Costante esportata solo per retrocompatibilita': il vero "ground truth"
 * sono gli scaglioni dentro AssumptionSet.
 */
export const IRPEF_BRACKETS: IRPEFBracketDef[] = DEFAULT_2026.irpefBrackets;

/**
 * Calcola l'IRPEF su un reddito annuale lordo applicando gli scaglioni
 * dell'AssumptionSet passato (o quelli di default 2026 se omesso).
 *
 * @param annualIncome - Reddito annuale lordo imponibile
 * @param assumptions - Set di aliquote da usare. Se omesso usa DEFAULT_2026.
 * @returns Oggetto con imposta totale, aliquota effettiva e dettaglio scaglioni
 */
export function calculateIRPEF(
	annualIncome: number,
	assumptions: AssumptionSet = DEFAULT_2026
): IRPEFResult {
	if (annualIncome <= 0) {
		return { tax: 0, effectiveRate: 0, brackets: [] };
	}

	const brackets_def = assumptions.irpefBrackets;
	let remainingIncome = annualIncome;
	let totalTax = 0;
	const brackets: IRPEFBracket[] = [];

	for (const bracket of brackets_def) {
		if (remainingIncome <= 0) break;

		const bracketWidth = bracket.to === Number.POSITIVE_INFINITY
			? remainingIncome
			: Math.min(bracket.to - bracket.from, remainingIncome);

		const taxableInBracket = Math.max(0, bracketWidth);
		const bracketTax = taxableInBracket * bracket.rate;

		brackets.push({
			from: bracket.from,
			to: bracket.to === Number.POSITIVE_INFINITY
				? annualIncome
				: Math.min(bracket.to, annualIncome),
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
 * Inversa esatta dell'IRPEF: dato un reddito NETTO target (post-IRPEF +
 * addizionali), restituisce il LORDO esatto che lo produce. Usa il fatto
 * che la funzione gross→net e' lineare a tratti (un segmento per scaglione)
 * ed e' quindi invertibile in chiusa, scaglione per scaglione, in O(N).
 *
 * Nota: non considera le addizionali regionale/comunale ne' i contributi
 * INPS. Per il netto in busta paga usa `invertNetSalary`.
 *
 * @param targetNetIRPEF - Netto target dopo la sola IRPEF
 * @param assumptions - Set di aliquote (default 2026)
 * @returns Reddito lordo esatto
 */
export function invertIRPEF(
	targetNetIRPEF: number,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (targetNetIRPEF <= 0) return 0;
	let cumulativeTax = 0;
	for (const b of assumptions.irpefBrackets) {
		const bracketTop = b.to === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : b.to;
		const bracketWidth = bracketTop - b.from;
		const bracketTax = bracketWidth === Number.POSITIVE_INFINITY ? Infinity : bracketWidth * b.rate;
		const bracketNetTop =
			bracketTop === Number.POSITIVE_INFINITY ? Infinity : bracketTop - (cumulativeTax + bracketTax);
		// Se il netto target rientra in questo scaglione, risolvi: gross =
		// b.from + (target - bracketNetFloor) / (1 - b.rate)
		const bracketNetFloor = b.from - cumulativeTax;
		if (targetNetIRPEF <= bracketNetTop || bracketTop === Number.POSITIVE_INFINITY) {
			const grossExtra = (targetNetIRPEF - bracketNetFloor) / (1 - b.rate);
			return Math.round((b.from + grossExtra) * 100) / 100;
		}
		cumulativeTax += bracketTax;
	}
	// Non dovrebbe mai arrivarci: l'ultimo scaglione e' aperto a destra
	return targetNetIRPEF;
}

/**
 * Calcola la tassa sulle plusvalenze (capital gains tax) in Italia.
 *
 * Aliquote di default (DEFAULT_2026):
 * - 26% per azioni, ETF, obbligazioni corporate, fondi
 * - 12.5% per titoli di stato (BTP, BOT, CCT) e equiparati
 *
 * @param gains - Plusvalenze realizzate
 * @param assetType - Tipo di asset
 * @param assumptions - Set di aliquote (default 2026)
 * @returns Imposta dovuta sulle plusvalenze
 */
export function calculateCapitalGainsTax(
	gains: number,
	assetType: 'stocks' | 'etf' | 'corporate_bonds' | 'government_bonds',
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (gains <= 0) return 0;

	const rate =
		assetType === 'government_bonds'
			? assumptions.capital.governmentBonds
			: assumptions.capital.stocksAndEtf;
	return Math.round(gains * rate * 100) / 100;
}

/**
 * Bollo titoli (imposta di bollo su deposito titoli/strumenti finanziari).
 * Aliquota standard: 0.2% annuo sul controvalore al 31/12. Si applica anche
 * a fondi pensione "individuali" e a investimenti in OICR. NON si applica a
 * fondi pensione contrattuali/negoziali (esenti). NON si applica al conto
 * corrente con giacenza media <= 5.000€ (per il quale c'e' il bollo cc fisso).
 *
 * Per FIRE: su un patrimonio liquido investito di 500.000€ il bollo titoli
 * pesa 1.000€/anno, su 1M€ pesa 2.000€/anno: NON un dettaglio.
 *
 * @param portfolioValue - Controvalore del deposito titoli (al 31/12)
 * @param assumptions - Aliquote (default 2026 = 0.2%)
 */
export function calculateStampDuty(
	portfolioValue: number,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (portfolioValue <= 0) return 0;
	return Math.round(portfolioValue * assumptions.capital.stampDuty * 100) / 100;
}

/**
 * IVAFE: Imposta sulle Attivita' Finanziarie all'Estero. Si applica a
 * conti, depositi e strumenti finanziari detenuti su intermediari esteri
 * (broker tipo Interactive Brokers, Trade Republic, Degiro, ecc.).
 * Aliquota: 0.2% annuo. Per conti correnti e depositi a risparmio: forfait
 * 34,20€ per anno per ogni conto se giacenza media > 5.000€ (qui si gestisce
 * solo la quota proporzionale 0.2% su strumenti finanziari).
 *
 * @param foreignAssetsValue - Controvalore asset finanziari all'estero
 * @param assumptions - Aliquote (default 2026 = 0.2%)
 */
export function calculateIVAFE(
	foreignAssetsValue: number,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (foreignAssetsValue <= 0) return 0;
	return Math.round(foreignAssetsValue * assumptions.capital.ivafe * 100) / 100;
}

/**
 * Imposte patrimoniali totali sul portafoglio (bollo titoli + IVAFE).
 * Riceve la quota italiana e la quota estera separate (se l'utente non sa,
 * di default tutto e' considerato in deposito italiano).
 */
export interface PortfolioStampDutiesResult {
	stampDuty: number;
	ivafe: number;
	total: number;
}

export function calculatePortfolioStampDuties(
	italianValue: number,
	foreignValue: number,
	assumptions: AssumptionSet = DEFAULT_2026
): PortfolioStampDutiesResult {
	const stampDuty = calculateStampDuty(italianValue, assumptions);
	const ivafe = calculateIVAFE(foreignValue, assumptions);
	return {
		stampDuty,
		ivafe,
		total: Math.round((stampDuty + ivafe) * 100) / 100
	};
}

/** Tassazione del reddito da locazione: confronto IRPEF vs cedolare secca */
export interface RentalTaxComparison {
	/** Canone lordo annuo dichiarato */
	grossRent: number;
	/** Tassazione con cedolare secca (21% canone libero) */
	cedolare: { rate: number; tax: number; net: number };
	/** Tassazione con IRPEF ordinaria (95% imponibile + addizionali, no INPS) */
	irpef: { taxable: number; tax: number; net: number };
	/** Quale dei due conviene */
	recommended: 'cedolare' | 'irpef';
	/** Risparmio annuo della scelta migliore rispetto alla peggiore */
	savings: number;
}

/**
 * Confronta la tassazione di un canone di locazione tra:
 * - Cedolare secca: aliquota fissa (21% canone libero) sostitutiva di IRPEF +
 *   addizionali + imposta di registro + bollo. Niente deduzioni.
 * - IRPEF ordinaria: 95% del canone (riduzione forfettaria 5%) si somma agli
 *   altri redditi e segue lo scaglione marginale; si aggiungono regionale e
 *   comunale.
 *
 * NB: il calcolo IRPEF richiede di conoscere il reddito da lavoro per
 * determinare lo scaglione marginale corretto.
 *
 * @param grossRent - Canone annuo lordo
 * @param otherIncome - Reddito imponibile gia' soggetto a IRPEF (lavoro, ecc.)
 * @param assumptions - Aliquote (default 2026)
 */
export function compareRentalTax(
	grossRent: number,
	otherIncome: number,
	assumptions: AssumptionSet = DEFAULT_2026
): RentalTaxComparison {
	if (grossRent <= 0) {
		const empty = { rate: 0, tax: 0, net: 0 };
		return {
			grossRent: 0,
			cedolare: empty,
			irpef: { taxable: 0, tax: 0, net: 0 },
			recommended: 'cedolare',
			savings: 0
		};
	}
	// Cedolare secca: aliquota piatta sul canone pieno
	const cedolareRate = assumptions.capital.cedolareSecca;
	const cedolareTax = grossRent * cedolareRate;
	const cedolareNet = grossRent - cedolareTax;

	// IRPEF ordinaria: imponibile 95% del canone, marginal rate sopra il
	// reddito base. Calcoliamo l'IRPEF su (otherIncome + 95%*rent) - IRPEF
	// solo su otherIncome = imposta marginale sul canone.
	const taxableRent = grossRent * 0.95;
	const baseIrpef = calculateIRPEF(otherIncome, assumptions).tax;
	const totalIrpef = calculateIRPEF(otherIncome + taxableRent, assumptions).tax;
	const marginalIrpef = totalIrpef - baseIrpef;
	const surtax = taxableRent * (assumptions.surtaxes.regional + assumptions.surtaxes.municipal);
	const irpefTax = marginalIrpef + surtax;
	const irpefNet = grossRent - irpefTax;

	const recommended = cedolareTax <= irpefTax ? 'cedolare' : 'irpef';
	const savings = Math.abs(cedolareTax - irpefTax);

	return {
		grossRent: Math.round(grossRent * 100) / 100,
		cedolare: {
			rate: cedolareRate,
			tax: Math.round(cedolareTax * 100) / 100,
			net: Math.round(cedolareNet * 100) / 100
		},
		irpef: {
			taxable: Math.round(taxableRent * 100) / 100,
			tax: Math.round(irpefTax * 100) / 100,
			net: Math.round(irpefNet * 100) / 100
		},
		recommended,
		savings: Math.round(savings * 100) / 100
	};
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
	regionalRate: number = DEFAULT_2026.surtaxes.regional,
	municipalRate: number = DEFAULT_2026.surtaxes.municipal,
	assumptions: AssumptionSet = DEFAULT_2026
): TotalIncomeTaxResult {
	if (grossIncome <= 0) {
		return { irpef: 0, regional: 0, municipal: 0, total: 0, effectiveRate: 0 };
	}
	const irpef = calculateIRPEF(grossIncome, assumptions).tax;
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
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato' = 'dipendente',
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (grossIncome <= 0) return 0;

	const MASSIMALE = assumptions.inps.massimale;

	let rate: number;
	let additionalRate = 0;
	switch (contractType) {
		case 'dipendente':
			rate = assumptions.inps.employeeBase;
			additionalRate = assumptions.inps.employeeAdditional;
			break;
		case 'parasubordinato':
			rate = assumptions.inps.parasubordinato;
			break;
		case 'autonomo':
			rate = assumptions.inps.autonomo;
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
	regionalRate: number = DEFAULT_2026.surtaxes.regional,
	municipalRate: number = DEFAULT_2026.surtaxes.municipal,
	assumptions: AssumptionSet = DEFAULT_2026
): NetSalaryBreakdown {
	if (grossIncome <= 0) {
		return {
			gross: 0, inpsContribution: 0, irpef: 0, regionalTax: 0,
			municipalTax: 0, totalTax: 0, net: 0, effectiveRate: 0
		};
	}
	const inps = calculateInpsWorkerContribution(grossIncome, contractType, assumptions);
	const taxable = Math.max(0, grossIncome - inps);
	const tax = calculateTotalIncomeTax(taxable, regionalRate, municipalRate, assumptions);
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

/**
 * Inverte la busta paga: dato un netto target restituisce il lordo annuo
 * esatto. La funzione gross→net e' lineare a tratti (rispetto al gross)
 * perche':
 *   net = gross - INPS(gross) - IRPEF(gross-INPS) - addizionali*(gross-INPS)
 * dove sia INPS che IRPEF sono piecewise lineari. Si risolve scaglione per
 * scaglione: prima si determina lo scaglione INPS in cui cade il gross,
 * poi quello IRPEF. La complessita' e' O(n_inps_segments * n_irpef_segments)
 * = costante (al massimo 6 segmenti).
 *
 * Risolutore esatto, non iterativo. Sostituisce il "guess + ratio" precedente.
 *
 * @param targetNet - Netto annuale desiderato
 * @param contractType - Tipo contratto
 * @param regionalRate - Aliquota regionale
 * @param municipalRate - Aliquota comunale
 * @param assumptions - Set fiscale
 * @returns Reddito lordo annuo che produce esattamente targetNet
 */
export function invertNetSalary(
	targetNet: number,
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato' = 'dipendente',
	regionalRate: number = DEFAULT_2026.surtaxes.regional,
	municipalRate: number = DEFAULT_2026.surtaxes.municipal,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (targetNet <= 0) return 0;

	// Segmenti INPS: per dipendente abbiamo due tratti (entro/oltre massimale).
	// Per parasubordinato e autonomo l'aliquota e' costante: un solo tratto.
	const massimale = assumptions.inps.massimale;
	type InpsSegment = { from: number; to: number; rate: number };
	let inpsSegments: InpsSegment[];
	switch (contractType) {
		case 'dipendente':
			inpsSegments = [
				{ from: 0, to: massimale, rate: assumptions.inps.employeeBase },
				{
					from: massimale,
					to: Number.POSITIVE_INFINITY,
					rate: assumptions.inps.employeeBase + assumptions.inps.employeeAdditional
				}
			];
			break;
		case 'parasubordinato':
			inpsSegments = [
				{ from: 0, to: Number.POSITIVE_INFINITY, rate: assumptions.inps.parasubordinato }
			];
			break;
		case 'autonomo':
			inpsSegments = [{ from: 0, to: Number.POSITIVE_INFINITY, rate: assumptions.inps.autonomo }];
			break;
	}

	const surtaxRate = regionalRate + municipalRate;

	// Per ogni combinazione (segmento INPS, scaglione IRPEF) la funzione
	// gross→net e' affine: net = a*gross + b. Si risolve per gross e si
	// verifica che il risultato cada effettivamente nei due segmenti.
	const irpefBrackets = assumptions.irpefBrackets;

	let cumulativeInpsAtSegStart = 0;
	for (const inpsSeg of inpsSegments) {
		// In questo segmento INPS:
		//   inps(g) = inpsAtSegStart + (g - inpsSeg.from) * inpsSeg.rate
		// Imponibile = g - inps(g) = g*(1-rate) + (rate*inpsSeg.from - inpsAtSegStart)
		const taxableAtFrom = inpsSeg.from - cumulativeInpsAtSegStart;
		const taxableSlope = 1 - inpsSeg.rate;

		let cumulativeIrpefAtBracketStart = 0;
		for (const b of irpefBrackets) {
			// IRPEF nello scaglione b: irpef(taxable) = cumIrpefAtBracketStart +
			//   (taxable - b.from)*b.rate. La taxable corrispondente al gross g
			//   e' taxable(g) = taxableAtFrom + (g - inpsSeg.from)*taxableSlope.
			// Quindi:
			//   irpef(g) = cumIrpefAtBracketStart + (taxableAtFrom + (g-inpsSeg.from)*taxableSlope - b.from)*b.rate
			//           = b.rate*taxableSlope*g + [cumIrpefAtBracketStart + (taxableAtFrom - b.rate*inpsSeg.from*taxableSlope/b.rate ... )]
			// Semplifichiamo numericamente: net(g) = g - inps(g) - irpef(taxable(g)) - surtaxRate*taxable(g)
			//   = g - [inpsAtSegStart + (g-inpsSeg.from)*inpsSeg.rate]
			//     - [cumIrpefAtBracketStart + (taxable(g)-b.from)*b.rate]
			//     - surtaxRate*taxable(g)
			// dove taxable(g) = taxableAtFrom + (g-inpsSeg.from)*taxableSlope
			//
			// Slope di net rispetto a g:
			const slope = 1 - inpsSeg.rate - (b.rate + surtaxRate) * taxableSlope;
			// net all'estremo inferiore del segmento (g = inpsSeg.from):
			//   inps = inpsAtSegStart, taxable = taxableAtFrom
			//   irpef = cumIrpefAtBracketStart + (taxableAtFrom - b.from)*b.rate
			const netAtInpsFrom =
				inpsSeg.from -
				cumulativeInpsAtSegStart -
				(cumulativeIrpefAtBracketStart + (taxableAtFrom - b.from) * b.rate) -
				surtaxRate * taxableAtFrom;
			// gross che produce targetNet: g = inpsSeg.from + (targetNet - netAtInpsFrom)/slope
			if (Math.abs(slope) < 1e-12) {
				// Aliquota effettiva 100%: impossibile, salto
				cumulativeIrpefAtBracketStart += (b.to - b.from) * b.rate;
				continue;
			}
			const candidate = inpsSeg.from + (targetNet - netAtInpsFrom) / slope;
			// Validazione: candidate deve cadere in entrambi i segmenti
			const taxableAtCandidate = taxableAtFrom + (candidate - inpsSeg.from) * taxableSlope;
			if (
				candidate >= inpsSeg.from - 1e-6 &&
				candidate <= inpsSeg.to + 1e-6 &&
				taxableAtCandidate >= b.from - 1e-6 &&
				(b.to === Number.POSITIVE_INFINITY || taxableAtCandidate <= b.to + 1e-6)
			) {
				return Math.max(0, Math.round(candidate * 100) / 100);
			}
			cumulativeIrpefAtBracketStart +=
				(b.to === Number.POSITIVE_INFINITY ? 0 : (b.to - b.from) * b.rate);
		}
		cumulativeInpsAtSegStart +=
			(inpsSeg.to === Number.POSITIVE_INFINITY ? 0 : (inpsSeg.to - inpsSeg.from) * inpsSeg.rate);
	}

	// Fallback: se nessuno scaglione ha matchato (non dovrebbe accadere) torna
	// una stima conservativa con un'aliquota effettiva del 30%
	return Math.round((targetNet / 0.7) * 100) / 100;
}
