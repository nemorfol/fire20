/**
 * Benchmark internazionali FIRE per confronto con il piano dell'utente.
 */

export interface FIREBenchmark {
  name: string;
  country: string;
  flag: string;
  description: string;
  avgSavingsRate: number;      // %
  avgYearsToFire: number;
  typicalFireNumber: number;   // in EUR
  typicalSWR: number;          // %
  avgNetWorth: number;         // at FIRE, in EUR
  taxRate: number;             // effective investment tax rate %
  healthcareCost: number;      // annual, in EUR
  costOfLivingIndex: number;   // relative to Italy = 100
}

export const fireBenchmarks: FIREBenchmark[] = [
  {
    name: 'Italia - Citta\' Grande',
    country: 'IT', flag: '\u{1F1EE}\u{1F1F9}',
    description: 'FIRE in citta\' come Milano, Roma. Costo della vita alto, ma sanita\' pubblica SSN.',
    avgSavingsRate: 35, avgYearsToFire: 18, typicalFireNumber: 625000,
    typicalSWR: 3.5, avgNetWorth: 700000, taxRate: 26,
    healthcareCost: 500, costOfLivingIndex: 100
  },
  {
    name: 'Italia - Provincia',
    country: 'IT', flag: '\u{1F1EE}\u{1F1F9}',
    description: 'FIRE in provincia o al Sud. Costi ridotti del 30-40%, qualita\' della vita alta.',
    avgSavingsRate: 45, avgYearsToFire: 14, typicalFireNumber: 400000,
    typicalSWR: 3.5, avgNetWorth: 450000, taxRate: 26,
    healthcareCost: 300, costOfLivingIndex: 65
  },
  {
    name: 'USA - Media',
    country: 'US', flag: '\u{1F1FA}\u{1F1F8}',
    description: 'FIRE americano classico. Redditi alti ma sanita\' costosa e nessuna pensione pubblica.',
    avgSavingsRate: 50, avgYearsToFire: 12, typicalFireNumber: 1000000,
    typicalSWR: 4.0, avgNetWorth: 1200000, taxRate: 15,
    healthcareCost: 12000, costOfLivingIndex: 110
  },
  {
    name: 'Svizzera',
    country: 'CH', flag: '\u{1F1E8}\u{1F1ED}',
    description: 'Redditi altissimi ma costo della vita estremo. Ideale per frontalieri che spendono in Italia.',
    avgSavingsRate: 40, avgYearsToFire: 15, typicalFireNumber: 1500000,
    typicalSWR: 3.5, avgNetWorth: 1600000, taxRate: 20,
    healthcareCost: 6000, costOfLivingIndex: 180
  },
  {
    name: 'Portogallo (NHR)',
    country: 'PT', flag: '\u{1F1F5}\u{1F1F9}',
    description: 'Destinazione popolare per FIRE europei. Regime NHR con tassazione agevolata sui redditi esteri.',
    avgSavingsRate: 30, avgYearsToFire: 20, typicalFireNumber: 350000,
    typicalSWR: 4.0, avgNetWorth: 400000, taxRate: 10,
    healthcareCost: 1000, costOfLivingIndex: 55
  },
  {
    name: 'Sud-Est Asiatico',
    country: 'SEA', flag: '\u{1F30F}',
    description: 'Geoarbitrage estremo. Thailandia, Vietnam, Bali. Costi bassissimi, qualita\' variabile.',
    avgSavingsRate: 25, avgYearsToFire: 25, typicalFireNumber: 250000,
    typicalSWR: 4.0, avgNetWorth: 300000, taxRate: 0,
    healthcareCost: 2000, costOfLivingIndex: 35
  },
  {
    name: 'Germania',
    country: 'DE', flag: '\u{1F1E9}\u{1F1EA}',
    description: 'Redditi medi-alti, tassazione investimenti al 26.375% (simile all\'Italia). Sanita\' pubblica.',
    avgSavingsRate: 38, avgYearsToFire: 16, typicalFireNumber: 700000,
    typicalSWR: 3.5, avgNetWorth: 750000, taxRate: 26,
    healthcareCost: 800, costOfLivingIndex: 95
  },
  {
    name: 'Spagna',
    country: 'ES', flag: '\u{1F1EA}\u{1F1F8}',
    description: 'Costo della vita moderato, clima ideale, sanita\' pubblica. Beckham law per expat.',
    avgSavingsRate: 30, avgYearsToFire: 19, typicalFireNumber: 450000,
    typicalSWR: 3.5, avgNetWorth: 500000, taxRate: 21,
    healthcareCost: 600, costOfLivingIndex: 75
  }
];
