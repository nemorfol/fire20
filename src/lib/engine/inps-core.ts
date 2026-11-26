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
