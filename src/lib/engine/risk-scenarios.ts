/**
 * Scenari di rischio predefiniti per la simulazione FIRE.
 * Ogni scenario modella un evento avverso con impatto su portafoglio,
 * spese, reddito e rendimenti.
 */

import type { YearlyProjection } from './fire-calculator.js';

/** Evento di rischio con parametri di impatto */
export interface RiskEvent {
	/** Identificatore univoco */
	id: string;
	/** Nome dello scenario (in italiano) */
	name: string;
	/** Descrizione dettagliata (in italiano) */
	description: string;
	/** Categoria dell'evento */
	type: 'health' | 'market' | 'inflation' | 'geopolitical' | 'personal' | 'longevity';
	/** Parametri di impatto */
	impact: {
		/** Shock immediato al portafoglio (es. -0.30 per -30%) */
		portfolioShock: number;
		/** Aumento percentuale delle spese (es. 0.40 per +40%) */
		expenseIncrease: number;
		/** Riduzione percentuale del reddito (es. 1.0 per -100%) */
		incomeReduction: number;
		/** Durata dell'impatto in anni */
		duration: number;
		/** Anno di occorrenza dal pensionamento FIRE (0 = al pensionamento, negativo = pre-FIRE) */
		yearOfOccurrence: number;
		/** Riduzione dei rendimenti annuali durante l'evento (es. 0.15 per -15pp) */
		returnReduction: number;
	};
}

/**
 * Scenari di rischio predefiniti per il mercato italiano e globale.
 */
export const PREDEFINED_RISK_EVENTS: RiskEvent[] = [
	{
		id: 'health-crisis',
		name: 'Crisi Sanitaria Grave',
		description: 'Una grave crisi sanitaria personale o familiare che comporta spese mediche elevate per un periodo prolungato. Include costi per cure, assistenza e possibile riduzione della capacità lavorativa.',
		type: 'health',
		impact: {
			portfolioShock: -0.05,
			expenseIncrease: 0.40,
			incomeReduction: 0,
			duration: 3,
			yearOfOccurrence: 0,
			returnReduction: 0
		}
	},
	{
		id: 'market-crash',
		name: 'Crash di Mercato',
		description: 'Un crollo severo dei mercati finanziari simile alla crisi del 2008 o al crollo del 2020. Il portafoglio subisce una perdita immediata del 40% con rendimenti negativi nel primo anno e recupero graduale.',
		type: 'market',
		impact: {
			portfolioShock: -0.40,
			expenseIncrease: 0,
			incomeReduction: 0,
			duration: 3,
			yearOfOccurrence: 0,
			returnReduction: 0.15
		}
	},
	{
		id: 'high-inflation',
		name: 'Inflazione Elevata Persistente',
		description: 'Un periodo prolungato di inflazione elevata (stile anni \'70 o post-2022) che erode il potere d\'acquisto. Le spese aumentano significativamente e i rendimenti reali dei bond crollano.',
		type: 'inflation',
		impact: {
			portfolioShock: 0,
			expenseIncrease: 0.05,
			incomeReduction: 0,
			duration: 5,
			yearOfOccurrence: 0,
			returnReduction: 0.10
		}
	},
	{
		id: 'geopolitical-shock',
		name: 'Shock Geopolitico',
		description: 'Un evento geopolitico grave (conflitto internazionale, crisi energetica, sanzioni) che impatta i mercati globali con shock al portafoglio, aumento dei prezzi energetici e alimentari.',
		type: 'geopolitical',
		impact: {
			portfolioShock: -0.25,
			expenseIncrease: 0.03,
			incomeReduction: 0,
			duration: 2,
			yearOfOccurrence: 0,
			returnReduction: 0.05
		}
	},
	{
		id: 'negative-sequence',
		name: 'Sequenza Rendimenti Negativi',
		description: 'I primi 5 anni di pensionamento coincidono con i peggiori rendimenti storici, amplificando il rischio di sequenza. Questo è lo scenario più pericoloso per chi è appena andato in pensione.',
		type: 'market',
		impact: {
			portfolioShock: -0.15,
			expenseIncrease: 0,
			incomeReduction: 0,
			duration: 5,
			yearOfOccurrence: 0,
			returnReduction: 0.12
		}
	},
	{
		id: 'job-loss-pre-fire',
		name: 'Perdita Lavoro Pre-FIRE',
		description: 'Perdita del lavoro 3 anni prima della data FIRE prevista. Reddito azzerato per 12 mesi con conseguente interruzione dei contributi e possibile utilizzo dei risparmi.',
		type: 'personal',
		impact: {
			portfolioShock: 0,
			expenseIncrease: 0,
			incomeReduction: 1.0,
			duration: 1,
			yearOfOccurrence: -3,
			returnReduction: 0
		}
	},
	{
		id: 'divorce',
		name: 'Divorzio',
		description: 'Separazione/divorzio con divisione del patrimonio al 50%. Le spese aumentano significativamente per il mantenimento di due nuclei familiari. Impatto immediato e permanente sulle spese.',
		type: 'personal',
		impact: {
			portfolioShock: -0.50,
			expenseIncrease: 0.20,
			incomeReduction: 0,
			duration: 1,
			yearOfOccurrence: 0,
			returnReduction: 0
		}
	},
	{
		id: 'extreme-longevity',
		name: "Longevita' Estrema",
		description: 'Vivere fino a 100 anni o oltre. Richiede che il portafoglio duri molto più a lungo del previsto, con costi crescenti per assistenza e cure nella fase finale della vita.',
		type: 'longevity',
		impact: {
			portfolioShock: 0,
			expenseIncrease: 0.10,
			incomeReduction: 0,
			duration: 15,
			yearOfOccurrence: 15,
			returnReduction: 0
		}
	}
];

