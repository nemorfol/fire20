import { describe, it, expect } from 'vitest';
import {
	checkTFRAnticipationEligibility,
	compareTFRDestination,
	type TFRAnticipationReason
} from './tfr-rules';

/**
 * Test di caratterizzazione (characterization test): fissano il comportamento
 * ATTUALE di `tfr-rules.ts`, non lo ridefiniscono. Servono da rete di sicurezza
 * ora che il modulo viene esposto in UI (tab "Destinazione TFR" in /fondo-pensione).
 *
 * Riferimenti normativi del modulo (da verificare, non da modificare qui):
 * - Anticipazione TFR: art. 2120 c.c. (8 anni anzianita', max 70%, una volta sola,
 *   limite del 10% aventi diritto/anno per aziende > 25 dipendenti).
 * - Destinazione TFR: D.Lgs. 252/2005 (rivalutazione azienda 1,5% + 75% inflazione;
 *   fondo pensione tassato 20% sui rendimenti e 15%→9% sui contributi in prestazione).
 * - Rivalutazione TFR in azienda: coerente con `DEFAULT_2026.tfr` (1,5% fisso + 75%
 *   inflazione) in assumptions.ts / docs/ASSUNZIONI-FISCALI.md.
 */

describe('checkTFRAnticipationEligibility — eleggibilita anticipo TFR (art. 2120 c.c.)', () => {
	const reason: TFRAnticipationReason = 'firstHome';

	it('non eleggibile se gia richiesta una volta (una sola nel rapporto)', () => {
		const r = checkTFRAnticipationEligibility(20, 30000, reason, 0.35, true);
		expect(r.eligible).toBe(false);
		expect(r.maxPercentage).toBe(0);
		expect(r.maxAmount).toBe(0);
		expect(r.expectedTaxRate).toBe(0);
		expect(r.reason).toMatch(/una sola volta/i);
	});

	it('non eleggibile con meno di 8 anni di anzianita', () => {
		const r = checkTFRAnticipationEligibility(7, 30000, reason);
		expect(r.eligible).toBe(false);
		expect(r.maxAmount).toBe(0);
		expect(r.reason).toMatch(/8 anni/);
	});

	it('eleggibile esattamente a 8 anni di anzianita', () => {
		const r = checkTFRAnticipationEligibility(8, 30000, reason);
		expect(r.eligible).toBe(true);
	});

	it('non eleggibile se il TFR maturato e <= 0', () => {
		const r = checkTFRAnticipationEligibility(10, 0, reason);
		expect(r.eligible).toBe(false);
		expect(r.reason).toMatch(/insufficiente/i);
	});

	it('eleggibile: max 70% del TFR maturato, importo arrotondato', () => {
		const r = checkTFRAnticipationEligibility(10, 30000, reason, 0.35);
		expect(r.eligible).toBe(true);
		expect(r.maxPercentage).toBe(0.7);
		expect(r.maxAmount).toBe(21000); // 30000 * 0.7
	});

	it('tassazione stimata = clamp(marginalIRPEF * 0.85, 0.15, 0.43)', () => {
		// 0,35 * 0,85 = 0,2975 (dentro il range)
		expect(checkTFRAnticipationEligibility(10, 30000, reason, 0.35).expectedTaxRate).toBeCloseTo(
			0.2975,
			6
		);
		// aliquota molto bassa -> floor 0,15
		expect(checkTFRAnticipationEligibility(10, 30000, reason, 0.1).expectedTaxRate).toBeCloseTo(
			0.15,
			6
		);
		// aliquota massima 0,43 -> 0,43 * 0,85 = 0,3655 (sotto il cap, resta 0,3655)
		expect(checkTFRAnticipationEligibility(10, 30000, reason, 0.43).expectedTaxRate).toBeCloseTo(
			0.3655,
			6
		);
	});

	it('marginalIRPEF di default = 0,27 (tax rate 0,2295)', () => {
		const r = checkTFRAnticipationEligibility(10, 30000, reason);
		expect(r.expectedTaxRate).toBeCloseTo(0.2295, 6);
	});

	it('il motivo dichiarato compare nella spiegazione', () => {
		const r = checkTFRAnticipationEligibility(10, 30000, 'medical');
		expect(r.reason).toMatch(/sanitarie/i);
	});
});

describe('compareTFRDestination — TFR in azienda vs fondo pensione (D.Lgs. 252/2005)', () => {
	it('scenario base: FP conviene con rendimento 4% vs inflazione 2%', () => {
		const r = compareTFRDestination(2000, 20, 0.02, 0.04, 0.35);
		expect(r.inCompanyNet).toBe(37753);
		expect(r.inPensionFundNet).toBe(49448);
		expect(r.advantagePensionFund).toBe(11695);
		expect(r.companyAnnualReturn).toBe(-0.0029);
		expect(r.pensionFundAnnualReturn).toBe(0.0107);
		expect(r.recommendation).toMatch(/Fondo pensione preferibile/);
	});

	it('azienda conviene se il fondo rende meno (1%) e inflazione alta (3%)', () => {
		const r = compareTFRDestination(2000, 20, 0.03, 0.01, 0.35);
		expect(r.inCompanyNet).toBe(40769);
		expect(r.inPensionFundNet).toBe(37791);
		expect(r.advantagePensionFund).toBe(-2978);
		expect(r.recommendation).toMatch(/TFR in azienda preferibile/);
	});

	it('orizzonte lungo (30 anni) e aliquota 43%: vantaggio FP ampio', () => {
		const r = compareTFRDestination(2593, 30, 0.02, 0.05, 0.43);
		expect(r.inCompanyNet).toBe(78274);
		expect(r.inPensionFundNet).toBe(137260);
		expect(r.advantagePensionFund).toBe(58986);
	});

	it('advantagePensionFund = inPensionFundNet - inCompanyNet (coerenza interna)', () => {
		const r = compareTFRDestination(2500, 25, 0.02, 0.035, 0.33);
		expect(r.advantagePensionFund).toBe(r.inPensionFundNet - r.inCompanyNet);
	});

	it('rivalutazione azienda = 1,5% + 75% inflazione (piu inflazione -> piu montante lordo azienda)', () => {
		// A parita di tutto il resto, alzare l'inflazione aumenta il netto in azienda.
		const low = compareTFRDestination(2000, 20, 0.01, 0.04, 0.35);
		const high = compareTFRDestination(2000, 20, 0.05, 0.04, 0.35);
		expect(high.inCompanyNet).toBeGreaterThan(low.inCompanyNet);
	});
});
