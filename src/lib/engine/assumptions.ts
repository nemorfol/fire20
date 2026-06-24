/**
 * Sistema di "Assumption Set": rende esplicite TUTTE le ipotesi normative e
 * fiscali usate dal motore (aliquote IRPEF, addizionali, capital gain, bollo
 * titoli, IVAFE, INPS, fondo pensione, cedolare secca, ecc.). L'utente puo'
 * scegliere tra preset diversi o creare un set custom: cosi' il calcolatore
 * smette di essere "black box" e ogni numero diventa verificabile.
 *
 * Filosofia: il motore deve poter ricevere un AssumptionSet e applicarlo
 * coerentemente. I valori di default rispecchiano la normativa 2026.
 */

/** Scaglione IRPEF: imposta = aliquota su (min(income, to) - from) */
export interface IRPEFBracketDef {
	from: number;
	to: number; // Number.POSITIVE_INFINITY per ultimo scaglione
	rate: number;
}

/** Aliquote di imposta sui redditi finanziari */
export interface CapitalIncomeRates {
	/** Capital gain su azioni / ETF / fondi / corporate bond */
	stocksAndEtf: number;
	/** Capital gain e cedole su titoli di stato italiani e equiparati (white list) */
	governmentBonds: number;
	/** Cedolare secca affitti (regime sostitutivo) */
	cedolareSecca: number;
	/** Bollo titoli annuo su deposito titoli (% sul controvalore) */
	stampDuty: number;
	/** IVAFE: imposta su attivita' finanziarie all'estero (% annuo) */
	ivafe: number;
	/** Imposta di bollo su conto corrente (forfait annuo) — solo se giacenza > 5000€ */
	stampDutyCash: number;
}

/** Aliquote contributive INPS lavoratore */
export interface INPSRates {
	/** Aliquota IVS a carico del lavoratore dipendente (~9,19%) */
	employeeBase: number;
	/** Aliquota aggiuntiva 1% (L.438/1992) sulla fascia oltre la prima fascia */
	employeeAdditional: number;
	/** Aliquota parasubordinato (1/3 a carico collaboratore) */
	parasubordinato: number;
	/** Aliquota autonomo gestione separata (referenza) */
	autonomo: number;
	/** Prima fascia di retribuzione: oltre questa scatta l'1% aggiuntivo */
	primaFascia: number;
	/** Massimale contributivo annuo (oltre: nessun versamento IVS, iscritti post-1995) */
	massimale: number;
}

/** Tassazione fondo pensione complementare */
export interface PensionFundRates {
	/** Deduzione massima annua sui contributi */
	maxDeduction: number;
	/** Deduzione extra "nuovi lavoratori post-2007" */
	extraDeduction: number;
	/** Aliquota tassazione rendimenti annui */
	returnTaxRate: number;
	/** Aliquota base prestazione finale (15%) */
	benefitTaxBase: number;
	/** Riduzione annua dopo il 15° anno (fino al minimo) */
	benefitTaxReductionPerYear: number;
	/** Aliquota minima prestazione (9%) */
	benefitTaxFloor: number;
}

/** Aliquote addizionali medie (regionale + comunale) */
export interface LocalSurtaxes {
	/** Addizionale regionale media nazionale */
	regional: number;
	/** Addizionale comunale media nazionale */
	municipal: number;
}

/** Parametri TFR */
export interface TFRRates {
	/** Coefficiente di accantonamento annuo: stipendio / divisor (default 13.5) */
	divisor: number;
	/** Componente fissa rivalutazione */
	revaluationFixed: number;
	/** Quota inflazione applicata in rivalutazione */
	revaluationInflationQuota: number;
}

/** Set completo di assunzioni normative/fiscali */
export interface AssumptionSet {
	/** Identificatore tecnico (es. "default-2026") */
	id: string;
	/** Etichetta visualizzata in UI */
	label: string;
	/** Anno fiscale di riferimento */
	year: number;
	/** Descrizione breve in italiano */
	description: string;
	/** Scaglioni IRPEF progressivi */
	irpefBrackets: IRPEFBracketDef[];
	/** Aliquote sui redditi di capitale e patrimoniali */
	capital: CapitalIncomeRates;
	/** Aliquote INPS */
	inps: INPSRates;
	/** Fondo pensione */
	pensionFund: PensionFundRates;
	/** Addizionali */
	surtaxes: LocalSurtaxes;
	/** TFR */
	tfr: TFRRates;
	/**
	 * Numero di anni di compensazione minusvalenze (anno di realizzo + N).
	 * Standard italiano: 4.
	 */
	capitalLossCompensationYears: number;
}

// ---------------------------------------------------------------------------
// Preset
// ---------------------------------------------------------------------------

