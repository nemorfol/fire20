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

/** Grado di parentela del beneficiario, per l'imposta di successione. */
export type SuccessionRelationship = 'spouse-direct' | 'siblings' | 'other-relatives' | 'unrelated';

/**
 * Imposta di successione italiana (D.Lgs. 346/1990). Franchigie e aliquote
 * verificate (Agenzia delle Entrate, vigenti 2025/2026):
 * - coniuge e parenti in linea retta (figli, genitori): franchigia 1.000.000€
 *   ciascuno, 4% sull'eccedenza;
 * - fratelli/sorelle: franchigia 100.000€, 6%;
 * - altri parenti fino al 4° grado / affini fino al 3°: 6%, nessuna franchigia;
 * - altri soggetti (estranei): 8%, nessuna franchigia.
 * (Imposte ipotecaria/catastale su immobili - 2%+1% - non incluse qui.)
 *
 * @param amount - Valore ereditato lordo dal singolo beneficiario
 * @param relationship - Grado di parentela (default coniuge/linea retta)
 * @returns Imposta di successione dovuta
 */
export function calculateSuccessionTax(
	amount: number,
	relationship: SuccessionRelationship = 'spouse-direct'
): number {
	if (amount <= 0) return 0;
	let franchigia = 0;
	let rate = 0;
	switch (relationship) {
		case 'spouse-direct':
			franchigia = 1_000_000;
			rate = 0.04;
			break;
		case 'siblings':
			franchigia = 100_000;
			rate = 0.06;
			break;
		case 'other-relatives':
			franchigia = 0;
			rate = 0.06;
			break;
		case 'unrelated':
			franchigia = 0;
			rate = 0.08;
			break;
	}
	const taxable = Math.max(0, amount - franchigia);
	return Math.round(taxable * rate * 100) / 100;
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
 * - La compensazione e' possibile solo tra "redditi diversi": le PLUSVALENZE
 *   da azioni singole, obbligazioni e certificati sono redditi diversi e quindi
 *   compensabili con minusvalenze pregresse. Le plusvalenze da fondi comuni /
 *   ETF armonizzati sono invece "redditi di capitale" e NON sono compensabili
 *   (le relative minus, al contrario, restano redditi diversi compensabili con
 *   altri redditi diversi). Qui per assetType 'etf' la compensazione e' bloccata.
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

	// ETF/fondi armonizzati: la PLUSVALENZA e' reddito di capitale e non e'
	// compensabile con lo stock di minusvalenze (redditi diversi). Le minus
	// restano nello stock (non vengono consumate) per usi futuri ammessi.
	const isRedditoDiCapitale = assetType === 'etf';

	let remainingGain = grossGain;
	let lossUsed = 0;
	if (!isRedditoDiCapitale) {
		for (const l of valid) {
			if (remainingGain <= 0) break;
			const use = Math.min(l.remaining, remainingGain);
			l.remaining -= use;
			remainingGain -= use;
			lossUsed += use;
		}
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
 * - Dipendente (post-1995): 9.19% fino alla prima fascia (~56.224€ nel 2026),
 *   10.19% tra prima fascia e massimale (~122.295€), 0 oltre il massimale
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

	const { massimale, primaFascia, employeeBase, employeeAdditional, parasubordinato, autonomo } =
		assumptions.inps;

	if (contractType === 'dipendente') {
		// Iscritto post-1995: base fino alla prima fascia, base+1% tra prima fascia
		// e massimale, nulla oltre il massimale.
		const capped = Math.min(grossIncome, massimale);
		const quotaBase = Math.min(capped, primaFascia) * employeeBase;
		const quotaSuperiore = Math.max(0, capped - primaFascia) * (employeeBase + employeeAdditional);
		return Math.round((quotaBase + quotaSuperiore) * 100) / 100;
	}

	// Gestione separata (parasubordinato/autonomo): aliquota costante, base
	// contributiva cappata al massimale (oltre non si versa).
	const rate = contractType === 'parasubordinato' ? parasubordinato : autonomo;
	return Math.round(Math.min(grossIncome, massimale) * rate * 100) / 100;
}

/** Breakdown della busta paga annuale stimata */
export interface NetSalaryBreakdown {
	gross: number;
	inpsContribution: number;
	/** IRPEF NETTA, cioe' al netto delle detrazioni da lavoro dipendente. */
	irpef: number;
	regionalTax: number;
	municipalTax: number;
	totalTax: number;
	net: number;
	/** Aliquota effettiva totale (fiscale + previdenziale) su gross */
	effectiveRate: number;
	/** IRPEF lorda prima delle detrazioni (per trasparenza/breakdown). */
	irpefLorda?: number;
	/** Detrazioni da lavoro dipendente applicate (art.13 + ulteriore cuneo). */
	detrazioni?: number;
	/** Somma integrativa "cuneo" (bonus non tassato, aggiunto al netto). */
	bonusCuneo?: number;
}

/** Detrazioni/bonus per lavoro dipendente (art.13 TUIR + cuneo fiscale 2026). */
export interface EmployeeReliefResult {
	/** Detrazione per lavoro dipendente, art.13 co.1 TUIR. */
	detrazioneLavoroDipendente: number;
	/** Ulteriore detrazione "cuneo" per redditi 20.000-40.000 (riduce l'IRPEF). */
	ulterioreDetrazione: number;
	/** Somma integrativa "cuneo" per redditi <=20.000 (bonus non tassato). */
	sommaIntegrativa: number;
}

/**
 * Detrazioni e bonus per lavoro dipendente vigenti nel 2026.
 *
 * Fonti verificate:
 * - Detrazione lavoro dipendente, art.13 co.1 TUIR (riforma 2024, confermata):
 *     RC<=15.000        -> 1.955
 *     15.000<RC<=28.000 -> 1.910 + 1.190*(28.000-RC)/13.000  (+65 se RC>25.000)
 *     28.000<RC<=50.000 -> 1.910*(50.000-RC)/22.000          (+65 se RC<=35.000)
 *     RC>50.000         -> 0
 *   (la "discontinuita'" a 15.000, da 1.955 a ~3.100, e' prevista dalla legge).
 * - Riduzione cuneo fiscale 2025/2026 (resa strutturale):
 *     somma integrativa (bonus NON tassato) per RC<=20.000, % del reddito da
 *       lavoro: 7,1% (RC<=8.500), 5,3% (8.500-15.000), 4,8% (15.000-20.000);
 *     ulteriore detrazione per 20.000<RC<=40.000: 1.000 fino a 32.000, poi
 *       1.000*(40.000-RC)/8.000 da 32.000 a 40.000.
 *
 * @param redditoComplessivo - Reddito complessivo IRPEF (per un dipendente ~ imponibile)
 * @param redditoLavoro - Reddito da lavoro dipendente (base della somma integrativa)
 */
export function calculateEmployeeRelief(
	redditoComplessivo: number,
	redditoLavoro: number
): EmployeeReliefResult {
	const rc = Math.max(0, redditoComplessivo);
	const rl = Math.max(0, redditoLavoro);

	// Detrazione art.13 co.1 TUIR
	let det = 0;
	if (rc <= 15000) det = 1955;
	else if (rc <= 28000) det = 1910 + (1190 * (28000 - rc)) / 13000 + (rc > 25000 ? 65 : 0);
	else if (rc <= 50000) det = (1910 * (50000 - rc)) / 22000 + (rc <= 35000 ? 65 : 0);
	else det = 0;

	// Ulteriore detrazione "cuneo" (20.000-40.000)
	let ult = 0;
	if (rc > 20000 && rc <= 32000) ult = 1000;
	else if (rc > 32000 && rc <= 40000) ult = (1000 * (40000 - rc)) / 8000;

	// Somma integrativa "cuneo" (RC<=20.000), bonus non tassato sul reddito da lavoro
	let somma = 0;
	if (rc <= 20000) {
		const pct = rc <= 8500 ? 0.071 : rc <= 15000 ? 0.053 : 0.048;
		somma = rl * pct;
	}

	return {
		detrazioneLavoroDipendente: Math.round(Math.max(0, det) * 100) / 100,
		ulterioreDetrazione: Math.round(Math.max(0, ult) * 100) / 100,
		sommaIntegrativa: Math.round(Math.max(0, somma) * 100) / 100
	};
}

/**
 * Calcolo netto in busta paga (annuo) per il 2026.
 *
 * net = gross - INPS lavoratore - IRPEF NETTA - addizionali + somma integrativa
 * dove IRPEF netta = max(0, IRPEF lorda - detrazioni lavoro dipendente).
 *
 * Le detrazioni e il bonus "cuneo" si applicano SOLO al lavoro dipendente
 * (calculateEmployeeRelief); per autonomo/parasubordinato si usa la sola IRPEF
 * lorda (per l'autonomo il regime tipico e' il forfettario, gestito a parte).
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
			municipalTax: 0, totalTax: 0, net: 0, effectiveRate: 0,
			irpefLorda: 0, detrazioni: 0, bonusCuneo: 0
		};
	}
	const round2 = (x: number) => Math.round(x * 100) / 100;
	const inps = calculateInpsWorkerContribution(grossIncome, contractType, assumptions);
	const taxable = Math.max(0, grossIncome - inps);
	const irpefLorda = calculateIRPEF(taxable, assumptions).tax;

	let detrazioni = 0;
	let bonus = 0;
	if (contractType === 'dipendente') {
		const relief = calculateEmployeeRelief(taxable, taxable);
		detrazioni = relief.detrazioneLavoroDipendente + relief.ulterioreDetrazione;
		bonus = relief.sommaIntegrativa;
	}

	const irpefNetta = Math.max(0, irpefLorda - detrazioni);
	const regional = taxable * regionalRate;
	const municipal = taxable * municipalRate;
	const totalTax = irpefNetta + regional + municipal;
	const net = Math.max(0, grossIncome - inps - totalTax + bonus);

	return {
		gross: grossIncome,
		inpsContribution: round2(inps),
		irpef: round2(irpefNetta),
		regionalTax: round2(regional),
		municipalTax: round2(municipal),
		totalTax: round2(totalTax),
		net: round2(net),
		// Carico effettivo = quota di lordo che NON arriva netta (al netto del bonus).
		effectiveRate: (grossIncome - net) / grossIncome,
		irpefLorda: round2(irpefLorda),
		detrazioni: round2(detrazioni),
		bonusCuneo: round2(bonus)
	};
}

/**
 * Inverte la busta paga: dato un netto target restituisce il lordo annuo che
 * lo produce. Dal 2026 il netto dipende anche dalle detrazioni da lavoro
 * dipendente e dal "cuneo" (somma integrativa / ulteriore detrazione), che
 * rendono net(gross) piecewise-lineare ma NON affine globalmente. Usiamo quindi
 * un risolutore NUMERICO per bisezione su calculateNetSalary: cosi' l'inverso e'
 * sempre CONSISTENTE col calcolo forward (non puo' divergere). net(gross) e'
 * monotona crescente; le piccole discontinuita' di legge (soglie del cuneo a
 * redditi bassi) introducono errori trascurabili.
 *
 * @param targetNet - Netto annuale desiderato
 * @returns Reddito lordo annuo che produce circa targetNet
 */
export function invertNetSalary(
	targetNet: number,
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato' = 'dipendente',
	regionalRate: number = DEFAULT_2026.surtaxes.regional,
	municipalRate: number = DEFAULT_2026.surtaxes.municipal,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	if (targetNet <= 0) return 0;
	const netOf = (g: number) =>
		calculateNetSalary(g, contractType, regionalRate, municipalRate, assumptions).net;
	// net(g) e' crescente e net < gross: il lordo cercato sta in (targetNet, hi].
	let lo = targetNet;
	let hi = targetNet * 1.6 + 20000;
	let guard = 0;
	while (netOf(hi) < targetNet && guard < 200) {
		hi *= 1.5;
		guard++;
	}
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (netOf(mid) < targetNet) lo = mid;
		else hi = mid;
	}
	return Math.round(((lo + hi) / 2) * 100) / 100;
}
