/**
 * Regole italiane di liquidabilita' anticipata del TFR (art. 2120 c.c.)
 * e scelte sulla destinazione (azienda vs fondo pensione complementare).
 *
 * La possibilita' di chiedere un'anticipazione e' un aspetto spesso
 * sottovalutato dai planner FIRE: rende il TFR in azienda meno illiquido di
 * quanto sembri, a determinate condizioni.
 */

/** Motivi ammessi per l'anticipazione TFR */
export type TFRAnticipationReason =
	| 'medical'        // spese sanitarie straordinarie
	| 'firstHome'      // acquisto prima casa (per se' o per i figli)
	| 'renovation'     // ristrutturazione prima casa
	| 'parentalLeave'  // congedo parentale
	| 'education';     // spese formative (training professionale)

/** Requisiti per avere diritto all'anticipazione */
export interface TFRAnticipationEligibility {
	/** Il dipendente ha diritto a richiederla */
	eligible: boolean;
	/** Percentuale massima richiedibile del TFR maturato */
	maxPercentage: number;
	/** Importo massimo richiedibile dato il TFR attuale */
	maxAmount: number;
	/** Motivazione della decisione */
	reason: string;
	/** Tassazione applicata all'anticipazione (aliquota stimata) */
	expectedTaxRate: number;
}

/**
 * Valuta se un dipendente ha diritto all'anticipazione TFR e per quale
 * importo, dato il motivo e l'anzianita'.
 *
 * Regole dell'art. 2120 c.c.:
 * - Anzianita' minima: 8 anni nello stesso datore di lavoro
 * - Massimo una volta nel corso del rapporto di lavoro
 * - Richiedibile fino al 70% del TFR maturato
 * - Aziende con > 25 dipendenti: 10% degli aventi diritto per anno
 * - Per spese mediche straordinarie alcune aziende/CCNL consentono deroghe
 *   (anzianita' piu' breve, percentuali maggiori)
 *
 * Tassazione dell'anticipazione:
 * - Stesso regime del TFR a fine rapporto: tassazione separata con aliquota
 *   media IRPEF degli ultimi 5 anni. Approssimiamo come marginalIRPEF * 0.85.
 * - Per spese mediche e prima casa l'anticipazione gode dello stesso
 *   trattamento ma la finalita' non cambia l'aliquota.
 *
 * @param currentYearsOfService - Anni di anzianita' nel rapporto corrente
 * @param tfrAccrued - TFR maturato ad oggi
 * @param reason - Motivo dell'anticipazione
 * @param marginalIRPEF - Aliquota IRPEF marginale per stima tasse (0.35 = 35%)
 * @param hasAlreadyRequested - L'utente ha gia' richiesto un'anticipazione in passato
 */
export function checkTFRAnticipationEligibility(
	currentYearsOfService: number,
	tfrAccrued: number,
	reason: TFRAnticipationReason,
	marginalIRPEF: number = 0.27,
	hasAlreadyRequested: boolean = false
): TFRAnticipationEligibility {
	if (hasAlreadyRequested) {
		return {
			eligible: false,
			maxPercentage: 0,
			maxAmount: 0,
			reason: 'Gia\' richiesta una volta: l\'anticipazione TFR e\' ammessa una sola volta nel corso del rapporto di lavoro.',
			expectedTaxRate: 0
		};
	}

	if (currentYearsOfService < 8) {
		return {
			eligible: false,
			maxPercentage: 0,
			maxAmount: 0,
			reason: `Servono almeno 8 anni di anzianita' nel rapporto (attuali: ${currentYearsOfService}). Alcuni CCNL consentono deroghe per spese mediche.`,
			expectedTaxRate: 0
		};
	}

	if (tfrAccrued <= 0) {
		return {
			eligible: false,
			maxPercentage: 0,
			maxAmount: 0,
			reason: 'TFR maturato insufficiente.',
			expectedTaxRate: 0
		};
	}

	const maxPercentage = 0.70;
	const maxAmount = Math.round(tfrAccrued * maxPercentage);
	const expectedTaxRate = Math.max(0.15, Math.min(0.43, marginalIRPEF * 0.85));

	const reasonLabels: Record<TFRAnticipationReason, string> = {
		medical: 'spese sanitarie straordinarie',
		firstHome: 'acquisto prima casa (propria o dei figli)',
		renovation: 'ristrutturazione prima casa',
		parentalLeave: 'congedo parentale',
		education: 'spese formative'
	};

	return {
		eligible: true,
		maxPercentage,
		maxAmount,
		reason: `Richiedibile fino al ${(maxPercentage * 100).toFixed(0)}% del TFR maturato per ${reasonLabels[reason]}. L\'azienda puo\' applicare limiti annui se > 25 dipendenti.`,
		expectedTaxRate
	};
}

