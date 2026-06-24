import { describe, it, expect } from 'vitest';
import {
	DEFAULT_2026,
	getTransformationCoefficient,
	TRANSFORMATION_COEFFICIENTS_2025_2026
} from './assumptions';
import { calculateIRPEF } from './tax-italy';

// Coefficienti di trasformazione 2025-2026 (DM 20/11/2024). Valori verificati
// con doppio cross-check (fonte secondaria + reciproco del divisore di
// speranza di vita). Questi golden test impediscono regressioni sui numeri
// previdenziali sensibili.
describe('Coefficienti di trasformazione 2025-2026 (DM 20/11/2024)', () => {
	it('valori ufficiali alle eta\' chiave', () => {
		expect(getTransformationCoefficient(57)).toBeCloseTo(0.04204, 5);
		expect(getTransformationCoefficient(65)).toBeCloseTo(0.0525, 5);
		expect(getTransformationCoefficient(67)).toBeCloseTo(0.05608, 5);
		expect(getTransformationCoefficient(71)).toBeCloseTo(0.0651, 5);
	});

	it('reciproco coerente col divisore di speranza di vita', () => {
		// 1/17,831 ~ 5,608% a 67; 1/15,360 ~ 6,510% a 71
		expect(1 / getTransformationCoefficient(67)).toBeCloseTo(17.831, 1);
		expect(1 / getTransformationCoefficient(71)).toBeCloseTo(15.36, 1);
	});

	it('clamp sotto 57 e sopra 71', () => {
		expect(getTransformationCoefficient(50)).toBe(getTransformationCoefficient(57));
		expect(getTransformationCoefficient(80)).toBe(getTransformationCoefficient(71));
	});

	it('interpolazione lineare tra eta\' intere', () => {
		// 66,5 = (5,423% + 5,608%) / 2 = 5,5155%
		expect(getTransformationCoefficient(66.5)).toBeCloseTo((0.05423 + 0.05608) / 2, 6);
	});

	it('monotono crescente con l\'eta\'', () => {
		for (let i = 1; i < TRANSFORMATION_COEFFICIENTS_2025_2026.length; i++) {
			expect(TRANSFORMATION_COEFFICIENTS_2025_2026[i][1]).toBeGreaterThan(
				TRANSFORMATION_COEFFICIENTS_2025_2026[i - 1][1]
			);
		}
	});
});

describe('Massimale contributivo e aliquote 2026', () => {
	it('massimale 2026 = 122.295 (INPS circ. 6/2026)', () => {
		expect(DEFAULT_2026.inps.massimale).toBe(122295);
	});

	it('capital gain 26% / 12,5% titoli di stato; bollo/IVAFE 0,2%', () => {
		expect(DEFAULT_2026.capital.stocksAndEtf).toBe(0.26);
		expect(DEFAULT_2026.capital.governmentBonds).toBe(0.125);
		expect(DEFAULT_2026.capital.stampDuty).toBe(0.002);
		expect(DEFAULT_2026.capital.ivafe).toBe(0.002);
	});
});

// IRPEF 2026: la Legge di Bilancio 2026 ha ridotto la SECONDA aliquota da 35%
// a 33% (23/33/43, soglie 28k/50k). Verificato su fonti fiscali 2026.
// Questo test blinda il valore: se qualcuno lo "corregge" a 35 pensando sia un
// refuso, il test fallisce e costringe a riverificare la fonte.
describe('IRPEF 2026 = 23 / 33 / 43 (taglio 2a aliquota 35->33)', () => {
	it('seconda aliquota effettiva sul tratto 28k-50k = 33%', () => {
		const t40 = calculateIRPEF(40000).tax; // 6440 + 12000*0.33 = 10400
		const t28 = calculateIRPEF(28000).tax; // 6440
		expect((t40 - t28) / (40000 - 28000)).toBeCloseTo(0.33, 6);
	});

	it('40.000 -> 10.400 con le aliquote 2026', () => {
		// 28000*0.23 + 12000*0.33 = 6440 + 3960 = 10400
		expect(calculateIRPEF(40000).tax).toBeCloseTo(10400, 2);
	});
});
