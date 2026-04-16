/**
 * Store per scenari community condivisi.
 * Usa localStorage per persistenza (nessun backend necessario).
 */
import type { SharedScenario } from './scenario-share';

const STORAGE_KEY = 'fire-community-scenarios';

function load(): SharedScenario[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SharedScenario[];
  } catch {
    return [];
  }
}

function save(scenarios: SharedScenario[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function getCommunityScenarios(): SharedScenario[] {
  return load();
}

export function addCommunityScenario(scenario: SharedScenario): boolean {
  const scenarios = load();
  // Evita duplicati per id
  if (scenarios.some(s => s.id === scenario.id)) return false;
  scenarios.push(scenario);
  save(scenarios);
  return true;
}

export function removeCommunityScenario(id: string) {
  const scenarios = load().filter(s => s.id !== id);
  save(scenarios);
}

export function clearCommunityScenarios() {
  save([]);
}

// === Statistiche aggregate ===

export interface CommunityStats {
  count: number;
  avgSavingsRate: number;
  avgFireNumber: number;
  avgYearsToFire: number;
  avgPortfolioSize: number;
  avgWithdrawalRate: number;
  avgStockAllocation: number;
  fireTypeDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  ageRangeDistribution: Record<string, number>;
  incomeRangeDistribution: Record<string, number>;
}

export function computeCommunityStats(scenarios?: SharedScenario[]): CommunityStats {
  const data = scenarios || load();
  const n = data.length;

  if (n === 0) {
    return {
      count: 0,
      avgSavingsRate: 0,
      avgFireNumber: 0,
      avgYearsToFire: 0,
      avgPortfolioSize: 0,
      avgWithdrawalRate: 0,
      avgStockAllocation: 0,
      fireTypeDistribution: {},
      regionDistribution: {},
      ageRangeDistribution: {},
      incomeRangeDistribution: {}
    };
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => sum(arr) / arr.length;
  const countBy = (arr: string[]) => {
    const map: Record<string, number> = {};
    for (const v of arr) { map[v] = (map[v] || 0) + 1; }
    return map;
  };

  return {
    count: n,
    avgSavingsRate: Math.round(avg(data.map(s => s.savingsRate))),
    avgFireNumber: Math.round(avg(data.map(s => s.fireNumber))),
    avgYearsToFire: Math.round(avg(data.map(s => s.yearsToFire)) * 10) / 10,
    avgPortfolioSize: Math.round(avg(data.map(s => s.portfolioSize))),
    avgWithdrawalRate: Math.round(avg(data.map(s => s.withdrawalRate)) * 100) / 100,
    avgStockAllocation: Math.round(avg(data.map(s => s.stockAllocation))),
    fireTypeDistribution: countBy(data.map(s => s.fireType)),
    regionDistribution: countBy(data.map(s => s.region)),
    ageRangeDistribution: countBy(data.map(s => s.ageRange)),
    incomeRangeDistribution: countBy(data.map(s => s.incomeRange))
  };
}
