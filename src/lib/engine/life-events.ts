/**
 * Eventi di vita parametrici: bonus, periodi di disoccupazione, part-time,
 * spese straordinarie una-tantum. Servono a rendere la fase di accumulo FIRE
 * piu' realistica. Integrati da `projectPortfolio` in `fire-calculator.ts`.
 */

/** Tipo di evento di vita */
export type LifeEventType =
	| 'bonus'              // una-tantum income in un anno specifico
	| 'oneTimeExpense'     // una-tantum spesa straordinaria (matrimonio, auto, casa, ecc.)
	| 'unemployment'       // reddito a zero per N anni
	| 'partTime'           // riduzione reddito del X% per N anni
	| 'incomeChange';      // variazione permanente del reddito da un certo anno

/** Evento di vita configurato dall'utente.
 *  Tutti i campi numerici sono obbligatori (anche se non usati dal tipo
 *  specifico) cosi' il bind:value di Svelte 5 funziona senza cast TS. I tipi
 *  che non servono restano a 0 e vengono ignorati da computeYearlyImpact.
 */
export interface LifeEvent {
	/** Identificatore univoco (UUID o simili) */
	id: string;
	/** Tipo di evento */
	type: LifeEventType;
	/** Etichetta libera per l'utente */
	label: string;
	/** Anno di calendario di inizio */
	year: number;
	/** Durata in anni (usata per unemployment, partTime, incomeChange che si mantiene) */
	durationYears: number;
	/** Importo per bonus / oneTimeExpense; per incomeChange e' l'aumento/diminuzione annuo */
	amount: number;
	/** Percentuale per partTime (es. 0.50 = riduzione 50%) o incomeChange (es. -0.10 = taglio 10%) */
	percentage: number;
	/** Flag abilitato: se false l'evento viene ignorato (utile per what-if) */
	enabled: boolean;
}

/** Impatto degli eventi di vita su un singolo anno della simulazione */
export interface LifeEventYearlyImpact {
	/** Anno di calendario */
	year: number;
	/** Reddito aggiuntivo (bonus) */
	bonusIncome: number;
	/** Spese aggiuntive una-tantum */
	oneTimeExpenses: number;
	/** Moltiplicatore sul reddito da lavoro (1.0 = normale, 0.5 = part-time 50%, 0 = disoccupazione) */
	incomeMultiplier: number;
	/** Variazione permanente al reddito (cumulata dagli eventi incomeChange) */
	incomeDelta: number;
	/** Descrizioni degli eventi attivi (per tooltip) */
	activeLabels: string[];
}

const DEFAULT_IMPACT: Omit<LifeEventYearlyImpact, 'year'> = {
	bonusIncome: 0,
	oneTimeExpenses: 0,
	incomeMultiplier: 1,
	incomeDelta: 0,
	activeLabels: []
};

/**
 * Calcola l'impatto aggregato degli eventi di vita su un singolo anno.
 *
 * - `bonus`: se `event.year === targetYear`, somma `amount` a bonusIncome
 * - `oneTimeExpense`: se `event.year === targetYear`, somma `amount` a oneTimeExpenses
 * - `unemployment`: se targetYear in [event.year, event.year + duration), incomeMultiplier = 0
 *   (se piu' eventi di riduzione, si moltiplicano)
 * - `partTime`: se targetYear in [event.year, event.year + duration), incomeMultiplier *= (1 - percentage)
 * - `incomeChange`: se targetYear >= event.year, incomeDelta += amount (permanente)
 *
 * @param events - Lista eventi
 * @param targetYear - Anno di cui si vuole l'impatto
 */
export function computeYearlyImpact(
	events: LifeEvent[] | undefined,
	targetYear: number
): LifeEventYearlyImpact {
	if (!events || events.length === 0) {
		return { year: targetYear, ...DEFAULT_IMPACT };
	}

	let bonusIncome = 0;
	let oneTimeExpenses = 0;
	let incomeMultiplier = 1;
	let incomeDelta = 0;
	const activeLabels: string[] = [];

	for (const e of events) {
		if (!e.enabled) continue;

		switch (e.type) {
			case 'bonus': {
				if (e.year === targetYear && e.amount > 0) {
					bonusIncome += e.amount;
					activeLabels.push(`Bonus: ${e.label} (+${Math.round(e.amount)} €)`);
				}
				break;
			}
			case 'oneTimeExpense': {
				if (e.year === targetYear && e.amount > 0) {
					oneTimeExpenses += e.amount;
					activeLabels.push(`Spesa: ${e.label} (−${Math.round(e.amount)} €)`);
				}
				break;
			}
			case 'unemployment': {
				const duration = Math.max(1, e.durationYears);
				if (targetYear >= e.year && targetYear < e.year + duration) {
					incomeMultiplier = 0;
					activeLabels.push(`Disoccupazione: ${e.label}`);
				}
				break;
			}
			case 'partTime': {
				const duration = Math.max(1, e.durationYears);
				if (targetYear >= e.year && targetYear < e.year + duration) {
					const reduction = e.percentage > 0 ? e.percentage : 0.5;
					incomeMultiplier *= Math.max(0, 1 - reduction);
					activeLabels.push(`Part-time ${Math.round((1 - reduction) * 100)}%: ${e.label}`);
				}
				break;
			}
			case 'incomeChange': {
				if (targetYear >= e.year && e.amount !== 0) {
					incomeDelta += e.amount;
					activeLabels.push(`${e.amount > 0 ? 'Aumento' : 'Taglio'} reddito: ${e.label}`);
				}
				break;
			}
		}
	}

	return { year: targetYear, bonusIncome, oneTimeExpenses, incomeMultiplier, incomeDelta, activeLabels };
}

/**
 * Crea un nuovo evento di vita con valori di default sensati per il tipo.
 */
export function createDefaultLifeEvent(type: LifeEventType, year: number): LifeEvent {
	const id = `le-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
	const base = { id, type, year, enabled: true, durationYears: 0, amount: 0, percentage: 0 };
	switch (type) {
		case 'bonus':
			return { ...base, type, label: 'Bonus', amount: 3000 };
		case 'oneTimeExpense':
			return { ...base, type, label: 'Spesa una-tantum', amount: 10000 };
		case 'unemployment':
			return { ...base, type, label: 'Disoccupazione', durationYears: 1 };
		case 'partTime':
			return { ...base, type, label: 'Part-time', durationYears: 2, percentage: 0.5 };
		case 'incomeChange':
			return { ...base, type, label: 'Variazione stipendio', amount: 5000 };
	}
}