/**
 * Preset di default 2026. Rispecchia la normativa vigente:
 * - IRPEF a 3 scaglioni (riforma 2024, confermata 2026)
 * - Capital gain 26% / 12.5% titoli di stato
 * - Bollo titoli 0.2% annuo, IVAFE 0.2% (asset finanziari esteri)
 * - INPS dipendente 9.19% fino al massimale (~122.295€ per il 2026, INPS circ. 6/2026)
 * - Fondo pensione: deduzione 5.300€ (Legge di Bilancio 2026), extra 2.650€
 *   per nuovi lavoratori post-2007. Rendimenti 20%, prestazione 15%→9%
 * - Cedolare secca 21% (canone libero) / 10% (canone concordato — non gestito qui)
 */
export const DEFAULT_2026: AssumptionSet = {
	id: 'default-2026',
	label: 'Normativa 2026 (default)',
	year: 2026,
	description:
		'Aliquote vigenti per il 2026: IRPEF a 3 scaglioni, capital gain 26%/12.5%, ' +
		'bollo titoli 0.2%, IVAFE 0.2%, fondo pensione con deduzione 5.300€ e extra ' +
		'2.650€ per nuovi lavoratori, prestazione 15%→9% in funzione degli anni di partecipazione.',
	irpefBrackets: [
		{ from: 0, to: 28000, rate: 0.23 },
		{ from: 28000, to: 50000, rate: 0.33 },
		{ from: 50000, to: Number.POSITIVE_INFINITY, rate: 0.43 }
	],
	capital: {
		stocksAndEtf: 0.26,
		governmentBonds: 0.125,
		cedolareSecca: 0.21,
		stampDuty: 0.002,
		ivafe: 0.002,
		stampDutyCash: 34.2
	},
	inps: {
		employeeBase: 0.0919,
		// Addizionale dell'1% esatto (art.3-ter L.438/1992) sulla fascia eccedente
		// la prima fascia: 9,19% + 1,00% = 10,19%.
		employeeAdditional: 0.01,
		parasubordinato: 0.1124,
		autonomo: 0.2623,
		// Prima fascia 2026: 56.224€ (oltre scatta l'1% aggiuntivo, L.438/1992).
		primaFascia: 56224,
		// Massimale contributivo 2026: 122.295€ (INPS circolare n.6 del 30/01/2026,
		// rivalutazione ISTAT; era 120.607€ nel 2025). Riguarda gli iscritti post-1995.
		massimale: 122295
	},
	pensionFund: {
		maxDeduction: 5300,
		extraDeduction: 2650,
		returnTaxRate: 0.2,
		benefitTaxBase: 0.15,
		benefitTaxReductionPerYear: 0.003,
		benefitTaxFloor: 0.09
	},
	surtaxes: {
		regional: 0.0173,
		municipal: 0.007
	},
	tfr: {
		divisor: 13.5,
		revaluationFixed: 0.015,
		revaluationInflationQuota: 0.75
	},
	capitalLossCompensationYears: 4
};

/**
 * Preset "pre-riforma 2024": utile per chi vuole verificare il calcolatore
 * contro proprio CUD storico, o per studi comparativi.
 */
export const PRE_RIFORMA_2023: AssumptionSet = {
	...DEFAULT_2026,
	id: 'pre-riforma-2023',
	label: 'Pre-riforma 2023 (4 scaglioni)',
	year: 2023,
	description:
		'Aliquote IRPEF in vigore fino al 2023 (4 scaglioni). Utile per confronti ' +
		'storici e verifiche con CUD vecchi. Deduzione fondo pensione 5.164,57€.',
	irpefBrackets: [
		{ from: 0, to: 15000, rate: 0.23 },
		{ from: 15000, to: 28000, rate: 0.25 },
		{ from: 28000, to: 50000, rate: 0.35 },
		{ from: 50000, to: Number.POSITIVE_INFINITY, rate: 0.43 }
	],
	pensionFund: {
		...DEFAULT_2026.pensionFund,
		maxDeduction: 5164.57,
		extraDeduction: 0
	}
};

/**
 * Preset "riforma ipotetica 2-aliquote": scenario stress / what-if politico
 * (flat tax progressiva al 23/33). Da considerare puramente speculativo.
 */
export const IPOTESI_FLAT_2027: AssumptionSet = {
	...DEFAULT_2026,
	id: 'ipotesi-flat-2027',
	label: 'Ipotesi flat tax 23/33 (speculativa)',
	year: 2027,
	description:
		'Scenario IPOTETICO con IRPEF a 2 aliquote 23%/33%. Non corrisponde ad ' +
		'alcuna norma vigente, va usato solo come stress test fiscale.',
	irpefBrackets: [
		{ from: 0, to: 50000, rate: 0.23 },
		{ from: 50000, to: Number.POSITIVE_INFINITY, rate: 0.33 }
	]
};

