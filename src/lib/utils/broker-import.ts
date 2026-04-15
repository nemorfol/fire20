/**
 * Import di portafoglio da broker italiani comuni.
 * Supporta CSV, XLS (Fineco) e classificazione automatica delle posizioni.
 */
import * as XLSX from 'xlsx';

export interface PortfolioImport {
  stocks: number;
  bonds: number;
  cash: number;
  gold: number;
  other: number;
  positions: { name: string; value: number; type: string }[];
}

export interface BrokerTemplate {
  id: string;
  name: string;
  description: string;
  sampleHeaders: string[];
  parser: (csv: string) => PortfolioImport;
}

// Keywords per classificazione automatica
const BOND_KEYWORDS = ['bond', 'obbligaz', 'btp', 'cct', 'bot', 'treasury', 'govt', 'government', 'aggregate', 'fixed income', 'reddito fisso'];
const GOLD_KEYWORDS = ['gold', 'oro', 'precious', 'prezios', 'xau'];
const CASH_KEYWORDS = ['money market', 'monetar', 'liquidita', 'cash', 'deposito', 'overnight', 'eonia', 'ester', 'xeon'];
const STOCK_KEYWORDS = ['stock', 'azione', 'equity', 'azionari', 'msci', 'sp500', 's&p', 'nasdaq', 'ftse', 'world', 'emerging', 'small cap'];

function classifyPosition(name: string, isin?: string): string {
  const lower = name.toLowerCase();

  // Classificazione per ISIN prefix (ETF/fondi comuni)
  if (isin) {
    const prefix = isin.substring(0, 2).toUpperCase();
    // Non e' un indicatore affidabile da solo, ma possiamo usarlo in combinazione
  }

  if (BOND_KEYWORDS.some(k => lower.includes(k))) return 'Obbligazione';
  if (GOLD_KEYWORDS.some(k => lower.includes(k))) return 'Oro';
  if (CASH_KEYWORDS.some(k => lower.includes(k))) return 'Liquidita';
  if (STOCK_KEYWORDS.some(k => lower.includes(k))) return 'Azione';

  // Default: classifico come azione (il tipo piu' comune)
  return 'Azione';
}

function typeToCategory(type: string): 'stocks' | 'bonds' | 'cash' | 'gold' | 'other' {
  const lower = type.toLowerCase();
  if (lower === 'azione' || lower === 'etf' || lower.includes('azion')) return 'stocks';
  if (lower === 'obbligazione' || lower.includes('obbligaz') || lower.includes('bond')) return 'bonds';
  if (lower === 'oro' || lower.includes('gold') || lower.includes('oro')) return 'gold';
  if (lower === 'liquidita' || lower.includes('cash') || lower.includes('liquid')) return 'cash';
  return 'other';
}

function buildResult(positions: { name: string; value: number; type: string }[]): PortfolioImport {
  const result: PortfolioImport = { stocks: 0, bonds: 0, cash: 0, gold: 0, other: 0, positions };
  for (const pos of positions) {
    const cat = typeToCategory(pos.type);
    result[cat] += pos.value;
  }
  return result;
}

