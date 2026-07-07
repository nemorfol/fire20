import { describe, it, expect } from 'vitest';
import { computeYearlyImpact, createDefaultLifeEvent, type LifeEvent } from './life-events';

function ev(partial: Partial<LifeEvent>): LifeEvent {
	return {
		id: 'x',
		type: 'inheritance',
		label: 'Eredità',
		year: 2030,
		durationYears: 0,
		amount: 0,
		percentage: 0,
		enabled: true,
		relationship: 'spouse-direct',
		isProperty: false,
		purchaseYear: 0,
		costBasis: 0,
		isPrimaryResidence: false,
		allocation: 'growth',
		goalAnnualReturn: 0.02,
		goalPurpose: 'general',
		...partial
	};
}

describe('Eventi di vita - Eredità', () => {
	it('eredità liquida sotto franchigia: netto pieno reinvestito (bonus)', () => {
		const impact = computeYearlyImpact([ev({ amount: 50000, year: 2030 })], 2030);
		expect(impact.bonusIncome).toBe(50000);
	});

	it('eredità da estranei: netto = importo - imposta di successione (8%)', () => {
		// 200000 - 16000 = 184000
		const impact = computeYearlyImpact([ev({ amount: 200000, relationship: 'unrelated' })], 2030);
		expect(impact.bonusIncome).toBe(184000);
	});

	it('eredità immobile: illiquida, NON entra nel portafoglio investito', () => {
		const impact = computeYearlyImpact([ev({ amount: 300000, isProperty: true })], 2030);
		expect(impact.bonusIncome).toBe(0);
	});

	it('eredità goal: va nel bucket obiettivo, non nel bonusIncome (#38)', () => {
		const impact = computeYearlyImpact(
			[ev({ amount: 100000, allocation: 'goal', goalPurpose: 'university' })],
			2030
		);
		expect(impact.bonusIncome).toBe(0);
		expect(impact.goalBucketDeposit).toBe(100000);
	});

	it('conta solo nell\'anno target', () => {
		const e = [ev({ amount: 50000, year: 2030 })];
		expect(computeYearlyImpact(e, 2029).bonusIncome).toBe(0);
		expect(computeYearlyImpact(e, 2030).bonusIncome).toBe(50000);
	});

	it('createDefaultLifeEvent inheritance ha parentela e flag immobile', () => {
		const d = createDefaultLifeEvent('inheritance', 2030);
		expect(d.type).toBe('inheritance');
		expect(d.relationship).toBe('spouse-direct');
		expect(d.isProperty).toBe(false);
	});

	it('evento disattivato non ha impatto', () => {
		const impact = computeYearlyImpact([ev({ amount: 50000, enabled: false })], 2030);
		expect(impact.bonusIncome).toBe(0);
	});
});

describe('Eventi di vita - Vendita immobile (plusvalenza)', () => {
	const sale = (p: Partial<LifeEvent>) =>
		ev({ type: 'propertySale', amount: 200000, costBasis: 150000, year: 2030, ...p });

	it('venduto oltre 5 anni dall\'acquisto: plusvalenza esente, netto pieno', () => {
		// acquisto 2024, vendita 2030 -> 6 anni -> esente
		const impact = computeYearlyImpact([sale({ purchaseYear: 2024 })], 2030);
		expect(impact.bonusIncome).toBe(200000);
	});

	it('venduto entro 5 anni: plusvalenza 26% sul guadagno', () => {
		// acquisto 2027, vendita 2030 -> 3 anni -> gain 50000 -> tax 13000 -> netto 187000
		const impact = computeYearlyImpact([sale({ purchaseYear: 2027 })], 2030);
		expect(impact.bonusIncome).toBe(187000);
	});

	it('abitazione principale: esente anche entro 5 anni', () => {
		const impact = computeYearlyImpact(
			[sale({ purchaseYear: 2028, isPrimaryResidence: true })],
			2030
		);
		expect(impact.bonusIncome).toBe(200000);
	});

	it('nessuna plusvalenza se il valore di vendita <= prezzo di acquisto', () => {
		const impact = computeYearlyImpact(
			[sale({ purchaseYear: 2028, amount: 150000, costBasis: 180000 })],
			2030
		);
		expect(impact.bonusIncome).toBe(150000);
	});

	it('conta solo nell\'anno della vendita', () => {
		const e = [sale({ purchaseYear: 2027 })];
		expect(computeYearlyImpact(e, 2029).bonusIncome).toBe(0);
		expect(computeYearlyImpact(e, 2030).bonusIncome).toBe(187000);
	});

	it('createDefaultLifeEvent propertySale: default esente (possesso > 5 anni)', () => {
		const d = createDefaultLifeEvent('propertySale', 2030);
		expect(d.type).toBe('propertySale');
		expect(d.purchaseYear).toBe(2024);
		expect(d.isPrimaryResidence).toBe(false);
	});

	it('vendita rateale a tasso 0: netto spalmato in parti uguali su N anni', () => {
		// netto 200000 (esente), 4 anni -> 50000/anno dal 2030 al 2033
		const e = [sale({ purchaseYear: 2024, durationYears: 4, percentage: 0 })];
		expect(computeYearlyImpact(e, 2030).bonusIncome).toBe(50000);
		expect(computeYearlyImpact(e, 2033).bonusIncome).toBe(50000);
		expect(computeYearlyImpact(e, 2034).bonusIncome).toBe(0);
		expect(computeYearlyImpact(e, 2029).bonusIncome).toBe(0);
	});

	it('vendita rateale con interesse: annualita include gli interessi', () => {
		// netto 200000, 5 anni al 3%: annualita ~43670.9 (> netto/5 = 40000)
		const e = [sale({ purchaseYear: 2024, durationYears: 5, percentage: 0.03 })];
		const a = computeYearlyImpact(e, 2030).bonusIncome;
		expect(a).toBeGreaterThan(40000);
		expect(a).toBeCloseTo(43670.9, 0);
	});
});