/** Tutti i preset disponibili in UI */
export const PRESET_ASSUMPTIONS: AssumptionSet[] = [
	DEFAULT_2026,
	PRE_RIFORMA_2023,
	IPOTESI_FLAT_2027
];

/** Restituisce un preset per id, o il default se non trovato */
export function getPreset(id: string | undefined | null): AssumptionSet {
	if (!id) return DEFAULT_2026;
	return PRESET_ASSUMPTIONS.find((p) => p.id === id) ?? DEFAULT_2026;
}

/**
 * Crea un set custom partendo da un preset base e applicando override.
 * I campi non specificati ereditano dal base. Lo usiamo per la "modalita'
 * custom" dell'AssumptionsPanel.
 */
export function customizeAssumptions(
	base: AssumptionSet,
	overrides: Partial<{
		irpefBrackets: IRPEFBracketDef[];
		capital: Partial<CapitalIncomeRates>;
		inps: Partial<INPSRates>;
		pensionFund: Partial<PensionFundRates>;
		surtaxes: Partial<LocalSurtaxes>;
		tfr: Partial<TFRRates>;
		capitalLossCompensationYears: number;
	}>
): AssumptionSet {
	return {
		id: 'custom',
		label: 'Personalizzato',
		year: base.year,
		description: 'Set personalizzato dall\'utente partendo da: ' + base.label,
		irpefBrackets: overrides.irpefBrackets ?? base.irpefBrackets,
		capital: { ...base.capital, ...(overrides.capital ?? {}) },
		inps: { ...base.inps, ...(overrides.inps ?? {}) },
		pensionFund: { ...base.pensionFund, ...(overrides.pensionFund ?? {}) },
		surtaxes: { ...base.surtaxes, ...(overrides.surtaxes ?? {}) },
		tfr: { ...base.tfr, ...(overrides.tfr ?? {}) },
		capitalLossCompensationYears:
			overrides.capitalLossCompensationYears ?? base.capitalLossCompensationYears
	};
}

// ---------------------------------------------------------------------------
// Coefficienti di trasformazione (montante contributivo -> pensione annua)
// ---------------------------------------------------------------------------
// FONTE UNICA per tutto il motore (pension-italy.ts e inps-simulator.ts li
// importano da qui per evitare copie divergenti).
//
// Biennio 2025-2026: Decreto Direttoriale Ministero del Lavoro/MEF del
// 20 novembre 2024, in vigore per le decorrenze 1/1/2025 - 31/12/2026.
// Mappa eta' intera -> coefficiente. Verificati col reciproco (il "divisore"
// di speranza di vita): es. 1/17,831 = 5,608% a 67 anni, 1/15,360 = 6,510% a 71.

/** Coefficienti di trasformazione 2025-2026 (DM 20/11/2024), eta' 57-71. */
export const TRANSFORMATION_COEFFICIENTS_2025_2026: ReadonlyArray<[number, number]> = [
	[57, 0.04204],
	[58, 0.04308],
	[59, 0.04419],
	[60, 0.04536],
	[61, 0.04661],
	[62, 0.04795],
	[63, 0.04936],
	[64, 0.05088],
	[65, 0.05250],
	[66, 0.05423],
	[67, 0.05608],
	[68, 0.05808],
	[69, 0.06024],
	[70, 0.06258],
	[71, 0.06510]
];

/**
 * Interpola (lineare) il coefficiente di trasformazione per un'eta'.
 * Sotto i 57 anni usa il valore a 57; sopra i 71 usa quello a 71 (la legge
 * non prevede coefficienti oltre tali estremi).
 *
 * @param age - Eta' di pensionamento
 * @param table - Tabella coefficienti (default: 2025-2026)
 * @returns Coefficiente di trasformazione (frazione, es. 0.05608)
 */
export function getTransformationCoefficient(
	age: number,
	table: ReadonlyArray<[number, number]> = TRANSFORMATION_COEFFICIENTS_2025_2026
): number {
	if (age <= table[0][0]) return table[0][1];
	const last = table[table.length - 1];
	if (age >= last[0]) return last[1];
	for (let i = 0; i < table.length - 1; i++) {
		const [age1, coeff1] = table[i];
		const [age2, coeff2] = table[i + 1];
		if (age >= age1 && age < age2) {
			const fraction = (age - age1) / (age2 - age1);
			return coeff1 + fraction * (coeff2 - coeff1);
		}
	}
	return last[1];
}
