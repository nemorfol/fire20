/**
 * Test di COERENZA tra i due percorsi di stima della pensione INPS (C4 + E1):
 *
 *  - `pension-italy.ts` -> `calculateContributivePension`
 *      usato da `PensionCalculator.svelte` (Profilo -> Pensione);
 *  - `inps-simulator.ts` -> `simulateINPSPension`
 *      usato da `/pensione` e `INPSSimulator.svelte`.
 *
 * Dopo l'intervento E1 entrambi usano il MODELLO UNICO di capitalizzazione del
 * montante (`capitalizeMontante` in inps-core.ts, L. 335/1995 art. 1 c. 8-9):
 * contributi accreditati anno per anno e rivalutazione dell'INTERO montante
 * ogni anno fino alla decorrenza, anche negli anni senza versamenti (gap di
 * carriera, stop contributi all'eta' FIRE #37). Convenzione anno in corso
 * condivisa: l'anno corrente conta come anno di contribuzione allo stipendio
 * attuale. Con lo stesso input i due percorsi devono quindi COINCIDERE in
 * TUTTI gli scenari, incluso lo stop-FIRE (la divergenza fino a ~28%
 * documentata prima di E1 e' stata eliminata).
 */
import { describe, it, expect } from 'vitest';
import { calculateContributivePension } from './pension-italy';
import { simulateINPSPension, type INPSSimulatorParams } from './inps-simulator';
import {
	COMPUTATION_RATES,
	DEFAULT_MONTANTE_REVALUATION,
	capitalizeMontante,
	revalueMontante
} from './inps-core';

const CURRENT_YEAR = new Date().getFullYear();

/** Costruisce input equivalenti e restituisce la pensione mensile LORDA dai due percorsi. */
function bothPaths(o: {
	birthYear: number;
	firstEmploymentYear: number;
	salary: number;
	growthPct: number;
	retirementAge: number;
	contributionEndAge?: number;
}): { pensionItaly: number; inpsSimulator: number } {
	const currentAge = CURRENT_YEAR - o.birthYear;
	const existingYears = CURRENT_YEAR - o.firstEmploymentYear;

	const pi = calculateContributivePension({
		currentSalary: o.salary,
		salaryGrowthRate: o.growthPct / 100,
		currentContributionYears: existingYears,
		currentAge,
		retirementAge: o.retirementAge,
		inflationRate: 0.02,
		montanteRevaluationRate: DEFAULT_MONTANTE_REVALUATION,
		contributionEndAge: o.contributionEndAge
	});

	const params: INPSSimulatorParams = {
		birthYear: o.birthYear,
		gender: 'M',
		firstEmploymentYear: o.firstEmploymentYear,
		currentGrossSalary: o.salary,
		salaryGrowthRate: o.growthPct,
		contractType: 'dipendente',
		partTime: false,
		partTimePercentage: 100,
		existingContributionYears: existingYears,
		existingMontante: 0,
		targetRetirementAge: o.retirementAge,
		contributionEndAge: o.contributionEndAge
	};
	const sim = simulateINPSPension(params);
	const point = sim.pensionAtAge.find((p) => p.age === o.retirementAge);

	return { pensionItaly: pi.monthlyPension, inpsSimulator: point?.monthlyGross ?? 0 };
}

describe('inps-core: primitive condivise (fonte unica)', () => {
	it('aliquote di computo allineate alle fonti (L.335/1995, gestione separata)', () => {
		expect(COMPUTATION_RATES.dipendente).toBe(0.33);
		expect(COMPUTATION_RATES.autonomo).toBe(0.2623);
		expect(COMPUTATION_RATES.parasubordinato).toBe(0.3372);
	});
	it('tasso di rivalutazione montante = 1,5% (media PIL nominale, stima prudenziale)', () => {
		expect(DEFAULT_MONTANTE_REVALUATION).toBe(0.015);
	});
	it('revalueMontante capitalizza al tasso composto e clampa gli anni negativi', () => {
		expect(revalueMontante(1000, 10, 0.015)).toBeCloseTo(1000 * 1.015 ** 10, 6);
		expect(revalueMontante(1000, 0, 0.015)).toBe(1000);
		expect(revalueMontante(1000, -5, 0.015)).toBe(1000); // clamp a 0 anni
	});
});

