/**
 * Condivisione anonima di scenari FIRE per benchmark community.
 * Gli scenari vengono codificati in base64 e condivisi via URL hash.
 */
import type { Profile } from '$lib/db/index';

export interface SharedScenario {
  id: string;
  createdAt: string;
  // Dati anonimi (nessuna info personale)
  ageRange: string;        // "25-30", "30-35", etc.
  region: string;          // "Nord", "Centro", "Sud", "Isole"
  incomeRange: string;     // "20-30k", "30-40k", etc.
  savingsRate: number;     // percentuale 0-100
  fireNumber: number;
  yearsToFire: number;
  portfolioSize: number;
  // Allocazione
  stockAllocation: number;
  bondAllocation: number;
  otherAllocation: number;
  // Strategia
  withdrawalStrategy: string;
  withdrawalRate: number;
  // Risultati simulazione
  successRate?: number;
  // Tipo FIRE
  fireType: 'LeanFIRE' | 'FIRE' | 'FatFIRE' | 'BaristaFIRE' | 'CoastFIRE';
}

// === Codifica / Decodifica ===

export function encodeScenario(scenario: SharedScenario): string {
  try {
    const json = JSON.stringify(scenario);
    // Use btoa for base64 encoding (works in browser)
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

export function decodeScenario(encoded: string): SharedScenario | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const obj = JSON.parse(json);
    // Validazione minima
    if (!obj.id || !obj.fireType) return null;
    return obj as SharedScenario;
  } catch {
    return null;
  }
}

export function generateShareURL(scenario: SharedScenario): string {
  const encoded = encodeScenario(scenario);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/community#data=${encoded}`;
}

// === Anonimizzazione ===

function getAgeRange(birthYear: number): string {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const lower = Math.floor(age / 5) * 5;
  return `${lower}-${lower + 5}`;
}

function getIncomeRange(income: number): string {
  if (income < 15000) return '<15k';
  if (income < 20000) return '15-20k';
  if (income < 25000) return '20-25k';
  if (income < 30000) return '25-30k';
  if (income < 40000) return '30-40k';
  if (income < 50000) return '40-50k';
  if (income < 60000) return '50-60k';
  if (income < 80000) return '60-80k';
  if (income < 100000) return '80-100k';
  return '>100k';
}

function classifyFireType(annualExpenses: number, fireExpenses: number): SharedScenario['fireType'] {
  // Based on annual expenses in FIRE
  if (fireExpenses < 15000) return 'LeanFIRE';
  if (fireExpenses < 25000) return 'FIRE';
  if (fireExpenses < 40000) return 'FIRE';
  if (fireExpenses < 60000) return 'FatFIRE';
  return 'FatFIRE';
}

function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

export function anonymizeProfile(profile: Profile, region: string = 'Nord'): SharedScenario {
  const totalIncome = profile.annualIncome + profile.otherIncome;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - profile.annualExpenses) / totalIncome) * 100) : 0;

  const totalPortfolio = Object.values(profile.portfolio).reduce((s, v) => s + (v || 0), 0);
  const stockVal = (profile.portfolio.stocks || 0) + (profile.portfolio.crypto || 0);
  const bondVal = profile.portfolio.bonds || 0;
  const otherVal = totalPortfolio - stockVal - bondVal;

  const stockPct = totalPortfolio > 0 ? Math.round((stockVal / totalPortfolio) * 100) : 60;
  const bondPct = totalPortfolio > 0 ? Math.round((bondVal / totalPortfolio) * 100) : 40;
  const otherPct = 100 - stockPct - bondPct;

  const withdrawalRate = profile.simulation?.withdrawalRate || 0.04;
  const fireNumber = profile.fireExpenses > 0 ? Math.round(profile.fireExpenses / withdrawalRate) : 0;

  // Stima anni al FIRE
  const annualSavings = totalIncome - profile.annualExpenses;
  const totalContributions = Object.values(profile.monthlyContributions).reduce((s, v) => s + (v || 0), 0) * 12;
  const expectedReturn = profile.simulation?.expectedReturn || 0.07;
  let yearsToFire = 0;
  if (annualSavings > 0 && fireNumber > totalPortfolio) {
    // Formula approssimata
    let balance = totalPortfolio;
    while (balance < fireNumber && yearsToFire < 100) {
      balance = balance * (1 + expectedReturn) + totalContributions;
      yearsToFire++;
    }
  }

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ageRange: getAgeRange(profile.birthYear),
    region,
    incomeRange: getIncomeRange(totalIncome),
    savingsRate: Math.max(0, Math.min(100, savingsRate)),
    fireNumber,
    yearsToFire,
    portfolioSize: totalPortfolio,
    stockAllocation: stockPct,
    bondAllocation: bondPct,
    otherAllocation: Math.max(0, otherPct),
    withdrawalStrategy: profile.simulation?.withdrawalStrategy || 'fixed',
    withdrawalRate: Math.round(withdrawalRate * 10000) / 100, // as percentage
    fireType: classifyFireType(profile.annualExpenses, profile.fireExpenses)
  };
}
