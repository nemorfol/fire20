/**
 * Fondo pensione complementare come asset DIFFERITO e RITA (Rendita Integrativa
 * Temporanea Anticipata).
 *
 * Il montante del fondo pensione non e' prelevabile con la regola del 4%: cresce
 * separatamente e diventa disponibile solo
 *  - come RITA, dopo la cessazione dell'attivita' lavorativa, negli anni che
 *    precedono la pensione di vecchiaia;
 *  - oppure come prestazione pensionistica al raggiungimento dei requisiti del
 *    regime obbligatorio (eta' di vecchiaia).
 *
 * Fonti normative:
 *  - D.Lgs. 252/2005, art. 11, commi 4-4-quinquies (RITA), come riscritti dalla
 *    L. 205/2017 (Legge di Bilancio 2018), art. 1, c. 168:
 *      Caso 1: cessazione dell'attivita' lavorativa, eta' di vecchiaia entro 5
 *              anni, almeno 20 anni di contributi nei regimi obbligatori;
 *      Caso 2: inoccupazione superiore a 24 mesi, eta' di vecchiaia entro 10 anni.
 *      In entrambi i casi servono almeno 5 anni di partecipazione alla
 *      previdenza complementare.
 *  - D.Lgs. 252/2005, art. 11, c. 4-ter e c. 6: ritenuta a titolo d'imposta del
 *    15%, ridotta di 0,30 punti per ogni anno di partecipazione oltre il 15°,
 *    fino a un minimo del 9% (parametri in `assumptions.pensionFund`).
 *  - D.Lgs. 252/2005, art. 11, c. 3: la prestazione puo' essere liquidata in
 *    capitale fino al 50% del montante; il resto in rendita. L'innalzamento al
 *    60% previsto dalla L. 199/2025 (Bilancio 2026) e' stato soppresso dall'art.
 *    16-ter della L. 112/2026 (conversione del D.L. 62/2026): resta il 50%.
 *
 * Semplificazioni dichiarate (conservative salvo dove indicato):
 *  - la ritenuta si applica all'intera rata, mentre per legge la base imponibile
 *    esclude i rendimenti gia' tassati nel fondo e i contributi non dedotti;
 *  - non si modella il risparmio IRPEF dei contributi deducibili;
 *  - il requisito dei 5 anni di partecipazione si assume soddisfatto (il profilo
 *    non registra la data di adesione);
 *  - la RITA usa tutto il montante; la rata annua e' "capitale residuo / rate
 *    residue" con il residuo che resta investito (prassi dei fondi);
 *  - la rendita della prestazione e' approssimata con una rata certa reale fino
 *    all'aspettativa di vita (nessun coefficiente attuariale del fondo).
 *
 * Tutti gli importi sono in euro di OGGI (reali). Convenzione eta': la riga di
 * eta' `a` corrisponde all'anno in cui l'utente compie `a` anni, come in
 * `projectPortfolio` (l'ultimo anno di lavoro e' quello di eta' = retirementAge).
 */

import { DEFAULT_2026, type AssumptionSet } from './assumptions';

export interface PensionFundInput {
	/** Montante attuale del fondo (euro di oggi) */
	balance: number;
	/** Versamento annuo al fondo finche' si lavora (euro di oggi) */
	annualContribution: number;
	/** Rendimento reale del fondo, al netto della tassazione interna (20%) */
	realNetReturn: number;
	currentAge: number;
	/** Eta' di cessazione del lavoro (FIRE) */
	retirementAge: number;
	/** Eta' di accesso alla pensione di vecchiaia */
	pensionAge: number;
	/** Aspettativa di vita (orizzonte della rendita della prestazione) */
	lifeExpectancy: number;
	/** Anni di contributi nei regimi obbligatori maturati al FIRE (requisito Caso 1) */
	inpsContributionYearsAtFire: number;
	/**
	 * Anni di partecipazione alla previdenza complementare all'inizio delle
	 * erogazioni. Se omesso si applica l'aliquota piena del 15% (prudenziale).
	 */
	participationYears?: number;
	/** Se false niente RITA: il montante resta nel fondo fino alla prestazione */
	ritaEnabled?: boolean;
	assumptions?: AssumptionSet;
}

