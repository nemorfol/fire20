/**
 * Import di movimenti bancari da estratti conto italiani.
 * Supporta CSV, XLS/XLSX e categorizzazione automatica.
 */
import * as XLSX from 'xlsx';

export interface BankTransaction {
  date: string;          // ISO date
  description: string;
  amount: number;        // positive = income, negative = expense
  balance?: number;
  category?: string;     // auto-categorized
}

export interface BankImportResult {
  transactions: BankTransaction[];
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  period: { from: string; to: string };
  categorySummary: { category: string; total: number; count: number }[];
}

export interface BankTemplate {
  id: string;
  name: string;
  description: string;
  parser: (data: string | ArrayBuffer) => BankImportResult;
}

// === Auto-categorizzazione movimenti bancari italiani ===

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: 'Stipendio',
    keywords: ['stipendio', 'bonifico ricorrente', 'accredito mensile', 'emolumenti', 'busta paga', 'cedolino']
  },
  {
    category: 'Affitto/Mutuo',
    keywords: ['affitto', 'canone locazione', 'mutuo', 'rata mutuo', 'canone mensile']
  },
  {
    category: 'Bollette',
    keywords: ['enel', 'eni gas', 'edison', 'a2a', 'hera', 'sorgenia', 'tim', 'vodafone', 'wind', 'fastweb', 'iliad', 'acqua', 'gas naturale', 'luce', 'energia elettrica', 'tiscali']
  },
  {
    category: 'Supermercato',
    keywords: ['esselunga', 'coop', 'conad', 'lidl', 'eurospin', 'carrefour', 'pam', 'auchan', 'md ', 'penny', 'aldi', 'despar', 'tigre', 'simply']
  },
  {
    category: 'Trasporti',
    keywords: ['trenitalia', 'italo', 'atm', 'atac', 'autostrad', 'telepass', 'eni station', 'q8', 'ip distribuzione', 'benzina', 'carburante', 'parcheggio', 'uber', 'taxi']
  },
  {
    category: 'Abbonamenti',
    keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'dazn', 'sky', 'apple.com', 'google storage', 'youtube premium', 'audible']
  },
  {
    category: 'Ristoranti',
    keywords: ['ristorante', 'pizz', 'bar ', 'mcdon', 'burger', 'deliveroo', 'glovo', 'just eat', 'trattoria', 'osteria', 'kebab', 'sushi']
  },
  {
    category: 'Salute',
    keywords: ['farmacia', 'medico', 'dentist', 'ospedale', 'poliambulatorio', 'visita medica', 'laboratorio analisi', 'ottica']
  },
  {
    category: 'Investimenti',
    keywords: ['directa', 'fineco trading', 'degiro', 'moneyfarm', 'scalable', 'trading', 'investimento']
  },
  {
    category: 'Tasse',
    keywords: ['f24', 'agenzia entrate', 'inps', 'contribut', 'imposta', 'tari', 'imu', 'irpef']
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'zalando', 'h&m', 'zara', 'ikea', 'mediaworld', 'unieuro', 'decathlon', 'paypal']
  }
];

export function categorizeTransaction(description: string): string {
  const lower = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.category;
    }
  }
  return 'Altro';
}

export const ALL_CATEGORIES = [
  'Stipendio', 'Affitto/Mutuo', 'Bollette', 'Supermercato', 'Trasporti',
  'Abbonamenti', 'Ristoranti', 'Shopping', 'Salute', 'Investimenti', 'Tasse', 'Altro'
];

// === Utility di parsing ===

