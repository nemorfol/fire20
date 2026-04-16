/**
 * Simulatore avanzato pensione INPS.
 * Replica la logica di calcolo contributivo con proiezioni dettagliate,
 * analisi riscatto laurea, RITA e gap FIRE.
 */

export interface INPSSimulatorParams {
  birthYear: number;
  gender: 'M' | 'F';
  firstEmploymentYear: number;
  currentGrossSalary: number;
  salaryGrowthRate: number; // annual % growth (e.g. 2 for 2%)
  contractType: 'dipendente' | 'autonomo' | 'parasubordinato';
  partTime: boolean;
  partTimePercentage: number; // 50-100
  existingContributionYears: number;
  existingMontante: number; // if known from INPS extract
  targetRetirementAge?: number;
  careerGaps?: { fromYear: number; toYear: number; reason: string }[];
  riscattoLaurea?: { years: number; cost: number };
}

export interface PensionAtAge {
  age: number;
  monthlyGross: number;
  monthlyNet: number;
  replacementRate: number;
}

export interface RiscattoLaureaROI {
  costTotal: number;
  taxSaving: number;
  additionalPension: number;
  breakEvenYears: number;
}

export interface INPSSimulatorResult {
  pensionAtAge: PensionAtAge[];
  earliestRetirementAge: number;
  oldAgePensionAge: number;
  optimalRetirementAge: number;
  projectedMontante: number;
  totalContributionYears: number;
  riscattoLaureaROI?: RiscattoLaureaROI;
  fireGapYears: number;
  fireGapCost: number;
  ritaEligible: boolean;
  ritaEarliestAge: number;
  ritaMaxAmount: number;
}

/**
 * Coefficienti di trasformazione INPS (biennio 2025-2026).
 * Mappa eta -> coefficiente.
 */
const TRANSFORMATION_COEFFICIENTS: [number, number][] = [
  [57, 0.04186],
  [58, 0.04289],
  [59, 0.04399],
  [60, 0.04615],
  [61, 0.04763],
  [62, 0.04915],
  [63, 0.05083],
  [64, 0.05245],
  [65, 0.05428],
  [66, 0.05575],
  [67, 0.05723],
  [68, 0.05885],
  [69, 0.06053],
  [70, 0.06254],
  [71, 0.06466],
];

/** Aliquote contributive per tipo contratto */
const CONTRIBUTION_RATES: Record<string, number> = {
  dipendente: 0.33,
  autonomo: 0.2623,
  parasubordinato: 0.3372,
};

/** Tasso medio di rivalutazione del montante (crescita PIL nominale) */
const DEFAULT_GDP_REVALUATION = 0.015;

/** Assegno sociale mensile 2026 */
const SOCIAL_ALLOWANCE_MONTHLY = 534.41;

/**
 * Interpola il coefficiente di trasformazione per un'eta specifica.
 */
function getTransformationCoefficient(age: number): number {
  if (age <= TRANSFORMATION_COEFFICIENTS[0][0]) {
    return TRANSFORMATION_COEFFICIENTS[0][1];
  }
  const last = TRANSFORMATION_COEFFICIENTS[TRANSFORMATION_COEFFICIENTS.length - 1];
  if (age >= last[0]) {
    return last[1];
  }
  for (let i = 0; i < TRANSFORMATION_COEFFICIENTS.length - 1; i++) {
    const [age1, coeff1] = TRANSFORMATION_COEFFICIENTS[i];
    const [age2, coeff2] = TRANSFORMATION_COEFFICIENTS[i + 1];
    if (age >= age1 && age < age2) {
      const fraction = (age - age1) / (age2 - age1);
      return coeff1 + fraction * (coeff2 - coeff1);
    }
  }
  return last[1];
}

/**
 * Calcola IRPEF + addizionali su reddito da pensione.
 * Scaglioni 2026.
 */
function calculateNetFromGross(grossAnnual: number): number {
  if (grossAnnual <= 0) return 0;

  let tax = 0;
  if (grossAnnual <= 15000) {
    tax = grossAnnual * 0.23;
  } else if (grossAnnual <= 28000) {
    tax = 15000 * 0.23 + (grossAnnual - 15000) * 0.25;
  } else if (grossAnnual <= 50000) {
    tax = 15000 * 0.23 + 13000 * 0.25 + (grossAnnual - 28000) * 0.35;
  } else {
    tax = 15000 * 0.23 + 13000 * 0.25 + 22000 * 0.35 + (grossAnnual - 50000) * 0.43;
  }
  // Addizionali regionali/comunali ~2%
  tax += grossAnnual * 0.02;

  return Math.max(0, grossAnnual - tax);
}

/**
 * Aliquota marginale IRPEF per il reddito dato.
 */
function getMarginalTaxRate(grossAnnual: number): number {
  if (grossAnnual <= 15000) return 0.23;
  if (grossAnnual <= 28000) return 0.25;
  if (grossAnnual <= 50000) return 0.35;
  return 0.43;
}

