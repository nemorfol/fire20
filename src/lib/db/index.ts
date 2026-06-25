/**
 * Database layer per l'applicazione FIRE.
 * Usa Dexie.js per IndexedDB con schema tipizzato.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { LifeEvent } from '$lib/engine/life-events';

export type { LifeEvent } from '$lib/engine/life-events';

// === Interfacce per i sotto-oggetti ===

export interface PortfolioAllocation {
	stocks: number;
	bonds: number;
	cash: number;
	realEstate: number;
	gold: number;
	crypto: number;
	pensionFund: number;
	tfr: number;
	other: number;
}

export interface MonthlyContributions {
	stocks: number;
	bonds: number;
	cash: number;
	realEstate: number;
	gold: number;
	crypto: number;
	pensionFund: number;
	tfr: number;
	other: number;
}

export interface Debt {
	name: string;
	balance: number;
	interestRate: number;
	monthlyPayment: number;
	remainingMonths: number;
}

export interface Child {
	name: string;
	birthYear: number;
	/** Spesa corrente mensile a carico della famiglia (abbigliamento, scuola, sport, cibo extra, ecc.) */
	monthlyExpense: number;
	/** Età in cui si prevede inizi l'università. Se omesso, niente costi universitari. */
	universityStartAge?: number;
	/** Durata prevista del percorso universitario in anni (es. 5) */
	universityYears?: number;
	/** Costo annuo universitario (tasse + vitto + alloggio fuori sede) in euro di oggi */
	universityAnnualCost?: number;
	/** Età in cui si assume che il figlio diventi autonomo e le spese cessino (default 25) */
	independenceAge?: number;
}

export interface Mortgage {
	/** Capitale residuo oggi */
	balance: number;
	/** Tasso annuo (0.035 = 3,5%). Indicativo: usato solo per info e calcolo rata. */
	interestRate: number;
	/** Rata mensile (capitale + interessi) */
	monthlyPayment: number;
	/** Mesi residui dalla data odierna */
	remainingMonths: number;
}

export interface PensionInfo {
	contributionYears: number;
	estimatedMonthly: number;
	pensionAge: number;
}

/**
 * Profilo del coniuge / partner convivente. Modella un secondo soggetto del
 * nucleo familiare con redditi, INPS e pensione propri. La logica fiscale
 * italiana e' "individuale" (no joint filing): IRPEF si calcola separatamente
 * per ciascuno, ma i flussi si sommano nel cash flow del nucleo.
 *
 * Nota: i contributi al fondo pensione del coniuge vanno dichiarati a parte
 * (campo `pensionFundContribution`) perche' la deducibilita' e' personale.
 */
export interface Spouse {
	/** Nome del partner (per UI) */
	name: string;
	/** Anno di nascita */
	birthYear: number;
	/** Eta' di pensionamento attesa (puo' essere diversa dall'utente principale) */
	retirementAge: number;
	/** Reddito annuale lordo (busta paga / autonomo) */
	annualIncome: number;
	/** Tipo contratto (per il calcolo INPS e netto) */
	contractType: 'dipendente' | 'autonomo' | 'parasubordinato';
	/** Crescita reale annua del reddito (es. 0.01 = +1% sopra l'inflazione) */
	incomeGrowthRate: number;
	/** Pensione INPS attesa (mensile lorda) */
	pensionMonthly: number;
	/** Eta' di accesso alla pensione INPS */
	pensionAge: number;
	/** Anni di contribuzione attuali */
	contributionYears: number;
	/** Contributo annuo al fondo pensione complementare (deducibile per il partner) */
	pensionFundContribution: number;
	/** Patrimonio investito (liquido) gia' di proprieta' del coniuge, in euro di oggi.
	 *  Si aggiunge al patrimonio del nucleo nel calcolo FIRE (le imposte italiane su
	 *  investimenti sono piatte, quindi aggregare equivale a tenerli separati). */
	initialPortfolio?: number;
	/** Eta' di reversibilita' della pensione del primo (60% standard) — solo informativa */
	includeReversibility?: boolean;
}

