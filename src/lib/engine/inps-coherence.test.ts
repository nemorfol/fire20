/**
 * Test di COERENZA tra i due percorsi di stima della pensione INPS (intervento C4):
 *
 *  - `pension-italy.ts` -> `calculateContributivePension`
 *      usato da `PensionCalculator.svelte` (Profilo -> Pensione);
 *  - `inps-simulator.ts` -> `simulateINPSPension`
 *      usato da `/pensione` e `INPSSimulator.svelte`.
 *
 * Entrambi implementano il metodo contributivo (montante -> coefficiente di
 * trasformazione), ma con modelli di input diversi (eta' vs anno solare). Dopo
 * il consolidamento (inps-core.ts) condividono aliquota di computo, tasso di
 * rivalutazione, coefficienti e la primitiva di capitalizzazione del montante.
 *
 * Questo test documenta DOVE i due percorsi coincidono (carriera piena) e DOVE
 * divergono in modo NOTO e non ancora consolidato (stop contributi all'eta' FIRE,
 * issue #37): serve sia da guardia di regressione sia da documentazione viva.
 */
import { describe, it, expect } from 'vitest';
import { calculateContributivePension } from './pension-italy';
import { simulateINPSPension, type INPSSimulatorParams } from './inps-simulator';
import { COMPUTATION_RATES, DEFAULT_MONTANTE_REVALUATION, revalueMontante } from './inps-core';

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

function pctDiff(a: number, b: number): number {
	return b === 0 ? 0 : Math.abs((a - b) / b) * 100;
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

describe('Coerenza pension-italy vs inps-simulator: carriera piena (nessuno stop)', () => {
	// Con contribuzione fino alla pensione i due modelli coincidono a meno di uno
	// scarto piccolo (~0,5-2%) dovuto alla diversa indicizzazione dell'anno in
	// corso (eta' vs anno solare) e allo sfasamento di un anno nella crescita
	// dello stipendio. Nessun parametro fiscale diverge tra i due percorsi.
	const TOL = 2.5; // %

	it('carriera media (41 anni, stipendio 35k, crescita 1%)', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 41,
			firstEmploymentYear: CURRENT_YEAR - 16,
			salary: 35000,
			growthPct: 1,
			retirementAge: 67
		});
		expect(r.pensionItaly).toBeGreaterThan(0);
		expect(r.inpsSimulator).toBeGreaterThan(0);
		expect(pctDiff(r.pensionItaly, r.inpsSimulator)).toBeLessThan(TOL);
	});

	it('carriera lunga giovane (31 anni, stipendio 30k, crescita 2%)', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 31,
			firstEmploymentYear: CURRENT_YEAR - 8,
			salary: 30000,
			growthPct: 2,
			retirementAge: 67
		});
		expect(pctDiff(r.pensionItaly, r.inpsSimulator)).toBeLessThan(TOL);
	});

	it('reddito alto sopra il massimale (150k): coerenti tra loro', () => {
		// NB: nessuno dei due applica il massimale contributivo (122.295 EUR,
		// assumptions.inps.massimale) alla base di computo: e' un limite CONDIVISO
		// e quindi i due percorsi restano coerenti fra loro anche in questo caso.
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 46,
			firstEmploymentYear: CURRENT_YEAR - 21,
			salary: 150000,
			growthPct: 1,
			retirementAge: 67
		});
		expect(pctDiff(r.pensionItaly, r.inpsSimulator)).toBeLessThan(TOL);
	});
});

describe('DIVERGENZA NOTA: stop contributi all eta FIRE (#37) — non consolidata', () => {
	// Quando i contributi si fermano all'eta' FIRE (contributionEndAge) e resta un
	// lungo "gap" fino alla pensione, i due percorsi DIVERGONO in modo rilevante:
	//   - inps-simulator RIVALUTA l'intero montante ogni anno del gap (montante
	//     capitalizzato fino alla pensione, coerente con art.1 c.9 L.335/1995);
	//   - pension-italy NON rivaluta il montante gia' accumulato durante il gap
	//     (lo "congela"), sottostimando la pensione.
	//
	// Nessuno dei due modelli e' pienamente corretto (entrambi rivalutano il
	// blocco "passato" solo fino ad oggi, non fino alla pensione), quindi in
	// mancanza di una base normativa che indichi con certezza QUALE dei due sia
	// esatto, il comportamento di entrambi e' stato MANTENUTO invariato (vedi
	// report C4). Questo test fissa la divergenza attuale come guardia: se un
	// domani si allinea il modello del montante, aggiornare qui e nel CHANGELOG.
	it('pension-italy sottostima rispetto a inps-simulator (gap FIRE lungo)', () => {
		const r = bothPaths({
			birthYear: CURRENT_YEAR - 41,
			firstEmploymentYear: CURRENT_YEAR - 16,
			salary: 40000,
			growthPct: 1,
			retirementAge: 67,
			contributionEndAge: 50 // FIRE a 50, ~17 anni di gap fino a 67
		});
		expect(r.pensionItaly).toBeGreaterThan(0);
		expect(r.inpsSimulator).toBeGreaterThan(0);
		// pension-italy piu' bassa di inps-simulator
		expect(r.pensionItaly).toBeLessThan(r.inpsSimulator);
		// divergenza materiale (ordine di grandezza ~25-30%): documentata, non un bug latente
		const gap = pctDiff(r.pensionItaly, r.inpsSimulator);
		expect(gap).toBeGreaterThan(15);
		expect(gap).toBeLessThan(40);
	});
});
