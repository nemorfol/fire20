/**
 * Parser per l'Estratto Conto Contributivo INPS.
 * Supporta testo copiato dal sito INPS, CSV e formati semplici.
 */

export interface INPSContribution {
  year: number;
  weeks: number;
  grossSalary: number;
  contributions: number;
  employer: string;
}

export interface INPSExtract {
  contributions: INPSContribution[];
  totalWeeks: number;
  totalYears: number;
  totalContributions: number;
  averageSalary: number;
  estimatedMontante: number;
}

/**
 * Clean a numeric string: remove currency symbols, dots as thousands sep, replace comma with dot.
 */
function parseNumber(s: string): number {
  if (!s) return 0;
  // Remove currency symbols, spaces, non-breaking spaces
  let cleaned = s.replace(/[€$£CHF\s\u00a0]/gi, '').trim();
  // If the string has both dots and commas, determine which is the decimal separator
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Comma is decimal separator (Italian format: 1.234,56)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Dot is decimal separator (English format: 1,234.56)
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Only one or neither - remove commas
    cleaned = cleaned.replace(/,/g, '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Build the summary from a list of contributions.
 */
function buildExtract(contributions: INPSContribution[]): INPSExtract {
  const totalWeeks = contributions.reduce((s, c) => s + c.weeks, 0);
  const totalContributions = contributions.reduce((s, c) => s + c.contributions, 0);
  const totalSalary = contributions.reduce((s, c) => s + c.grossSalary, 0);
  const years = contributions.length;
  const averageSalary = years > 0 ? totalSalary / years : 0;
  const estimatedMontante = calculateMontanteFromContributions(contributions);

  return {
    contributions,
    totalWeeks,
    totalYears: years,
    totalContributions,
    averageSalary,
    estimatedMontante,
  };
}

/**
 * Estimate montante contributivo using INPS rules:
 * Each year's contributions are revalued at a composite rate (GDP growth ~1.5% avg).
 */
function calculateMontanteFromContributions(contributions: INPSContribution[]): number {
  const REVALUATION_RATE = 0.015; // average GDP-based revaluation
  const currentYear = new Date().getFullYear();
  let montante = 0;

  for (const c of contributions) {
    const yearsToRevalue = Math.max(0, currentYear - c.year);
    // Contributions compounded at revaluation rate
    montante += c.contributions * Math.pow(1 + REVALUATION_RATE, yearsToRevalue);
  }

  return Math.round(montante * 100) / 100;
}

/**
 * Parse text pasted from INPS website or PDF.
 * Handles tab-separated and space-separated formats.
 */
export function parseINPSExtract(text: string): INPSExtract | null {
  if (!text || !text.trim()) return null;

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return null;

  const contributions: INPSContribution[] = [];

  for (const line of lines) {
    // Skip header lines
    if (/^(anno|year|periodo|#)/i.test(line)) continue;
    if (/^[-=]+$/.test(line)) continue;
    // Skip lines that are clearly not data
    if (!/\d{4}/.test(line)) continue;

    // Try tab-separated first
    let parts = line.split('\t').map(s => s.trim()).filter(s => s.length > 0);

    // If less than 3 parts, try multiple spaces or semicolons
    if (parts.length < 3) {
      parts = line.split(';').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (parts.length < 3) {
      parts = line.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 0);
    }

    if (parts.length < 3) continue;

    // Extract year (first 4-digit number)
    const yearMatch = parts[0].match(/(\d{4})/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);
    if (year < 1950 || year > 2100) continue;

    // Determine field positions based on number of columns
    let weeks = 0;
    let grossSalary = 0;
    let contributionsVal = 0;
    let employer = '';

    if (parts.length >= 5) {
      // Format: year, employer, weeks, salary, contributions
      employer = parts[1];
      weeks = parseNumber(parts[2]);
      grossSalary = parseNumber(parts[3]);
      contributionsVal = parseNumber(parts[4]);
    } else if (parts.length === 4) {
      // Format: year, weeks, salary, contributions
      weeks = parseNumber(parts[1]);
      grossSalary = parseNumber(parts[2]);
      contributionsVal = parseNumber(parts[3]);
    } else if (parts.length === 3) {
      // Format: year, salary, contributions (assume 52 weeks)
      grossSalary = parseNumber(parts[1]);
      contributionsVal = parseNumber(parts[2]);
      weeks = 52;
    }

    // Validate: weeks should be reasonable
    if (weeks > 52) weeks = 52;
    if (weeks <= 0 && grossSalary > 0) weeks = 52;

    // If contributions are 0, estimate at 33% of salary
    if (contributionsVal === 0 && grossSalary > 0) {
      contributionsVal = grossSalary * 0.33;
    }

    if (grossSalary > 0 || contributionsVal > 0) {
      contributions.push({
        year,
        weeks: Math.round(weeks),
        grossSalary: Math.round(grossSalary * 100) / 100,
        contributions: Math.round(contributionsVal * 100) / 100,
        employer,
      });
    }
  }

  if (contributions.length === 0) return null;

  // Sort by year
  contributions.sort((a, b) => a.year - b.year);

  return buildExtract(contributions);
}

/**
 * Parse CSV format with headers: Anno, Settimane, Retribuzione, Contributi
 */
export function parseINPSCsv(csv: string): INPSExtract | null {
  if (!csv || !csv.trim()) return null;

  const lines = csv
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return null;

  // Detect separator
  const header = lines[0];
  let sep = ',';
  if (header.includes(';')) sep = ';';
  else if (header.includes('\t')) sep = '\t';

  const headers = header.split(sep).map(h => h.trim().toLowerCase());

  // Map header names to indices
  const yearIdx = headers.findIndex(h => /^(anno|year)$/i.test(h));
  const weeksIdx = headers.findIndex(h => /^(settimane|weeks|sett)$/i.test(h));
  const salaryIdx = headers.findIndex(h => /^(retribuzione|salary|imponibile|retrib)$/i.test(h));
  const contribIdx = headers.findIndex(h => /^(contributi|contributions|versati)$/i.test(h));
  const employerIdx = headers.findIndex(h => /^(datore|employer|azienda)$/i.test(h));

  if (yearIdx === -1) return null;
  if (salaryIdx === -1 && contribIdx === -1) return null;

  const contributions: INPSContribution[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(s => s.trim());
    if (parts.length <= yearIdx) continue;

    const year = parseInt(parts[yearIdx]);
    if (isNaN(year) || year < 1950 || year > 2100) continue;

    const weeks = weeksIdx >= 0 ? parseNumber(parts[weeksIdx]) : 52;
    const grossSalary = salaryIdx >= 0 ? parseNumber(parts[salaryIdx]) : 0;
    let contributionsVal = contribIdx >= 0 ? parseNumber(parts[contribIdx]) : 0;
    const employer = employerIdx >= 0 ? (parts[employerIdx] || '') : '';

    if (contributionsVal === 0 && grossSalary > 0) {
      contributionsVal = grossSalary * 0.33;
    }

    if (grossSalary > 0 || contributionsVal > 0) {
      contributions.push({
        year,
        weeks: Math.min(Math.round(weeks) || 52, 52),
        grossSalary: Math.round(grossSalary * 100) / 100,
        contributions: Math.round(contributionsVal * 100) / 100,
        employer,
      });
    }
  }

  if (contributions.length === 0) return null;

  contributions.sort((a, b) => a.year - b.year);
  return buildExtract(contributions);
}

/**
 * Calculate montante from a parsed extract.
 */
export function calculateMontanteFromExtract(extract: INPSExtract): number {
  return calculateMontanteFromContributions(extract.contributions);
}