export interface PensionFundPlan {
	/** 'rita' = rendita anticipata; 'prestazione' = liquidazione a pensionAge; 'none' = fondo vuoto */
	mode: 'rita' | 'prestazione' | 'none';
	/** Caso RITA applicato (1 o 2), null se non c'e' RITA */
	ritaCase: 1 | 2 | null;
	/** Prima eta' con erogazione (RITA o prestazione); null se nessuna */
	startAge: number | null;
	/** Ultima eta' con RITA (pensionAge - 1); null se non c'e' RITA */
	ritaEndAge: number | null;
	/** Aliquota della ritenuta applicata */
	taxRate: number;
	/** Montante all'inizio delle erogazioni (euro di oggi) */
	balanceAtStart: number;
	/** Rata RITA netta media annua (euro di oggi); 0 se non c'e' RITA */
	ritaAnnualNet: number;
	/** Flussi netti incassati dal fondo per eta' (euro di oggi) */
	incomeByAge: Record<number, number>;
	/** Montante a fine anno per eta' (euro di oggi), dopo eventuali erogazioni */
	balanceByAge: Record<number, number>;
}

/** Aliquota della ritenuta su RITA e prestazioni (art. 11, c. 6, D.Lgs. 252/2005) */
export function pensionFundBenefitTaxRate(
	participationYears: number | undefined,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	const { benefitTaxBase, benefitTaxReductionPerYear, benefitTaxFloor } = assumptions.pensionFund;
	if (participationYears === undefined) return benefitTaxBase;
	const reduction = benefitTaxReductionPerYear * Math.max(0, Math.floor(participationYears) - 15);
	return Math.max(benefitTaxFloor, benefitTaxBase - reduction);
}

/**
 * Prima eta' utile per la RITA, o null se non accessibile prima della pensione.
 * Il primo anno senza lavoro e' retirementAge + 1; il Caso 2 richiede piu' di
 * 24 mesi di inoccupazione, quindi parte dal terzo anno (retirementAge + 3).
 */
export function ritaEligibility(
	retirementAge: number,
	pensionAge: number,
	inpsContributionYearsAtFire: number
): { case: 1 | 2; startAge: number } | null {
	const options: { case: 1 | 2; startAge: number }[] = [];
	if (inpsContributionYearsAtFire >= 20) {
		options.push({ case: 1, startAge: Math.max(retirementAge + 1, pensionAge - 5) });
	}
	options.push({ case: 2, startAge: Math.max(retirementAge + 3, pensionAge - 10) });
	const valid = options.filter((o) => o.startAge < pensionAge);
	if (valid.length === 0) return null;
	// Caso piu' favorevole = erogazione piu' anticipata (a parita', Caso 1)
	valid.sort((a, b) => a.startAge - b.startAge || a.case - b.case);
	return valid[0];
}

/** Piano del fondo pensione: crescita differita, RITA o prestazione a pensionAge */
export function planPensionFund(input: PensionFundInput): PensionFundPlan {
	const {
		balance,
		annualContribution,
		realNetReturn: r,
		currentAge,
		retirementAge,
		pensionAge,
		lifeExpectancy,
		inpsContributionYearsAtFire,
		participationYears,
		ritaEnabled = true,
		assumptions = DEFAULT_2026
	} = input;

	const empty: PensionFundPlan = {
		mode: 'none',
		ritaCase: null,
		startAge: null,
		ritaEndAge: null,
		taxRate: 0,
		balanceAtStart: 0,
		ritaAnnualNet: 0,
		incomeByAge: {},
		balanceByAge: {}
	};
	const contribution = Math.max(0, annualContribution || 0);
	if ((balance || 0) <= 0 && contribution <= 0) return empty;

	const taxRate = pensionFundBenefitTaxRate(participationYears, assumptions);
	const eligibility = ritaEnabled
		? ritaEligibility(retirementAge, pensionAge, inpsContributionYearsAtFire)
		: null;
	const incomeByAge: Record<number, number> = {};
	const balanceByAge: Record<number, number> = {};

	let fund = Math.max(0, balance || 0);
	let balanceAtStart = 0;
	let ritaGrossTotal = 0;
	let ritaYears = 0;
	// Rendita della prestazione (meta' del montante), fissata a pensionAge
	let annuityGross = 0;

	for (let age = currentAge + 1; age <= lifeExpectancy; age++) {
		fund *= 1 + r;
		// Versamenti finche' si lavora, non oltre la prestazione
		if (age <= Math.min(retirementAge, pensionAge)) fund += contribution;

		if (eligibility && age >= eligibility.startAge && age < pensionAge) {
			if (age === eligibility.startAge) balanceAtStart = fund;
			const payment = fund / (pensionAge - age);
			fund -= payment;
			ritaGrossTotal += payment;
			ritaYears++;
			incomeByAge[age] = payment * (1 - taxRate);
		} else if (age === pensionAge && fund > 0) {
			// Prestazione: 50% in capitale, 50% in rendita (rata certa reale fino a lifeExpectancy)
			if (!eligibility) balanceAtStart = fund;
			const capital = fund * 0.5;
			const n = Math.max(1, lifeExpectancy - pensionAge + 1);
			const annuityBase = fund - capital;
			annuityGross =
				Math.abs(r) < 1e-9
					? annuityBase / n
					: (annuityBase * r) / ((1 + r) * (1 - Math.pow(1 + r, -n)));
			fund = 0;
			incomeByAge[age] = (capital + annuityGross) * (1 - taxRate);
		} else if (age > pensionAge && annuityGross > 0) {
			incomeByAge[age] = annuityGross * (1 - taxRate);
		}
		balanceByAge[age] = fund;
	}

	const hasRita = eligibility !== null && ritaYears > 0;
	const firstIncomeAge = Object.keys(incomeByAge)
		.map(Number)
		.sort((a, b) => a - b)[0];
	return {
		mode: hasRita ? 'rita' : firstIncomeAge !== undefined ? 'prestazione' : 'none',
		ritaCase: hasRita ? eligibility!.case : null,
		startAge: firstIncomeAge ?? null,
		ritaEndAge: hasRita ? pensionAge - 1 : null,
		taxRate,
		balanceAtStart,
		ritaAnnualNet: hasRita ? (ritaGrossTotal * (1 - taxRate)) / ritaYears : 0,
		incomeByAge,
		balanceByAge
	};
}