function parseNumber(s: string): number {
  if (!s) return 0;
  let cleaned = s.trim().replace(/[€$£\s]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseCSVLines(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.map(line => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().replace(/['"]/g, '').trim());
  for (const candidate of candidates) {
    const idx = normalized.findIndex(h => h.includes(candidate.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Parsa una data in vari formati italiani e restituisce ISO date */
function parseDate(s: string): string {
  if (!s) return '';
  const cleaned = s.trim().replace(/['"]/g, '');

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // yyyy-mm-dd (already ISO)
  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return cleaned;

  // dd/mm/yy
  const dmy2 = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmy2) {
    const [, d, m, y] = dmy2;
    const fullYear = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Excel serial date number
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    return date.toISOString().slice(0, 10);
  }

  return cleaned;
}

function buildResult(transactions: BankTransaction[]): BankImportResult {
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  const dates = transactions.map(t => t.date).filter(d => d).sort();
  const period = {
    from: dates[0] || '',
    to: dates[dates.length - 1] || ''
  };

  // Build category summary
  const catMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    const cat = t.category || 'Altro';
    const existing = catMap.get(cat) || { total: 0, count: 0 };
    existing.total += t.amount;
    existing.count++;
    catMap.set(cat, existing);
  }
  const categorySummary = Array.from(catMap.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => a.total - b.total); // expenses (negative) first

  return {
    transactions,
    totalIncome,
    totalExpenses,
    netFlow: totalIncome + totalExpenses,
    period,
    categorySummary
  };
}

// === Parser: Fineco Movimenti ===

function parseFinecoMovimenti(data: string | ArrayBuffer): BankImportResult {
  const rows = typeof data === 'string' ? parseCSVLines(data) : xlsToRows(data);
  if (rows.length < 2) return buildResult([]);

  // Fineco movimenti: Data, Entrate, Uscite, Descrizione, Descrizione Completa, Stato
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map(c => c.toLowerCase().trim());
    if (row.some(c => c.includes('data')) &&
        (row.some(c => c.includes('entrate')) || row.some(c => c.includes('descrizione')))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const headers = rows[headerIdx];
  const dateIdx = findColumnIndex(headers, ['data', 'data operazione', 'data valuta']);
  const incomeIdx = findColumnIndex(headers, ['entrate', 'avere', 'accredito']);
  const expenseIdx = findColumnIndex(headers, ['uscite', 'dare', 'addebito']);
  const amountIdx = findColumnIndex(headers, ['importo', 'ammontare']);
  const descIdx = findColumnIndex(headers, ['descrizione completa', 'descrizione_completa', 'descrizione']);
  const balanceIdx = findColumnIndex(headers, ['saldo', 'saldo contabile']);

  const transactions: BankTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : row[0] || '');
    const description = (descIdx >= 0 ? row[descIdx] : row[3] || row[1] || '').trim();
    if (!date || !description) continue;

    let amount: number;
    if (amountIdx >= 0) {
      amount = parseNumber(row[amountIdx]);
    } else if (incomeIdx >= 0 && expenseIdx >= 0) {
      const income = parseNumber(row[incomeIdx]);
      const expense = parseNumber(row[expenseIdx]);
      amount = income > 0 ? income : (expense > 0 ? -expense : 0);
    } else {
      amount = parseNumber(row[row.length - 1] || '0');
    }
    if (amount === 0) continue;

    const balance = balanceIdx >= 0 ? parseNumber(row[balanceIdx]) : undefined;

    transactions.push({
      date,
      description,
      amount,
      balance,
      category: categorizeTransaction(description)
    });
  }

  return buildResult(transactions);
}

// === Parser: Intesa Sanpaolo ===

function parseIntesa(data: string | ArrayBuffer): BankImportResult {
  const rows = typeof data === 'string' ? parseCSVLines(data) : xlsToRows(data);
  if (rows.length < 2) return buildResult([]);

  // Intesa: Data contabile, Data valuta, Descrizione, Accrediti, Addebiti
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map(c => c.toLowerCase().trim());
    if (row.some(c => c.includes('data')) && row.some(c => c.includes('descrizione'))) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx];
  const dateIdx = findColumnIndex(headers, ['data contabile', 'data operazione', 'data']);
  const descIdx = findColumnIndex(headers, ['descrizione', 'causale']);
  const creditIdx = findColumnIndex(headers, ['accrediti', 'avere', 'entrate']);
  const debitIdx = findColumnIndex(headers, ['addebiti', 'dare', 'uscite']);
  const amountIdx = findColumnIndex(headers, ['importo', 'ammontare']);
  const balanceIdx = findColumnIndex(headers, ['saldo']);

  const transactions: BankTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : row[0] || '');
    const description = (descIdx >= 0 ? row[descIdx] : row[2] || row[1] || '').trim();
    if (!date || !description) continue;

    let amount: number;
    if (amountIdx >= 0) {
      amount = parseNumber(row[amountIdx]);
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseNumber(row[creditIdx]);
      const debit = parseNumber(row[debitIdx]);
      amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    } else {
      amount = parseNumber(row[row.length - 1] || '0');
    }
    if (amount === 0) continue;

    const balance = balanceIdx >= 0 ? parseNumber(row[balanceIdx]) : undefined;

    transactions.push({
      date,
      description,
      amount,
      balance,
      category: categorizeTransaction(description)
    });
  }

  return buildResult(transactions);
}

// === Parser: UniCredit ===

function parseUniCredit(data: string | ArrayBuffer): BankImportResult {
  const rows = typeof data === 'string' ? parseCSVLines(data) : xlsToRows(data);
  if (rows.length < 2) return buildResult([]);

  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map(c => c.toLowerCase().trim());
    if (row.some(c => c.includes('data')) && (row.some(c => c.includes('importo')) || row.some(c => c.includes('descrizione')))) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx];
  const dateIdx = findColumnIndex(headers, ['data contabile', 'data operazione', 'data']);
  const descIdx = findColumnIndex(headers, ['descrizione', 'causale', 'dettaglio']);
  const amountIdx = findColumnIndex(headers, ['importo', 'ammontare']);
  const creditIdx = findColumnIndex(headers, ['accrediti', 'avere', 'entrate']);
  const debitIdx = findColumnIndex(headers, ['addebiti', 'dare', 'uscite']);
  const balanceIdx = findColumnIndex(headers, ['saldo']);

  const transactions: BankTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : row[0] || '');
    const description = (descIdx >= 0 ? row[descIdx] : row[1] || '').trim();
    if (!date || !description) continue;

    let amount: number;
    if (amountIdx >= 0) {
      amount = parseNumber(row[amountIdx]);
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseNumber(row[creditIdx]);
      const debit = parseNumber(row[debitIdx]);
      amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    } else {
      amount = parseNumber(row[row.length - 1] || '0');
    }
    if (amount === 0) continue;

    const balance = balanceIdx >= 0 ? parseNumber(row[balanceIdx]) : undefined;

    transactions.push({
      date,
      description,
      amount,
      balance,
      category: categorizeTransaction(description)
    });
  }

  return buildResult(transactions);
}

// === Parser: CSV Generico ===

function parseGenericCSV(data: string | ArrayBuffer): BankImportResult {
  const rows = typeof data === 'string' ? parseCSVLines(data) : xlsToRows(data);
  if (rows.length < 2) return buildResult([]);

  const headers = rows[0];
  const dateIdx = findColumnIndex(headers, ['data', 'date', 'data operazione', 'data contabile']);
  const descIdx = findColumnIndex(headers, ['descrizione', 'description', 'causale', 'dettaglio']);
  const amountIdx = findColumnIndex(headers, ['importo', 'amount', 'ammontare']);
  const creditIdx = findColumnIndex(headers, ['entrate', 'accrediti', 'avere', 'credit']);
  const debitIdx = findColumnIndex(headers, ['uscite', 'addebiti', 'dare', 'debit']);
  const balanceIdx = findColumnIndex(headers, ['saldo', 'balance']);

  const transactions: BankTransaction[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : row[0] || '');
    const description = (descIdx >= 0 ? row[descIdx] : row[1] || '').trim();
    if (!date && !description) continue;

    let amount: number;
    if (amountIdx >= 0) {
      amount = parseNumber(row[amountIdx]);
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseNumber(row[creditIdx]);
      const debit = parseNumber(row[debitIdx]);
      amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    } else {
      // Fallback: use last numeric column
      amount = parseNumber(row[row.length - 1] || '0');
    }
    if (amount === 0) continue;

    const balance = balanceIdx >= 0 ? parseNumber(row[balanceIdx]) : undefined;

    transactions.push({
      date: date || '',
      description,
      amount,
      balance,
      category: categorizeTransaction(description)
    });
  }

  return buildResult(transactions);
}

// === Helper XLS -> rows ===

function xlsToRows(data: ArrayBuffer): string[][] {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    return rawRows.map(row => row.map(cell => {
      if (typeof cell === 'number') return cell.toString();
      return String(cell ?? '');
    }));
  } catch {
    return [];
  }
}

// === Exported templates ===

export const bankTemplates: BankTemplate[] = [
  {
    id: 'fineco-movimenti',
    name: 'Fineco - Movimenti',
    description: 'Export movimenti conto corrente Fineco',
    parser: parseFinecoMovimenti
  },
  {
    id: 'intesa-movimenti',
    name: 'Intesa Sanpaolo',
    description: 'Export movimenti conto Intesa Sanpaolo',
    parser: parseIntesa
  },
  {
    id: 'unicredit',
    name: 'UniCredit',
    description: 'Export movimenti conto UniCredit',
    parser: parseUniCredit
  },
  {
    id: 'generic-csv',
    name: 'CSV Generico (Data, Descrizione, Importo)',
    description: 'Formato generico con colonne Data, Descrizione, Importo',
    parser: parseGenericCSV
  }
];

export function parseBankData(data: string | ArrayBuffer, templateId: string): BankImportResult | null {
  const template = bankTemplates.find(t => t.id === templateId);
  if (!template) return null;
  try {
    return template.parser(data);
  } catch {
    return null;
  }
}

/** Ricalcola i totali dopo modifica manuale delle categorie */
export function recalculateResult(transactions: BankTransaction[]): BankImportResult {
  return buildResult(transactions);
}