/** Configurazione di una asset class salvata nel DB */
export interface SavedAssetClassConfig {
	name: string;
	allocation: number;
	expectedReturn: number;
	stdDev: number;
}

export interface SimulationParams {
	withdrawalRate: number;
	withdrawalStrategy: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based' | 'amortized';
	/** Valore terminale target (euro di oggi) per la strategia 'amortized' (die-with-X) */
	targetBequest?: number;
	stockAllocation: number;
	bondAllocation: number;
	glidePathEnabled: boolean;
	inflationRate: number;
	expectedReturn: number;
	iterations: number;
	/** Configurazione multi-asset (opzionale, per simulazioni avanzate) */
	assetClasses?: SavedAssetClassConfig[];
}

// === Interfacce delle tabelle ===

export interface Profile {
	id: number;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	birthYear: number;
	retirementAge: number;
	lifeExpectancy: number;
	annualIncome: number;
	incomeGrowthRate: number;
	otherIncome: number;
	/**
	 * Eta' fino alla quale gli "altri redditi" (affitti, dividendi, royalties,
	 * rendite) continuano a essere percepiti. Se omesso o <= retirementAge,
	 * gli altri redditi cessano al FIRE (comportamento legacy: reddito attivo).
	 * Se > retirementAge, vengono trattati come rendita passiva perpetua.
	 * Default consigliato per rendite passive: lifeExpectancy.
	 */
	otherIncomeEndAge?: number;
	annualExpenses: number;
	fireExpenses: number;
	expenseInflation: number;
	portfolio: PortfolioAllocation;
	monthlyContributions: MonthlyContributions;
	debts: Debt[];
	pension: PensionInfo;
	simulation: SimulationParams;
	/** Figli a carico (spese ricorrenti + eventuale università). Additivo: assente su profili legacy. */
	children?: Child[];
	/** Mutuo prima casa. Additivo: assente su profili legacy. */
	mortgage?: Mortgage;
	/** Eventi di vita parametrici (bonus, disoccupazione, spese una-tantum, part-time). Additivo. */
	lifeEvents?: LifeEvent[];
	/** Stock minusvalenze pregresse (compensabili per 4 anni). Additivo. */
	capitalLossStock?: { year: number; remaining: number }[];
	/**
	 * Coniuge / partner convivente. Quando presente, il calcolatore modella
	 * il nucleo a due redditi: due IRPEF separate, due INPS, eventualmente
	 * due fondi pensione. Le spese sono di nucleo (annualExpenses copre
	 * entrambi). Additivo: assente sui profili legacy. (db v5)
	 */
	spouse?: Spouse;
	/**
	 * Quota del portafoglio detenuta su intermediari ESTERI (0..1). Influenza
	 * IVAFE vs bollo titoli nel calcolo annuale. Default 0 (tutto IT). (db v5)
	 */
	foreignBrokerShare?: number;
	/**
	 * ID del set di assunzioni fiscali da usare per le proiezioni di questo
	 * profilo. Default 'default-2026'. (db v5)
	 */
	assumptionsId?: string;
	/**
	 * Glide path equity→bond: se true, l'allocazione equity decresce nel tempo
	 * tra `glidePathStartEquity` (oggi) e `glidePathEndEquity` (a lifeExpectancy).
	 * (db v5)
	 */
	glidePathEnabled?: boolean;
	glidePathStartEquity?: number;
	glidePathEndEquity?: number;
}

export interface Scenario {
	id: number;
	profileId: number;
	name: string;
	description: string;
	type: 'optimistic' | 'pessimistic' | 'custom' | 'historical';
	createdAt: Date;
	overrides: Partial<Profile>;
}

export interface Percentiles {
	p5: number;
	p10: number;
	p25: number;
	p50: number;
	p75: number;
	p90: number;
	p95: number;
}

export interface YearlyDataPoint {
	year: number;
	median: number;
	p5: number;
	p25: number;
	p75: number;
	p95: number;
	successRate: number;
}

