import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';

/**
 * Verifica la migrazione additiva v5 -> v6 che introduce bfp/cd in
 * PortfolioAllocation/MonthlyContributions: i profili salvati PRIMA non hanno
 * quei campi e l'upgrade li deve backfillare a 0 (cosi' i CurrencyInput non
 * ricevono undefined -> svelte props_invalid_value, cfr. issue #33).
 */
describe('Migrazione Dexie v5 -> v6 (bfp/cd)', () => {
	it('backfilla bfp/cd a 0 sui profili salvati prima della v6, preservando i valori esistenti', async () => {
		// 1) DB "vecchio" alla versione 5 con un profilo SENZA bfp/cd
		const old = new Dexie('FireDB');
		old.version(5).stores({
			profiles: '++id, name, createdAt, updatedAt',
			scenarios: '++id, profileId, name, type, createdAt',
			simulation_results: '++id, scenarioId, profileId, runAt',
			risk_events: '++id, name, type',
			portfolio_snapshots: '++id, profileId, date',
			cash_flows: '++id, profileId, date, type'
		});
		await old.open();
		await old.table('profiles').add({
			name: 'Legacy',
			portfolio: {
				stocks: 1000, bonds: 0, cash: 500, realEstate: 0,
				gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
			},
			monthlyContributions: {
				stocks: 100, bonds: 0, cash: 0, realEstate: 0,
				gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
			}
		});
		old.close();

		// 2) Apertura del DB dell'app (versione 6 con .upgrade) -> esegue la migrazione
		const { db } = await import('./index');
		const profiles = await db.profiles.toArray();
		expect(profiles.length).toBe(1);

		const p = profiles[0];
		expect(p.portfolio.bfp).toBe(0);
		expect(p.portfolio.cd).toBe(0);
		expect(p.monthlyContributions.bfp).toBe(0);
		expect(p.monthlyContributions.cd).toBe(0);
		// i valori preesistenti non vengono toccati
		expect(p.portfolio.stocks).toBe(1000);
		expect(p.portfolio.cash).toBe(500);
	});
});