/**
 * Valore attuale, all'eta' di FIRE, dei flussi del fondo pensione incassati
 * DOPO il FIRE (euro di oggi, sconto al rendimento reale del portafoglio).
 * Convenzione coerente con `calculateFireNumberWithPension`: il primo anno di
 * FIRE (eta' retirementAge + 1) e' scontato di un periodo.
 */
export function pensionFundIncomePV(
	incomeByAge: Record<number, number>,
	retirementAge: number,
	realReturn: number
): number {
	let pv = 0;
	for (const [k, amount] of Object.entries(incomeByAge)) {
		const age = Number(k);
		if (age <= retirementAge || amount <= 0) continue;
		pv += amount / Math.pow(1 + realReturn, age - retirementAge);
	}
	return pv;
}

/** Campi del profilo che servono a costruire il piano del fondo pensione */
export interface PensionFundProfileData {
	portfolio: { pensionFund?: number };
	monthlyContributions: { pensionFund?: number };
	pension?: { contributionYears?: number };
}

/**
 * Costruisce il piano del fondo pensione a partire dal profilo. Il rendimento
 * del fondo e' il rendimento nominale atteso del portafoglio tassato al 20%
 * (tassazione annua interna, art. 17 D.Lgs. 252/2005) e deflazionato.
 */
export function pensionFundPlanFromProfile(
	p: PensionFundProfileData,
	opts: {
		currentAge: number;
		retirementAge: number;
		pensionAge: number;
		lifeExpectancy: number;
		/** Rendimento nominale lordo atteso (decimale) */
		nominalReturn: number;
		/** Inflazione attesa (decimale) */
		inflationRate: number;
		ritaEnabled?: boolean;
		assumptions?: AssumptionSet;
	}
): PensionFundPlan {
	const assumptions = opts.assumptions ?? DEFAULT_2026;
	const netNominal = opts.nominalReturn * (1 - assumptions.pensionFund.returnTaxRate);
	return planPensionFund({
		balance: p.portfolio.pensionFund ?? 0,
		annualContribution: (p.monthlyContributions.pensionFund ?? 0) * 12,
		realNetReturn: (1 + netNominal) / (1 + opts.inflationRate) - 1,
		currentAge: opts.currentAge,
		retirementAge: opts.retirementAge,
		pensionAge: opts.pensionAge,
		lifeExpectancy: opts.lifeExpectancy,
		inpsContributionYearsAtFire:
			(p.pension?.contributionYears ?? 0) + Math.max(0, opts.retirementAge - opts.currentAge),
		ritaEnabled: opts.ritaEnabled,
		assumptions
	});
}
