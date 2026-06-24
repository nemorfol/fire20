import { describe, it, expect } from 'vitest';
import {
	calculateIRPEF,
	calculateCapitalGainsTax,
	calculateStampDuty,
	calculateIVAFE,
	applyCapitalLossOffset,
	addCapitalLoss,
	calculateEmployeeRelief,
	calculateNetSalary,
	invertNetSalary,
	calculateInpsWorkerContribution
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

describe('Compensazione minusvalenze (TUIR art. 67/68)', () => {
	it('azioni singole: la plusvalenza (reddito diverso) compensa le minus pregresse', () => {
		const stock = addCapitalLoss([], 2022, 5000);
		const r = applyCapitalLossOffset(8000, 2024, stock, 'stocks');
		expect(r.lossUsed).toBeCloseTo(5000, 2);
		expect(r.netTaxableGain).toBeCloseTo(3000, 2);
		expect(r.taxDue).toBeCloseTo(3000 * 0.26, 2); // 780
	});

	it('ETF armonizzato: la plusvalenza e\' reddito di capitale, NON compensabile', () => {
		const stock = addCapitalLoss([], 2022, 5000);
		const r = applyCapitalLossOffset(8000, 2024, stock, 'etf');
		expect(r.lossUsed).toBe(0);
		expect(r.netTaxableGain).toBeCloseTo(8000, 2);
		expect(r.taxDue).toBeCloseTo(8000 * 0.26, 2); // 2080, tassa piena
		// La minus NON viene consumata: resta disponibile.
		const residua = r.updatedLossStock.reduce((s, l) => s + l.remaining, 0);
		expect(residua).toBeCloseTo(5000, 2);
	});

	it('minusvalenza scaduta (oltre 4 anni) non e\' utilizzabile', () => {
		const stock = addCapitalLoss([], 2018, 5000);
		const r = applyCapitalLossOffset(8000, 2024, stock, 'stocks');
		expect(r.lossUsed).toBe(0);
		expect(r.netTaxableGain).toBeCloseTo(8000, 2);
	});
});

describe('Detrazioni lavoro dipendente 2026 (art.13 + cuneo)', () => {
	it('art.13: <=15.000 -> 1.955 fisso', () => {
		expect(calculateEmployeeRelief(10000, 10000).detrazioneLavoroDipendente).toBeCloseTo(1955, 2);
	});

	it('art.13: fascia 28-50k con +65 a 35.000', () => {
		// 1910*(50000-35000)/22000 + 65 = 1302.27 + 65
		expect(calculateEmployeeRelief(35000, 35000).detrazioneLavoroDipendente).toBeCloseTo(1367.27, 1);
	});

	it('art.13: oltre 50.000 -> 0', () => {
		expect(calculateEmployeeRelief(55000, 55000).detrazioneLavoroDipendente).toBe(0);
	});

	it('cuneo: somma integrativa solo <=20k (5,3% a 10k)', () => {
		expect(calculateEmployeeRelief(10000, 10000).sommaIntegrativa).toBeCloseTo(530, 2);
		expect(calculateEmployeeRelief(30000, 30000).sommaIntegrativa).toBe(0);
	});

	it('cuneo: ulteriore detrazione 1.000 piena a 30k, decrescente a 36k', () => {
		expect(calculateEmployeeRelief(30000, 30000).ulterioreDetrazione).toBeCloseTo(1000, 2);
		// 1000*(40000-36000)/8000 = 500
		expect(calculateEmployeeRelief(36000, 36000).ulterioreDetrazione).toBeCloseTo(500, 2);
	});
});

describe('Netto in busta paga 2026 (con detrazioni)', () => {
	it('RAL 30.000 dipendente -> netto ~23.359 (le detrazioni contano!)', () => {
		const r = calculateNetSalary(30000);
		expect(r.net).toBeCloseTo(23359.4, 0);
		expect(r.irpefLorda).toBeCloseTo(6265.89, 1);
		expect(r.detrazioni).toBeCloseTo(3044.29, 1);
		// IRPEF netta < lorda: la detrazione e' applicata.
		expect(r.irpef).toBeLessThan(r.irpefLorda ?? Infinity);
	});

	it('no-tax area: a RAL 9.000 l\'IRPEF netta e\' 0 e c\'e\' il bonus cuneo', () => {
		const r = calculateNetSalary(9000);
		expect(r.irpef).toBe(0);
		expect(r.bonusCuneo ?? 0).toBeGreaterThan(0);
	});

	it('autonomo/parasubordinato: nessuna detrazione lavoro dipendente', () => {
		const dip = calculateNetSalary(30000, 'dipendente');
		const auto = calculateNetSalary(30000, 'autonomo');
		expect(dip.detrazioni ?? 0).toBeGreaterThan(0);
		expect(auto.detrazioni ?? 0).toBe(0);
	});
});

describe('invertNetSalary (bisezione) - consistenza col forward', () => {
	for (const gross of [25000, 40000, 60000, 90000]) {
		it(`round-trip a RAL ${gross}`, () => {
			const net = calculateNetSalary(gross).net;
			const back = invertNetSalary(net);
			expect(Math.abs(back - gross)).toBeLessThan(2);
		});
	}

	it('netto <= 0 -> lordo 0', () => {
		expect(invertNetSalary(0)).toBe(0);
		expect(invertNetSalary(-100)).toBe(0);
	});
});

describe('Contributi INPS lavoratore: banda +1% e massimale', () => {
	it('sotto la prima fascia: solo aliquota base 9,19%', () => {
		expect(calculateInpsWorkerContribution(40000, 'dipendente')).toBeCloseTo(40000 * 0.0919, 1);
	});

	it('tra prima fascia e massimale: +1% sulla fascia eccedente', () => {
		// 56224*0.0919 + (80000-56224)*0.1019
		const atteso = 56224 * 0.0919 + (80000 - 56224) * 0.1019;
		expect(calculateInpsWorkerContribution(80000, 'dipendente')).toBeCloseTo(atteso, 1);
	});

	it('oltre il massimale: nessun versamento aggiuntivo (cap)', () => {
		const alMassimale = calculateInpsWorkerContribution(122295, 'dipendente');
		const oltre = calculateInpsWorkerContribution(200000, 'dipendente');
		expect(oltre).toBeCloseTo(alMassimale, 2);
	});

	it('gestione separata (autonomo): base cappata al massimale', () => {
		expect(calculateInpsWorkerContribution(200000, 'autonomo')).toBeCloseTo(122295 * 0.2623, 1);
	});
});