export interface SimulationResult {
	id: number;
	scenarioId: number;
	profileId: number;
	runAt: Date;
	iterations: number;
	years: number;
	successRate: number;
	medianFinalValue: number;
	percentiles: Percentiles;
	yearlyData: YearlyDataPoint[];
	params: SimulationParams;
}

export interface RiskEventImpact {
	portfolioShock: number;
	expenseIncrease: number;
	incomeReduction: number;
	duration: number;
	yearOfOccurrence: number;
	returnReduction: number;
}

export interface RiskEvent {
	id: number;
	name: string;
	type: 'health' | 'market' | 'inflation' | 'geopolitical' | 'personal' | 'longevity';
	description: string;
	impact: RiskEventImpact;
}

export interface PortfolioSnapshotRecord {
	id?: number;
	profileId: number;
	date: Date;
	totalValue: number;
	allocation: Record<string, number>;
	notes?: string;
}

export interface CashFlowRecord {
	id?: number;
	profileId: number;
	date: Date;
	amount: number;
	type: 'contribution' | 'withdrawal' | 'dividend';
	description?: string;
}

// === Database ===

const db = new Dexie('FireDB') as Dexie & {
	profiles: EntityTable<Profile, 'id'>;
	scenarios: EntityTable<Scenario, 'id'>;
	simulation_results: EntityTable<SimulationResult, 'id'>;
	risk_events: EntityTable<RiskEvent, 'id'>;
	portfolio_snapshots: EntityTable<PortfolioSnapshotRecord, 'id'>;
	cash_flows: EntityTable<CashFlowRecord, 'id'>;
};

db.version(1).stores({
	profiles: '++id, name, createdAt, updatedAt',
	scenarios: '++id, profileId, name, type, createdAt',
	simulation_results: '++id, scenarioId, profileId, runAt',
	risk_events: '++id, name, type'
});

db.version(2).stores({
	profiles: '++id, name, createdAt, updatedAt',
	scenarios: '++id, profileId, name, type, createdAt',
	simulation_results: '++id, scenarioId, profileId, runAt',
	risk_events: '++id, name, type',
	portfolio_snapshots: '++id, profileId, date',
	cash_flows: '++id, profileId, date, type'
});

// v3: aggiunta campi opzionali children[] e mortgage al Profile.
// Schema store invariato (nessun nuovo indice): i campi nuovi sono additivi
// e i profili esistenti continuano a funzionare senza migrazione.
db.version(3).stores({
	profiles: '++id, name, createdAt, updatedAt',
	scenarios: '++id, profileId, name, type, createdAt',
	simulation_results: '++id, scenarioId, profileId, runAt',
	risk_events: '++id, name, type',
	portfolio_snapshots: '++id, profileId, date',
	cash_flows: '++id, profileId, date, type'
});

// v4: aggiunti lifeEvents[] e capitalLossStock[] al Profile (additivi).
db.version(4).stores({
	profiles: '++id, name, createdAt, updatedAt',
	scenarios: '++id, profileId, name, type, createdAt',
	simulation_results: '++id, scenarioId, profileId, runAt',
	risk_events: '++id, name, type',
	portfolio_snapshots: '++id, profileId, date',
	cash_flows: '++id, profileId, date, type'
});

// v5: aggiunti spouse, foreignBrokerShare, assumptionsId, glide path al Profile.
// Tutti additivi: profili esistenti continuano a funzionare senza migrazione.
db.version(5).stores({
	profiles: '++id, name, createdAt, updatedAt',
	scenarios: '++id, profileId, name, type, createdAt',
	simulation_results: '++id, scenarioId, profileId, runAt',
	risk_events: '++id, name, type',
	portfolio_snapshots: '++id, profileId, date',
	cash_flows: '++id, profileId, date, type'
});

export { db };

export type {
	Profile as ProfileRecord,
	Scenario as ScenarioRecord,
	SimulationResult as SimulationResultRecord,
	RiskEvent as RiskEventRecord
};