describe('inps-core: capitalizeMontante (modello unico, L.335/1995 art.1 c.8-9)', () => {
	const r = 0.015;

	it('il contributo dell anno Y si rivaluta per (R-1-Y) anni (contribuzione dell anno esclusa, c.8)', () => {
		// Contributi di 1.000 negli anni 0..9, decorrenza nell'anno 27:
		// forma chiusa Somma( 1000 * (1+r)^(26 - y) ).
		let expected = 0;
		for (let y = 0; y < 10; y++) expected += 1000 * Math.pow(1 + r, 26 - y);
		const got = capitalizeMontante({
			startYear: 0,
			retirementYear: 27,
			rate: r,
			contributionForYear: (y) => (y < 10 ? 1000 : 0)
		});
		expect(got).toBeCloseTo(expected, 6);
	});

	it('il montante si rivaluta ANCHE negli anni senza contributi (gap FIRE)', () => {
		// Stessi contributi, decorrenza 17 anni piu' tardi senza nuovi versamenti:
		// l'intero montante si capitalizza per i 17 anni di gap.
		const at10 = capitalizeMontante({
			startYear: 0,
			retirementYear: 10,
			rate: r,
			contributionForYear: () => 1000
		});
		const at27 = capitalizeMontante({
			startYear: 0,
			retirementYear: 27,
			rate: r,
			contributionForYear: (y) => (y < 10 ? 1000 : 0)
		});
		// NB: at10 non include la rivalutazione dell'anno 9 sul contributo dell'anno 9
		// (esclusa per c.8), ma da li' in poi tutto il montante cresce di (1+r)^17.
		expect(at27).toBeCloseTo(at10 * Math.pow(1 + r, 17), 6);
	});

	it('initialMontante (estratto conto) viene rivalutato da startYear alla decorrenza', () => {
		const got = capitalizeMontante({
			startYear: 0,
			retirementYear: 17,
			rate: r,
			initialMontante: 10000,
			contributionForYear: () => 0
		});
		expect(got).toBeCloseTo(10000 * Math.pow(1 + r, 17), 6);
	});
});

// Con il modello unico i due percorsi devono coincidere al centesimo (stessa
// primitiva, stessa convenzione anno in corso): tolleranza solo di floating point.
function expectCoherent(r: { pensionItaly: number; inpsSimulator: number }) {
	expect(r.pensionItaly).toBeGreaterThan(0);
	expect(r.inpsSimulator).toBeGreaterThan(0);
	expect(r.pensionItaly).toBeCloseTo(r.inpsSimulator, 1);
}

describe('Coerenza pension-italy vs inps-simulator: carriera piena (nessuno stop)', () => {
	it('carriera media (41 anni, stipendio 35k, crescita 1%)', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 41,
			firstEmploymentYear: CURRENT_YEAR - 16,
			salary: 35000,
			growthPct: 1,
			retirementAge: 67
		});
		expectCoherent(r);
		// Golden E1 (ricalcolato): prima di E1 pension-italy dava 2.617,59 e
		// inps-simulator 2.599,91 (blocco passato rivalutato solo fino ad oggi).
		expect(r.pensionItaly).toBeCloseTo(2974.91, 1);
	});

	it('carriera lunga giovane (31 anni, stipendio 30k, crescita 2%)', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 31,
			firstEmploymentYear: CURRENT_YEAR - 8,
			salary: 30000,
			growthPct: 2,
			retirementAge: 67
		});
		expectCoherent(r);
		// Golden E1: prima 3.215,76 / 3.159,26.
		expect(r.pensionItaly).toBeCloseTo(3387.82, 1);
	});

	it('reddito alto sopra il massimale (150k): coerenti tra loro', () => {
		// NB: nessuno dei due applica il massimale contributivo (122.295 EUR,
		// assumptions.inps.massimale) alla base di computo: e' un limite CONDIVISO
		// e quindi i due percorsi restano coerenti fra loro anche in questo caso
		// (l'applicazione del cap e' l'intervento E4).
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 46,
			firstEmploymentYear: CURRENT_YEAR - 21,
			salary: 150000,
			growthPct: 1,
			retirementAge: 67
		});
		expectCoherent(r);
		// Golden E1: prima 10.545,39 / 10.487,87.
		expect(r.pensionItaly).toBeCloseTo(12130.82, 1);
	});
});

describe('Coerenza nello scenario stop contributi all eta FIRE (#37) — consolidato con E1', () => {
	// Prima di E1 qui c'era una DIVERGENZA documentata fino a ~28%: pension-italy
	// congelava il montante nel gap, inps-simulator lo rivalutava (e per giunta
	// double-contava la rivalutazione dei contributi futuri gia' capitalizzati
	// fino alla decorrenza). Col modello unico i due percorsi coincidono.
	it('stop a 50, pensione a 67 (~17 anni di gap): stessi numeri dai due percorsi', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 41,
			firstEmploymentYear: CURRENT_YEAR - 16,
			salary: 40000,
			growthPct: 1,
			retirementAge: 67,
			contributionEndAge: 50 // FIRE a 50, ~17 anni di gap fino a 67
		});
		expectCoherent(r);
		// Golden E1 (ricalcolato): prima pension-italy 1.686,78 (montante congelato
		// nel gap) e inps-simulator 2.163,22 (doppia rivalutazione dei contributi
		// futuri). Il modello corretto sta in mezzo.
		expect(r.pensionItaly).toBeCloseTo(2108.06, 1);
	});

	it('lo stop riduce comunque la pensione rispetto alla carriera piena', () => {
		const base = {
			birthYear: CURRENT_YEAR - 41,
			firstEmploymentYear: CURRENT_YEAR - 16,
			salary: 40000,
			growthPct: 1,
			retirementAge: 67
		};
		const full = bothPaths(base);
		const stopped = bothPaths({ ...base, contributionEndAge: 50 });
		expect(stopped.pensionItaly).toBeLessThan(full.pensionItaly);
		expect(stopped.inpsSimulator).toBeLessThan(full.inpsSimulator);
	});
});
