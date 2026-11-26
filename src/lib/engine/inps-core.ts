/**
 * Nucleo condiviso del calcolo previdenziale INPS (metodo contributivo).
 *
 * Fonte UNICA delle primitive numeriche usate sia da `pension-italy.ts`
 * (usato da `PensionCalculator.svelte`, Profilo -> Pensione) sia da
 * `inps-simulator.ts` (usato da `/pensione` e `INPSSimulator.svelte`).
 * Evita la doppia fonte di verita' sui parametri contributivi (intervento C4):
 * prima ogni modulo teneva copie locali di aliquota di computo, tasso di
 * rivalutazione e assegno sociale, con il rischio che divergessero nel tempo.
 *
 * NB: i coefficienti di trasformazione restano centralizzati in
 * `assumptions.ts` (`TRANSFORMATION_COEFFICIENTS_2025_2026`, DM 20/11/2024) e
 * vengono importati direttamente da la'; qui gestiamo solo montante e aliquote.
 */

/**
 * Tasso medio annuo di rivalutazione (capitalizzazione) del montante
 * contributivo. Nel metodo contributivo il montante e' rivalutato ogni anno
 * alla media mobile quinquennale del PIL nominale (art. 1 c. 9 L. 335/1995).
 * Qui usiamo una stima prudenziale dell'1,5% annuo, sovrascrivibile dal
 * chiamante (`montanteRevaluationRate`).
 */
export const DEFAULT_MONTANTE_REVALUATION = 0.015;

/** Tipi di rapporto di lavoro ammessi per il calcolo del montante. */
export type ContractType = 'dipendente' | 'autonomo' | 'parasubordinato';

/**
 * Aliquote di COMPUTO (non le quote a carico del lavoratore) con cui si
 * costruisce il montante contributivo, per tipo di rapporto:
 * - `dipendente`: 33% (aliquota IVS FPLD);
 * - `autonomo`: 26,23% (gestione artigiani/commercianti di riferimento 2026);
 * - `parasubordinato`: 33,72% (gestione separata, aliquota piena 2026).
 *
 * ATTENZIONE: sono diverse dalle quote di VERSAMENTO in `assumptions.ts`
 * (`inps.employeeBase` 9,19%, `inps.parasubordinato` 11,24% ecc.), che servono
 * a stimare il netto in busta paga. Queste aliquote di computo servono al
 * montante pensionistico e restano volutamente separate.
 * Fonti: L. 335/1995 (metodo contributivo); circolari INPS gestione separata.
 */
export const COMPUTATION_RATES: Record<ContractType, number> = {
	dipendente: 0.33,
	autonomo: 0.2623,
	parasubordinato: 0.3372
};

/**
 * Assegno sociale mensile 2026, usato per il requisito d'importo della
 * pensione anticipata contributiva (>= 3x l'assegno sociale).
 */
export const SOCIAL_ALLOWANCE_MONTHLY_2026 = 534.41;

/**
 * Capitalizza un importo (contributo o montante) per `years` anni al tasso di
 * rivalutazione dato. Primitiva condivisa del montante contributivo:
 * `montante = Somma( contributo * (1 + rev)^anni )`.
 *
 * @param amount - Importo da rivalutare
 * @param years - Numero di anni di capitalizzazione (clampato a >= 0)
 * @param rate - Tasso di rivalutazione (default: media PIL nominale 1,5%)
 */
export function revalueMontante(
	amount: number,
	years: number,
	rate: number = DEFAULT_MONTANTE_REVALUATION
): number {
	return amount * Math.pow(1 + rate, Math.max(0, years));
}

/** Parametri del modello unico di capitalizzazione del montante contributivo. */
export interface CapitalizeMontanteParams {
	/** Primo anno (solare o "eta'" usata come indice) considerato nel ciclo. */
	startYear: number;
	/** Anno di decorrenza della pensione: il ciclo si ferma all'anno precedente. */
	retirementYear: number;
	/**
	 * Contributo accreditato nell'anno dato (0 se non si versa: gap di carriera,
	 * stop contributi all'eta' FIRE...). Chiamata una volta per ogni anno del ciclo.
	 */
	contributionForYear: (year: number) => number;
	/**
	 * Montante gia' maturato al 31/12 dell'anno precedente a `startYear`
	 * (es. dall'estratto conto INPS). Viene rivalutato da `startYear` in poi.
	 */
	initialMontante?: number;
	/** Tasso di capitalizzazione annuo (default: `DEFAULT_MONTANTE_REVALUATION`). */
	rate?: number;
}

/**
 * MODELLO UNICO di capitalizzazione del montante contributivo (intervento E1),
 * usato sia da `pension-italy.ts` sia da `inps-simulator.ts`.
 *
 * Normativa — L. 335/1995, art. 1, commi 8-9 (testo su normattiva.it):
 * - c. 8: il montante "si rivaluta su base composta al 31 dicembre di ciascun
 *   anno, con esclusione della contribuzione dello stesso anno, al tasso di
 *   capitalizzazione";
 * - c. 9: il tasso di capitalizzazione e' "la variazione media quinquennale del
 *   prodotto interno lordo (PIL) nominale" calcolata dall'ISTAT.
 *
 * Conseguenze modellate qui:
 * 1. l'INTERO montante si rivaluta OGNI anno fino alla decorrenza della
 *    pensione, indipendentemente dal versamento di nuovi contributi: anche nel
 *    "gap" tra fine lavoro (FIRE, issue #37) e pensione, e anche il blocco
 *    "passato" durante gli anni di contribuzione futura;
 * 2. il contributo dell'anno in corso e' ESCLUSO dalla rivalutazione di
 *    quell'anno (c. 8): il contributo dell'anno Y si rivaluta per
 *    (annoDecorrenza - 1 - Y) anni, cioe' al 31/12 degli anni Y+1 ... R-1.
 *
 * CONVENZIONE ANNO IN CORSO (uniformata tra i due percorsi): l'anno solare
 * corrente CONTA come anno di contribuzione, con lo stipendio attuale non
 * ancora cresciuto (crescita applicata dagli anni successivi). Era gia' la
 * convenzione di `inps-simulator.ts`; `pension-italy.ts` e' stato allineato.
 */
export function capitalizeMontante(params: CapitalizeMontanteParams): number {
	const { startYear, retirementYear, contributionForYear, initialMontante = 0 } = params;
	const rate = params.rate ?? DEFAULT_MONTANTE_REVALUATION;
	let montante = initialMontante;
	for (let year = startYear; year < retirementYear; year++) {
		// Rivalutazione al 31/12 dell'anno, esclusa la contribuzione dell'anno
		// stesso (art. 1 c. 8 L. 335/1995): prima si rivaluta, poi si accredita.
		montante *= 1 + rate;
		montante += contributionForYear(year);
	}
	return montante;
}
