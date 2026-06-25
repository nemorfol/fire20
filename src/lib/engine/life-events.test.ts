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