function parseNumber(s: string): number {
  if (!s) return 0;
  // Gestisco sia formato italiano (1.234,56) che internazionale (1,234.56)
  let cleaned = s.trim().replace(/[€$£\s]/g, '');
  // Se contiene sia punto che virgola, determiniamo il formato
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato italiano: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato internazionale: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Solo virgola: potrebbe essere decimale italiano
    cleaned = cleaned.replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseCSVLines(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.map(line => {
    // Semplice parsing CSV (gestisce campi tra virgolette)
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

function parseDirecta(csv: string): PortfolioImport {
  const rows = parseCSVLines(csv);
  if (rows.length < 2) return buildResult([]);

  const headers = rows[0];
  const isinIdx = findColumnIndex(headers, ['isin']);
  const descIdx = findColumnIndex(headers, ['descrizione', 'nome', 'titolo']);
  const valueIdx = findColumnIndex(headers, ['controvalore', 'valore', 'mkt value']);

  const positions: { name: string; value: number; type: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const name = descIdx >= 0 ? row[descIdx] : row[1] || '';
    const isin = isinIdx >= 0 ? row[isinIdx] : row[0] || '';
    const value = parseNumber(valueIdx >= 0 ? row[valueIdx] : row[row.length - 1] || '0');
    if (!name || value === 0) continue;
    const type = classifyPosition(name, isin);
    positions.push({ name, value: Math.abs(value), type });
  }
  return buildResult(positions);
}

/**
 * Parser Fineco - gestisce il vero formato XLS esportato da Fineco.
 * Colonne: Titolo, ISIN, Simbolo, Mercato, Strumento, Valuta, Quantita',
 * P.zo medio di carico, Cambio di carico, Valore di carico,
 * P.zo di mercato, Cambio di mercato, Valore di mercato €, Var%, Var €, Var in valuta, Rateo
 *
 * Usa la colonna "Strumento" (ETF, Obbligazione, Azione, Fondo, ecc.) per classificazione primaria.
 */
function parseFinecoFromRows(rows: string[][]): PortfolioImport {
  if (rows.length < 2) return buildResult([]);

  // Trova la riga di intestazione (Fineco mette 2 righe di titolo prima)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map(c => c.toLowerCase().trim());
    if (row.some(c => c === 'titolo') && row.some(c => c === 'isin')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: prova il vecchio parsing CSV
    return parseFinecoCSVFallback(rows);
  }

  const headers = rows[headerIdx];
  const nameIdx = findColumnIndex(headers, ['titolo']);
  const isinIdx = findColumnIndex(headers, ['isin']);
  const instrumentIdx = findColumnIndex(headers, ['strumento']);
  const valueIdx = findColumnIndex(headers, ['valore di mercato', 'valore di mercato €']);
  // Fallback su "controvalore"
  const valueFallback = valueIdx >= 0 ? valueIdx : findColumnIndex(headers, ['controvalore']);

  const positions: { name: string; value: number; type: string }[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const name = (nameIdx >= 0 ? row[nameIdx] : '').trim();
    const isin = (isinIdx >= 0 ? row[isinIdx] : '').trim();
    const instrument = (instrumentIdx >= 0 ? row[instrumentIdx] : '').trim();
    const valIdx = valueFallback >= 0 ? valueFallback : row.length - 5;
    const value = parseNumber(row[valIdx] || '0');

    // Salta righe vuote, di intestazione, totale, o valuta senza ISIN (riga riepilogo Fineco)
    if (!name || value === 0) continue;
    if (name.toLowerCase().startsWith('totale') || name.toLowerCase().startsWith('portafoglio')) continue;
    if (!isin && !instrument && name.length <= 3) continue; // Riga "EUR" di totale Fineco

    // Classifica usando la colonna "Strumento" di Fineco + nome titolo
    let type: string;
    const instrLower = instrument.toLowerCase();
    if (instrLower === 'obbligazione' || instrLower.includes('obblig')) {
      type = 'Obbligazione';
    } else if (instrLower === 'etf') {
      // ETF puo' essere azionario, obbligazionario o oro - classifica dal nome
      type = classifyPosition(name, isin);
    } else if (instrLower === 'azione') {
      type = 'Azione';
    } else if (instrLower === 'fondo' || instrLower.includes('fondo')) {
      type = classifyPosition(name, isin);
    } else {
      type = classifyPosition(name, isin);
    }

    positions.push({ name: `${name}${isin ? ' (' + isin + ')' : ''}`, value: Math.abs(value), type });
  }
  return buildResult(positions);
}

function parseFinecoCSVFallback(rows: string[][]): PortfolioImport {
  const headers = rows[0];
  const nameIdx = findColumnIndex(headers, ['titolo', 'nome', 'descrizione']);
  const isinIdx = findColumnIndex(headers, ['isin']);
  const valueIdx = findColumnIndex(headers, ['controvalore', 'valore', 'controvalore eur', 'valore di mercato']);

  const positions: { name: string; value: number; type: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const name = nameIdx >= 0 ? row[nameIdx] : row[0] || '';
    const isin = isinIdx >= 0 ? row[isinIdx] : row[1] || '';
    const value = parseNumber(valueIdx >= 0 ? row[valueIdx] : row[row.length - 1] || '0');
    if (!name || value === 0) continue;
    const type = classifyPosition(name, isin);
    positions.push({ name, value: Math.abs(value), type });
  }
  return buildResult(positions);
}

function parseFineco(csv: string): PortfolioImport {
  return parseFinecoFromRows(parseCSVLines(csv));
}

/**
 * Parsa un file XLS/XLSX binario (come l'export Fineco).
 * Accetta un ArrayBuffer dal FileReader.
 */
export function parseFinecoXLS(data: ArrayBuffer): PortfolioImport {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // raw: true per avere numeri come numeri (non stringhe formattate)
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    // Converti tutto a stringhe per il parser unificato
    const rows: string[][] = rawRows.map(row => row.map(cell => {
      if (typeof cell === 'number') return cell.toString();
      return String(cell ?? '');
    }));
    return parseFinecoFromRows(rows);
  } catch {
    return buildResult([]);
  }
}

function parseDegiro(csv: string): PortfolioImport {
  const rows = parseCSVLines(csv);
  if (rows.length < 2) return buildResult([]);

  const headers = rows[0];
  const nameIdx = findColumnIndex(headers, ['prodotto', 'product', 'nome']);
  const isinIdx = findColumnIndex(headers, ['isin']);
  const valueIdx = findColumnIndex(headers, ['valore in eur', 'valore', 'value in eur', 'value']);

  const positions: { name: string; value: number; type: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const name = nameIdx >= 0 ? row[nameIdx] : row[0] || '';
    const isin = isinIdx >= 0 ? row[isinIdx] : row[1] || '';
    const value = parseNumber(valueIdx >= 0 ? row[valueIdx] : row[row.length - 1] || '0');
    if (!name || value === 0) continue;
    const type = classifyPosition(name, isin);
    positions.push({ name, value: Math.abs(value), type });
  }
  return buildResult(positions);
}

function parseGeneric(csv: string): PortfolioImport {
  const rows = parseCSVLines(csv);
  if (rows.length < 2) return buildResult([]);

  const headers = rows[0];
  const nameIdx = findColumnIndex(headers, ['nome', 'name', 'titolo', 'descrizione']);
  const typeIdx = findColumnIndex(headers, ['tipo', 'type', 'categoria', 'category']);
  const valueIdx = findColumnIndex(headers, ['valore', 'value', 'controvalore', 'importo']);

  const positions: { name: string; value: number; type: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const name = nameIdx >= 0 ? row[nameIdx] : row[0] || '';
    const rawType = typeIdx >= 0 ? row[typeIdx] : '';
    const value = parseNumber(valueIdx >= 0 ? row[valueIdx] : row[row.length - 1] || '0');
    if (!name || value === 0) continue;
    const type = rawType ? rawType : classifyPosition(name);
    positions.push({ name, value: Math.abs(value), type });
  }
  return buildResult(positions);
}

export const brokerTemplates: BrokerTemplate[] = [
  {
    id: 'directa',
    name: 'Directa SIM',
    description: 'Export dal portafoglio Directa',
    sampleHeaders: ['ISIN', 'Descrizione', 'Quantita', 'PMC', 'Controvalore'],
    parser: parseDirecta
  },
  {
    id: 'fineco',
    name: 'Fineco Bank',
    description: 'Export portafoglio Fineco (CSV o XLS)',
    sampleHeaders: ['Titolo', 'ISIN', 'Strumento', 'Valore di mercato €'],
    parser: parseFineco
  },
  {
    id: 'degiro',
    name: 'DEGIRO',
    description: 'Export portafoglio DEGIRO',
    sampleHeaders: ['Prodotto', 'ISIN', 'Quantita', 'Prezzo di chiusura', 'Valore in EUR'],
    parser: parseDegiro
  },
  {
    id: 'generic',
    name: 'CSV Generico',
    description: 'Formato: Nome, Tipo (Azione/Obbligazione/ETF/Oro/Altro), Valore',
    sampleHeaders: ['Nome', 'Tipo', 'Valore'],
    parser: parseGeneric
  }
];

export function parseBrokerCSV(csv: string, templateId: string): PortfolioImport | null {
  const template = brokerTemplates.find(t => t.id === templateId);
  if (!template) return null;
  try {
    return template.parser(csv);
  } catch {
    return null;
  }
}