/**
 * Calcola il numero di anni di gap nella carriera.
 */
function calculateGapYears(
  gaps: { fromYear: number; toYear: number }[] | undefined
): number {
  if (!gaps || gaps.length === 0) return 0;
  return gaps.reduce((total, gap) => total + Math.max(0, gap.toYear - gap.fromYear), 0);
}

/**
 * Verifica se un anno cade in un gap di carriera.
 */
function isInGap(
  year: number,
  gaps: { fromYear: number; toYear: number }[] | undefined
): boolean {
  if (!gaps) return false;
  return gaps.some((g) => year >= g.fromYear && year < g.toYear);
}

/**
 * Proietta il montante contributivo anno per anno.
 */
function projectMontante(params: INPSSimulatorParams, retirementAge: number): {
  montante: number;
  contributionYears: number;
  lastSalary: number;
} {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - params.birthYear;
  const retirementYear = params.birthYear + retirementAge;
  const contributionRate = CONTRIBUTION_RATES[params.contractType] || 0.33;
  const growthRate = params.salaryGrowthRate / 100;
  const partTimeFactor = params.partTime ? params.partTimePercentage / 100 : 1;

  // Se abbiamo un montante esistente, lo usiamo come base
  let montante = params.existingMontante || 0;

  // Se non abbiamo montante esistente, calcoliamo quello passato
  if (montante === 0 && params.existingContributionYears > 0) {
    const startYear = currentYear - params.existingContributionYears;
    for (let year = startYear; year < currentYear; year++) {
      if (isInGap(year, params.careerGaps)) continue;
      const yearsFromNow = currentYear - year;
      const pastSalary = params.currentGrossSalary / Math.pow(1 + growthRate, yearsFromNow);
      const contribution = pastSalary * contributionRate * partTimeFactor;
      // Rivaluta fino ad oggi
      montante += contribution * Math.pow(1 + DEFAULT_GDP_REVALUATION, yearsFromNow);
    }
  }

  // Proiezione futura
  let contributionYears = params.existingContributionYears;
  let lastSalary = params.currentGrossSalary;

  for (let year = currentYear; year < retirementYear; year++) {
    if (isInGap(year, params.careerGaps)) {
      // Rivaluta il montante esistente ma non aggiungi contributi
      montante *= 1 + DEFAULT_GDP_REVALUATION;
      continue;
    }
    const yearsFromNow = year - currentYear;
    const futureSalary = params.currentGrossSalary * Math.pow(1 + growthRate, yearsFromNow);
    lastSalary = futureSalary;
    const contribution = futureSalary * contributionRate * partTimeFactor;
    // Rivaluta dal versamento alla pensione
    const yearsToGrow = retirementYear - year - 1;
    montante += contribution * Math.pow(1 + DEFAULT_GDP_REVALUATION, Math.max(0, yearsToGrow));
    contributionYears++;
  }

  // Aggiungi riscatto laurea
  if (params.riscattoLaurea && params.riscattoLaurea.years > 0) {
    // Riscatto laurea aggiunge anni al montante come se fossero contributi
    const avgContribution = params.currentGrossSalary * contributionRate;
    const additionalMontante = avgContribution * params.riscattoLaurea.years;
    montante += additionalMontante;
    contributionYears += params.riscattoLaurea.years;
  }

  return { montante, contributionYears, lastSalary };
}

/**
 * Calcola l'eta minima di pensionamento.
 */
function calculateEarliestRetirementAge(params: INPSSimulatorParams): {
  earliest: number;
  oldAge: number;
} {
  const contributionStartAge = params.firstEmploymentYear - params.birthYear;
  const gapYears = calculateGapYears(params.careerGaps);
  const riscattoYears = params.riscattoLaurea?.years || 0;

  // Canale 1: Pensione di vecchiaia (67 anni, 20 anni contributi)
  const totalContribYearsAt67 = 67 - contributionStartAge - gapYears + riscattoYears;
  const oldAgeEligible = totalContribYearsAt67 >= 20;
  const oldAge = 67;

  // Canale 2: Pensione anticipata (42a 10m uomini / 41a 10m donne)
  const requiredMonths = params.gender === 'M' ? 42 * 12 + 10 : 41 * 12 + 10;
  const effectiveContribMonths = (params.existingContributionYears + riscattoYears) * 12;
  const currentAge = new Date().getFullYear() - params.birthYear;
  const remainingMonths = Math.max(0, requiredMonths - effectiveContribMonths);
  const earlyAge = currentAge + remainingMonths / 12;

  // Canale 3: Pensione anticipata contributiva (64 anni, 20 anni contributi, requisito importo)
  const isFullContributive = params.firstEmploymentYear >= 1996;
  const contributionYearsAt64 = 64 - contributionStartAge - gapYears + riscattoYears;
  const earlyContributiveAge =
    isFullContributive && contributionYearsAt64 >= 20 ? 64 : Infinity;

  const earliest = Math.min(
    oldAgeEligible ? oldAge : Infinity,
    earlyAge,
    earlyContributiveAge
  );

  return {
    earliest: earliest === Infinity ? 67 : Math.ceil(earliest),
    oldAge,
  };
}

