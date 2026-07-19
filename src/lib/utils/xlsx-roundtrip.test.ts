import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

/**
 * Copre la sostituzione di xlsx con la distribuzione ufficiale SheetJS
 * (tarball CDN, vedi package.json). Esercita esattamente le API usate da
 * broker-import.ts / bank-import.ts: costruzione workbook, scrittura in
 * ArrayBuffer, lettura con `type: 'array'` e `sheet_to_json({ header: 1 })`.
 * Se un aggiornamento della libreria rompe questo contratto, la CI lo segnala.
 */
describe('xlsx (distribuzione SheetJS) — round-trip write→read', () => {
	const rows: (string | number)[][] = [
		['Data', 'Descrizione', 'Importo'],
		['2026-01-15', 'Acquisto ETF', 1000.5],
		['2026-02-20', 'Dividendo', -42]
	];

	it('preserva righe e valori tra scrittura e rilettura', () => {
		const ws = XLSX.utils.aoa_to_sheet(rows);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Movimenti');

		// Scrittura in ArrayBuffer (stesso 'type: array' dell'import)
		const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
		expect(buf.byteLength).toBeGreaterThan(0);

		// Rilettura
		const parsed = XLSX.read(buf, { type: 'array' });
		expect(parsed.SheetNames).toContain('Movimenti');

		const sheet = parsed.Sheets[parsed.SheetNames[0]];
		const out = XLSX.utils.sheet_to_json(sheet, {
			header: 1,
			raw: true,
			defval: ''
		}) as unknown[][];

		expect(out).toEqual(rows);
	});

	it('espone le API usate dagli import (read, utils.sheet_to_json)', () => {
		expect(typeof XLSX.read).toBe('function');
		expect(typeof XLSX.utils.sheet_to_json).toBe('function');
	});
});
