/**
 * Esportazione CSV del cash flow annuale (YearlyProjection[]).
 * Formato Excel italiano: separatore ";", decimali virgola, header in italiano.
 */
import type { YearlyProjection } from '$lib/engine/fire-calculator';

/** Formatta un numero per CSV italiano (decimali con virgola) */
function fmt(value: number | undefined): string {
	if (value === undefined || value === null || !isFinite(value)) return '';
	const rounded = Math.round(value);
	return rounded.toString().replace('.', ',');
}

/** Escape di un valore per CSV: racchiude in virgolette se contiene separatore o virgolette */
function csvEscape(value: string): string {
	if (value.includes(';') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/** Costruisce la stringa CSV del cash flow annuale */
export function buildCashFlowCSV(projections: YearlyProjection[]): string {
	const headers = [
		'Anno',
		'Eta',
		'Stipendio lordo',
		'IRPEF + addizionali',
		'Contributi INPS',
		'Stipendio netto',
		'Pensione INPS',
		'Altri redditi',
		'Rendimenti lordi',
		'Tasse rendimenti',
		'Rendimenti netti',
		'Contributi investimento',
		'Spese base',
		'Spese figli',
		'Rata mutuo',
		'Spese totali',
		'Prelievi portafoglio',
		'Portafoglio fine anno'
	];

	const rows = projections.map((p) => [
		p.year.toString(),
		p.age.toString(),
		fmt(p.grossSalary),
		fmt(p.irpef),
		fmt(p.inpsContributions),
		fmt(p.netSalary),
		fmt(p.pensionIncome),
		fmt(p.otherIncomeActive),
		fmt(p.investmentReturnsGross),
		fmt(p.taxes),
		fmt(p.returns),
		fmt(p.contributions),
		fmt(p.baseExpenses),
		fmt(p.childrenExpenses),
		fmt(p.mortgagePayment),
		fmt(p.totalExpenses),
		fmt(p.withdrawals),
		fmt(p.portfolio)
	]);

	const lines = [
		headers.map(csvEscape).join(';'),
		...rows.map((r) => r.map(csvEscape).join(';'))
	];
	// BOM UTF-8 per Excel italiano
	return '﻿' + lines.join('\r\n');
}

/**
 * Avvia il download del CSV nel browser.
 */
export function exportCashFlowCSV(
	projections: YearlyProjection[],
	filename: string = 'cash-flow-fire.csv'
): void {
	const csv = buildCashFlowCSV(projections);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	// Cleanup dopo un breve delay
	setTimeout(() => URL.revokeObjectURL(url), 100);
}