/**
 * Simula la pensione INPS con parametri dettagliati.
 */
export function simulateINPSPension(params: INPSSimulatorParams): INPSSimulatorResult {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - params.birthYear;
  const { earliest, oldAge } = calculateEarliestRetirementAge(params);

  // Calcola pensione per ogni eta da 57 a 71
  const pensionAtAge: PensionAtAge[] = [];
  let bestAge = earliest;
  let bestNetMonthly = 0;

  for (let age = 57; age <= 71; age++) {
    if (age < currentAge) continue; // Non puo andare in pensione nel passato

    const { montante, contributionYears, lastSalary } = projectMontante(params, age);
    const coefficient = getTransformationCoefficient(age);
    const grossAnnual = montante * coefficient;
    const grossMonthly = Math.round((grossAnnual / 13) * 100) / 100;
    const netAnnual = calculateNetFromGross(grossAnnual);
    const netMonthly = Math.round((netAnnual / 13) * 100) / 100;
    const replacementRate = lastSalary > 0 ? grossAnnual / lastSalary : 0;

    pensionAtAge.push({
      age,
      monthlyGross: grossMonthly,
      monthlyNet: netMonthly,
      replacementRate: Math.round(replacementRate * 10000) / 10000,
    });

    // Trova l'eta ottimale (miglior rapporto netto)
    if (age >= earliest && netMonthly > bestNetMonthly) {
      bestNetMonthly = netMonthly;
      bestAge = age;
    }
  }

  // Montante proiettato all'eta piu bassa di pensionamento
  const projectionAtEarliest = projectMontante(params, earliest);

  // Riscatto laurea ROI
  let riscattoLaureaROI: RiscattoLaureaROI | undefined;
  if (params.riscattoLaurea && params.riscattoLaurea.years > 0) {
    const costTotal = params.riscattoLaurea.cost;
    // Risparmio fiscale: il costo e deducibile dall'IRPEF
    const marginalRate = getMarginalTaxRate(params.currentGrossSalary);
    const taxSaving = Math.round(costTotal * marginalRate);

    // Pensione aggiuntiva: confronto con/senza riscatto
    const paramsWithout = { ...params, riscattoLaurea: undefined };
    const withRiscatto = projectMontante(params, oldAge);
    const withoutRiscatto = projectMontante(paramsWithout, oldAge);
    const coeffAtOldAge = getTransformationCoefficient(oldAge);
    const additionalAnnual =
      (withRiscatto.montante - withoutRiscatto.montante) * coeffAtOldAge;
    const additionalPension = Math.round(additionalAnnual / 13);

    // Break-even: quanti anni di pensione per recuperare il costo netto
    const netCost = costTotal - taxSaving;
    const breakEvenYears =
      additionalPension > 0
        ? Math.ceil(netCost / (additionalPension * 13))
        : 999;

    riscattoLaureaROI = {
      costTotal,
      taxSaving,
      additionalPension,
      breakEvenYears,
    };
  }

  // FIRE gap
  const targetAge = params.targetRetirementAge || earliest;
  const fireGapYears = Math.max(0, earliest - targetAge);
  const fireGapCost = fireGapYears * params.currentGrossSalary * 0.6; // Stima spese = 60% stipendio

  // RITA
  const ritaEarliestAge = Math.max(57, oldAge - 10);
  const ritaEligible = currentAge <= oldAge && targetAge !== undefined;
  // RITA max: intero fondo pensione complementare (stima)
  const ritaMaxAmount = 0; // Dipende dal fondo complementare, non calcolabile qui

  return {
    pensionAtAge,
    earliestRetirementAge: earliest,
    oldAgePensionAge: oldAge,
    optimalRetirementAge: bestAge,
    projectedMontante: Math.round(projectionAtEarliest.montante),
    totalContributionYears: projectionAtEarliest.contributionYears,
    riscattoLaureaROI,
    fireGapYears,
    fireGapCost: Math.round(fireGapCost),
    ritaEligible,
    ritaEarliestAge,
    ritaMaxAmount,
  };
}

/**
 * Calcola il costo del riscatto laurea (metodo agevolato Art. 2 D.Lgs. 184/1997).
 * Metodo agevolato: aliquota IVS * reddito minimo * anni da riscattare.
 */
export function calculateRiscattoLaureaCost(
  years: number,
  contractType: 'dipendente' | 'autonomo' | 'parasubordinato'
): number {
  // Minimale INPS 2026 (approssimato)
  const INPS_MINIMUM_INCOME = 18415;
  const rate = CONTRIBUTION_RATES[contractType] || 0.33;
  return Math.round(INPS_MINIMUM_INCOME * rate * years);
}