/**
 * Applica un evento di rischio a una proiezione del portafoglio esistente.
 * Modifica i dati anno per anno in base ai parametri dell'evento.
 *
 * @param yearlyData - Proiezione originale anno per anno
 * @param event - Evento di rischio da applicare
 * @returns Nuova proiezione con l'evento applicato (non modifica l'originale)
 */
export function applyRiskEvent(
	yearlyData: YearlyProjection[],
	event: RiskEvent
): YearlyProjection[] {
	if (yearlyData.length === 0) return [];

	// Copia profonda dei dati
	const result: YearlyProjection[] = yearlyData.map((d) => ({ ...d }));

	const { impact } = event;
	const startIdx = Math.max(0, impact.yearOfOccurrence);
	const endIdx = Math.min(result.length - 1, startIdx + impact.duration - 1);

	for (let i = 0; i < result.length; i++) {
		const point = result[i];

		// Shock al portafoglio (applicato solo al primo anno dell'evento)
		if (i === startIdx && impact.portfolioShock !== 0) {
			const shock = point.portfolio * impact.portfolioShock;
			point.portfolio += shock;
			point.netWorth += shock;

			// Propaga lo shock a tutti gli anni successivi
			for (let j = i + 1; j < result.length; j++) {
				result[j].portfolio += shock;
				result[j].netWorth += shock;
			}
		}

		// Effetti durante la durata dell'evento
		if (i >= startIdx && i <= endIdx) {
			// Aumento delle spese
			if (impact.expenseIncrease > 0) {
				const extraExpenses = point.withdrawals * impact.expenseIncrease;
				point.withdrawals += extraExpenses;
				point.portfolio -= extraExpenses;
				point.netWorth -= extraExpenses;

				// Propaga l'effetto sugli anni successivi
				for (let j = i + 1; j < result.length; j++) {
					result[j].portfolio -= extraExpenses;
					result[j].netWorth -= extraExpenses;
				}
			}

			// Riduzione del reddito (impatta i contributi)
			if (impact.incomeReduction > 0) {
				const lostContributions = point.contributions * impact.incomeReduction;
				point.contributions -= lostContributions;
				point.portfolio -= lostContributions;
				point.netWorth -= lostContributions;

				for (let j = i + 1; j < result.length; j++) {
					result[j].portfolio -= lostContributions;
					result[j].netWorth -= lostContributions;
				}
			}

			// Riduzione dei rendimenti
			if (impact.returnReduction > 0) {
				const returnLoss = point.portfolio * impact.returnReduction;
				point.returns -= returnLoss;
				point.portfolio -= returnLoss;
				point.netWorth -= returnLoss;

				for (let j = i + 1; j < result.length; j++) {
					result[j].portfolio -= returnLoss;
					result[j].netWorth -= returnLoss;
				}
			}
		}

		// Assicura che il portafoglio non sia negativo
		if (point.portfolio < 0) {
			point.portfolio = 0;
			point.netWorth = Math.max(0, point.netWorth);
		}
	}

	return result;
}

/**
 * Applica una sequenza di eventi di rischio a una proiezione. Ogni evento si
 * applica sul risultato dell'evento precedente: i danni si sommano (non sono
 * indipendenti). L'ordine degli eventi conta, ma il risultato aggregato e' lo
 * stesso tranne per interazioni non lineari (es. uno shock sul portafoglio
 * prima di un aumento spese ha un leggero effetto diverso dopo, perche' il
 * portafoglio residuo e' gia' ridotto). Non modifica l'input.
 *
 * @param yearlyData - Proiezione baseline
 * @param events - Eventi da applicare in sequenza
 * @returns Nuova proiezione con tutti gli eventi applicati
 */
export function applyRiskEvents(
	yearlyData: YearlyProjection[],
	events: RiskEvent[]
): YearlyProjection[] {
	if (yearlyData.length === 0 || events.length === 0) {
		return yearlyData.map((d) => ({ ...d }));
	}
	let current = yearlyData;
	for (const event of events) {
		current = applyRiskEvent(current, event);
	}
	return current;
}

/**
 * Restituisce uno scenario di rischio predefinito dato il suo ID.
 *
 * @param id - Identificatore dello scenario
 * @returns L'evento di rischio, o undefined se non trovato
 */
export function getRiskEventById(id: string): RiskEvent | undefined {
	return PREDEFINED_RISK_EVENTS.find((e) => e.id === id);
}

/**
 * Filtra gli scenari predefiniti per tipo.
 *
 * @param type - Tipo di evento
 * @returns Array di eventi del tipo specificato
 */
export function getRiskEventsByType(type: RiskEvent['type']): RiskEvent[] {
	return PREDEFINED_RISK_EVENTS.filter((e) => e.type === type);
}
