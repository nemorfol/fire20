import { describe, it, expect } from 'vitest';
import {
	calculateIRPEF,
	calculateCapitalGainsTax,
	calculateStampDuty,
	calculateIVAFE
} from './tax-italy';
import { customizeAssumptions, DEFAULT_2026 } from './assumptions';

// Scaglioni IRPEF della riforma 2024 confermata per il 2025 (Legge di Bilancio
// 2025): 23% fino a 28.000, 35% da 28.000 a 50.000, 43% oltre. Li passiamo
// ESPLICITI per testare la meccanica progressiva indipendentemente dal default
// del preset (la cui aliquota intermedia 2026 e' in fase di verifica normativa).
const IRPEF_2025 = customizeAssumptions(DEFAULT_2026, {
	irpefBrackets: [
		{ from: 0, to: 28000, rate: 0.23 },
		{ from: 28000, to: 50000, rate: 0.35 },
		{ from: 50000, to: Number.POSITIVE_INFINITY, rate: 0.43 }
	]
});

describe('IRPEF - scaglioni progressivi (23/35/43)', () => {
	it('reddito <= 0 -> imposta 0', () => {
		expect(calculateIRPEF(0, IRPEF_2025).tax).toBe(0);
		expect(calculateIRPEF(-1000, IRPEF_2025).tax).toBe(0);
	});

	it('dentro il primo scaglione: 20.000 -> 4.600', () => {
		// 20000 * 0.23 = 4600
		expect(calculateIRPEF(20000, IRPEF_2025).tax).toBeCloseTo(4600, 2);
	});

	it('soglia esatta primo scaglione: 28.000 -> 6.440', () => {
		// 28000 * 0.23 = 6440
		expect(calculateIRPEF(28000, IRPEF_2025).tax).toBeCloseTo(6440, 2);
	});

	it('a cavallo del secondo scaglione: 40.000 -> 10.640', () => {
		// 6440 + 12000*0.35 = 6440 + 4200 = 10640
		expect(calculateIRPEF(40000, IRPEF_2025).tax).toBeCloseTo(10640, 2);
	});

	it('terzo scaglione: 60.000 -> 18.440', () => {
		// 6440 + 22000*0.35 + 10000*0.43 = 6440 + 7700 + 4300 = 18440
		expect(calculateIRPEF(60000, IRPEF_2025).tax).toBeCloseTo(18440, 2);
	});

	it('aliquota effettiva coerente e < marginale', () => {
		const r = calculateIRPEF(60000, IRPEF_2025);
		expect(r.effectiveRate).toBeCloseTo(18440 / 60000, 6);
		expect(r.effectiveRate).toBeLessThan(0.43);
	});
});

describe('Capital gain', () => {
	it('azioni/ETF al 26%', () => {
		expect(calculateCapitalGainsTax(10000, 'stocks')).toBeCloseTo(2600, 2);
		expect(calculateCapitalGainsTax(10000, 'etf')).toBeCloseTo(2600, 2);
	});

	it('titoli di stato al 12,5%', () => {
		expect(calculateCapitalGainsTax(10000, 'government_bonds')).toBeCloseTo(1250, 2);
	});

	it('minusvalenza o zero -> nessuna imposta', () => {
		expect(calculateCapitalGainsTax(0, 'stocks')).toBe(0);
		expect(calculateCapitalGainsTax(-5000, 'stocks')).toBe(0);
	});
});

describe('Imposte patrimoniali (bollo/IVAFE)', () => {
	it('bollo titoli 0,2% su 500.000 -> 1.000', () => {
		expect(calculateStampDuty(500000)).toBeCloseTo(1000, 2);
	});

	it('IVAFE 0,2% su 100.000 -> 200', () => {
		expect(calculateIVAFE(100000)).toBeCloseTo(200, 2);
	});

	it('valore <= 0 -> nessuna imposta', () => {
		expect(calculateStampDuty(0)).toBe(0);
		expect(calculateIVAFE(-1)).toBe(0);
	});
});
