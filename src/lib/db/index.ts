/**
 * Database layer per l'applicazione FIRE.
 * Usa Dexie.js per IndexedDB con schema tipizzato.
 */
import Dexie, { type EntityTable } from 'dexie';

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

export interface PensionInfo {
	contributionYears: number;
	estimatedMonthly: number;
	pensionAge: number;
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
	withdrawalStrategy: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based';
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
	annualExpenses: number;
	fireExpenses: number;
	expenseInflation: number;
	portfolio: PortfolioAllocation;
	monthlyContributions: MonthlyContributions;
	debts: Debt[];
	pension: PensionInfo;
	simulation: SimulationParams;
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

export { db };

export type {
	Profile as ProfileRecord,
	Scenario as ScenarioRecord,
	SimulationResult as SimulationResultRecord,
	RiskEvent as RiskEventRecord
};