/** Confronto tra destinare il TFR in azienda o al fondo pensione */
export interface TFRDestinationComparison {
	/** Valore finale netto del TFR in azienda */
	inCompanyNet: number;
	/** Valore finale netto del TFR destinato a fondo pensione */
	inPensionFundNet: number;
	/** Vantaggio in euro (positivo = fondo pensione conviene) */
	advantagePensionFund: number;
	/** Rendimento medio annualizzato TFR in azienda */
	companyAnnualReturn: number;
	/** Rendimento medio annualizzato fondo pensione */
	pensionFundAnnualReturn: number;
	/** Raccomandazione testuale */
	recommendation: string;
}

/**
 * Confronta le due destinazioni possibili del TFR (D.Lgs. 252/2005):
 * - In azienda: rivalutato all'1.5% + 75% inflazione, tassato all'uscita
 *   con aliquota separata media IRPEF
 * - Al fondo pensione: rendimento del comparto selezionato, tassato 20%
 *   sui rendimenti annualmente + 15%-9% sui contributi alla prestazione
 *
 * Per contributi annui fissi (contributionMonthly * 12) su N anni.
 *
 * @param contributionAnnual - Quota TFR annua (circa stipendio / 13.5)
 * @param years - Anni di accumulo
 * @param inflation - Inflazione annua attesa (0.02 = 2%)
 * @param pensionFundReturn - Rendimento atteso netto di commissioni del comparto FP
 * @param marginalIRPEF - Aliquota IRPEF marginale del dipendente (0.35 = 35%)
 */
export function compareTFRDestination(
	contributionAnnual: number,
	years: number,
	inflation: number,
	pensionFundReturn: number,
	marginalIRPEF: number
): TFRDestinationComparison {
	// --- TFR in azienda ---
	const companyRate = 0.015 + 0.75 * inflation;
	let companyFV = 0;
	for (let i = 0; i < years; i++) {
		companyFV = companyFV * (1 + companyRate) + contributionAnnual;
	}
	const companyTaxRate = Math.max(0.15, Math.min(0.43, marginalIRPEF * 0.85));
	const companyTax = companyFV * companyTaxRate;
	const companyNet = companyFV - companyTax;

	// --- TFR in fondo pensione ---
	// Rendimenti tassati al 20% annualmente
	const fundNetReturn = pensionFundReturn * (1 - 0.20);
	let fundFV = 0;
	for (let i = 0; i < years; i++) {
		fundFV = fundFV * (1 + fundNetReturn) + contributionAnnual;
	}
	// Alla prestazione: tassazione 15% sui contributi, riduzione 0.3% per anno >15 fino a 9%
	const benefitTax = Math.max(0.09, 0.15 - Math.max(0, years - 15) * 0.003);
	const contributionsTotal = contributionAnnual * years;
	const taxableFraction = fundFV > 0 ? contributionsTotal / fundFV : 1;
	const fundTaxOnExit = fundFV * taxableFraction * benefitTax;
	const fundNet = fundFV - fundTaxOnExit;

	const advantagePensionFund = fundNet - companyNet;

	// Rendimenti annualizzati
	const totalContrib = contributionAnnual * years;
	const companyAnnualReturn = totalContrib > 0 && years > 0
		? Math.pow(companyNet / totalContrib, 1 / years) - 1
		: 0;
	const pensionFundAnnualReturn = totalContrib > 0 && years > 0
		? Math.pow(fundNet / totalContrib, 1 / years) - 1
		: 0;

	const recommendation = advantagePensionFund > 0
		? `Fondo pensione preferibile di ${Math.round(advantagePensionFund)} € (ipotesi: rendimento FP ${(pensionFundReturn * 100).toFixed(1)}% vs TFR ${(companyRate * 100).toFixed(1)}%).`
		: `TFR in azienda preferibile di ${Math.round(-advantagePensionFund)} € (rendimento FP atteso non sufficiente a compensare il rischio).`;

	return {
		inCompanyNet: Math.round(companyNet),
		inPensionFundNet: Math.round(fundNet),
		advantagePensionFund: Math.round(advantagePensionFund),
		companyAnnualReturn: Math.round(companyAnnualReturn * 10000) / 10000,
		pensionFundAnnualReturn: Math.round(pensionFundAnnualReturn * 10000) / 10000,
		recommendation
	};
}
