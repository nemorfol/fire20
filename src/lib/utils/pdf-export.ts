/**
 * Generazione report PDF per il FIRE Planner.
 * Usa jsPDF per creare un documento A4 con il riepilogo finanziario del profilo.
 */
import { jsPDF } from 'jspdf';
import type { Profile } from '$lib/db/index';
import {
	calculateFireNumber,
	calculateYearsToFire,
	calculateSavingsRate,
	calculateNetWorth,
	projectPortfolio
} from '$lib/engine/fire-calculator';
import type { YearlyProjection } from '$lib/engine/fire-calculator';

/** Formatta un numero in stile italiano (1.234,56) con suffisso EUR */
function fmtEur(value: number, decimals = 0): string {
	return new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/** Formatta una percentuale in stile italiano */
function fmtPct(value: number): string {
	return new Intl.NumberFormat('it-IT', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 2
	}).format(value / 100);
}

/** Etichette italiane per le categorie del portafoglio */
const PORTFOLIO_LABELS: Record<string, string> = {
	stocks: 'Azioni',
	bonds: 'Obbligazioni',
	cash: 'Liquidita\'',
	realEstate: 'Immobiliare',
	gold: 'Oro',
	crypto: 'Crypto',
	pensionFund: 'Fondo Pensione',
	tfr: 'TFR',
	other: 'Altro'
};

/**
 * Genera e scarica un report PDF completo del profilo FIRE.
 */
export function generateFireReport(profile: Profile): void {
	const doc = new jsPDF('p', 'mm', 'a4');
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 20;
	const contentWidth = pageWidth - margin * 2;
	let y = margin;

	const currentYear = new Date().getFullYear();
	const currentAge = currentYear - profile.birthYear;
	const portfolio = profile.portfolio as unknown as Record<string, number>;
	const netWorth = calculateNetWorth(portfolio);
	const fireNumber = calculateFireNumber(
		profile.fireExpenses,
		profile.simulation.withdrawalRate
	);
	const annualSavings =
		profile.annualIncome + profile.otherIncome - profile.annualExpenses;
	const yearsToFire = calculateYearsToFire(
		netWorth,
		annualSavings,
		profile.simulation.expectedReturn,
		fireNumber
	);
	const savingsRate = calculateSavingsRate(
		profile.annualIncome + profile.otherIncome,
		profile.annualExpenses
	);

	// --- Helper functions ---

	function addTitle(text: string) {
		doc.setFontSize(22);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(30, 64, 175); // blue-800
		doc.text(text, pageWidth / 2, y, { align: 'center' });
		y += 10;
	}

	function addSubtitle(text: string) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(107, 114, 128); // gray-500
		doc.text(text, pageWidth / 2, y, { align: 'center' });
		y += 8;
	}

	function addSectionHeader(text: string) {
		checkPageBreak(16);
		y += 4;
		doc.setFillColor(239, 246, 255); // blue-50
		doc.roundedRect(margin, y - 5, contentWidth, 9, 2, 2, 'F');
		doc.setFontSize(12);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(30, 64, 175);
		doc.text(text, margin + 3, y + 1);
		y += 10;
	}

	function addRow(label: string, value: string) {
		checkPageBreak(8);
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(55, 65, 81); // gray-700
		doc.text(label, margin + 4, y);
		doc.setFont('helvetica', 'bold');
		doc.text(value, pageWidth - margin - 4, y, { align: 'right' });
		y += 7;
	}

	function addSeparator() {
		y += 2;
		doc.setDrawColor(229, 231, 235); // gray-200
		doc.setLineWidth(0.3);
		doc.line(margin, y, pageWidth - margin, y);
		y += 4;
	}

	function checkPageBreak(needed: number) {
		const pageHeight = doc.internal.pageSize.getHeight();
		if (y + needed > pageHeight - 30) {
			doc.addPage();
			y = margin;
		}
	}

	// --- Document content ---

	// Title
	addTitle('FIRE Planner - Report Finanziario');

	// Date and profile
	const dateStr = new Intl.DateTimeFormat('it-IT', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	}).format(new Date());
	addSubtitle(`Generato il ${dateStr} - Profilo: ${profile.name}`);

	addSeparator();

	// Section 1: Dati Personali
	addSectionHeader('1. Dati Personali');
	addRow('Eta\' attuale', `${currentAge} anni`);
	addRow('Anno di nascita', `${profile.birthYear}`);
	addRow('Eta\' pensionamento FIRE', `${profile.retirementAge} anni`);
	addRow('Aspettativa di vita', `${profile.lifeExpectancy} anni`);
	addRow(
		'Anni alla pensione FIRE',
		profile.retirementAge > currentAge
			? `${profile.retirementAge - currentAge} anni`
			: 'Raggiunta'
	);

	// Section 2: Situazione Patrimoniale
	addSectionHeader('2. Situazione Patrimoniale');
	if (portfolio.stocks > 0) addRow('Azioni', fmtEur(portfolio.stocks));
	if (portfolio.bonds > 0) addRow('Obbligazioni', fmtEur(portfolio.bonds));
	if (portfolio.cash > 0) addRow('Liquidita\'', fmtEur(portfolio.cash));
	if (portfolio.realEstate > 0) addRow('Immobiliare', fmtEur(portfolio.realEstate));
	if (portfolio.gold > 0) addRow('Oro', fmtEur(portfolio.gold));
	if (portfolio.crypto > 0) addRow('Crypto', fmtEur(portfolio.crypto));
	if (portfolio.pensionFund > 0) addRow('Fondo Pensione', fmtEur(portfolio.pensionFund));
	if (portfolio.tfr > 0) addRow('TFR', fmtEur(portfolio.tfr));
	if (portfolio.other > 0) addRow('Altro', fmtEur(portfolio.other));
	addSeparator();
	addRow('Patrimonio Netto Totale', fmtEur(netWorth));

	// Section 3: Reddito e Spese
	addSectionHeader('3. Reddito e Spese');
	addRow('Reddito annuale', fmtEur(profile.annualIncome));
	if (profile.otherIncome > 0) addRow('Altri redditi', fmtEur(profile.otherIncome));
	addRow(
		'Reddito totale',
		fmtEur(profile.annualIncome + profile.otherIncome)
	);
	addRow('Spese annuali', fmtEur(profile.annualExpenses));
	addRow('Spese FIRE (in pensione)', fmtEur(profile.fireExpenses));
	addRow('Risparmio annuale', fmtEur(annualSavings));
	addRow('Tasso di risparmio', fmtPct(savingsRate * 100));

	// Section 4: Obiettivo FIRE
	addSectionHeader('4. Obiettivo FIRE');
	addRow('FIRE Number', fmtEur(fireNumber));
	addRow('Patrimonio attuale', fmtEur(netWorth));
	addRow(
		'Progresso',
		fireNumber > 0 ? fmtPct((netWorth / fireNumber) * 100) : 'N/D'
	);
	addRow(
		'Anni al FIRE',
		yearsToFire === -1
			? 'Irraggiungibile'
			: yearsToFire === 0
				? 'Raggiunto!'
				: `${yearsToFire} anni (${currentYear + yearsToFire})`
	);
	addRow(
		'Tasso di prelievo (SWR)',
		fmtPct(profile.simulation.withdrawalRate * 100)
	);
	addRow(
		'Rendimento atteso',
		fmtPct(profile.simulation.expectedReturn * 100)
	);
	addRow('Inflazione prevista', fmtPct(profile.simulation.inflationRate * 100));

	// Section 5: Pensione
	addSectionHeader('5. Pensione');
	addRow('Anni di contributi', `${profile.pension.contributionYears} anni`);
	addRow('Pensione mensile stimata', fmtEur(profile.pension.estimatedMonthly));
	addRow(
		'Pensione annuale stimata',
		fmtEur(profile.pension.estimatedMonthly * 12)
	);
	addRow('Eta\' pensionabile', `${profile.pension.pensionAge} anni`);

	// Section 6: Asset Allocation
	addSectionHeader('6. Asset Allocation');
	if (netWorth > 0) {
		const entries = Object.entries(portfolio).filter(([, v]) => v > 0);
		for (const [key, value] of entries) {
			const pct = ((value / netWorth) * 100).toFixed(1).replace('.', ',');
			const label = PORTFOLIO_LABELS[key] || key;
			addRow(label, `${fmtEur(value)}  (${pct}%)`);
		}
	} else {
		addRow('Nessun patrimonio', '-');
	}

	// === PAGE 2: Summary Box + Portfolio Projection Chart ===
	doc.addPage();
	y = margin;

	// --- Summary Box ---
	addSectionHeader('7. Riepilogo FIRE');
	{
		const boxX = margin;
		const boxY = y;
		const boxW = contentWidth;
		const boxH = 38;

		// Background
		doc.setFillColor(239, 246, 255); // blue-50
		doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F');
		// Border
		doc.setDrawColor(30, 64, 175); // blue-800
		doc.setLineWidth(0.5);
		doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'S');

		const colW = boxW / 4;
		const items = [
			{ label: 'FIRE Number', value: fmtEur(fireNumber) },
			{
				label: 'Anni al FIRE',
				value:
					yearsToFire === -1
						? 'N/D'
						: yearsToFire === 0
							? 'Raggiunto!'
							: `${yearsToFire}`
			},
			{ label: 'Tasso risparmio', value: fmtPct(savingsRate * 100) },
			{
				label: 'Progresso',
				value: fireNumber > 0 ? fmtPct((netWorth / fireNumber) * 100) : 'N/D'
			}
		];

		for (let i = 0; i < items.length; i++) {
			const cx = boxX + colW * i + colW / 2;

			doc.setFontSize(8);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(107, 114, 128);
			doc.text(items[i].label, cx, boxY + 12, { align: 'center' });

			doc.setFontSize(13);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(30, 64, 175);
			doc.text(items[i].value, cx, boxY + 26, { align: 'center' });
		}

		y = boxY + boxH + 10;
	}

	// --- Portfolio Projection Chart ---
	addSectionHeader('8. Proiezione del Portafoglio');
	{
		const projections = projectPortfolio({
			initialPortfolio: netWorth,
			annualContribution: annualSavings,
			annualExpenses: profile.fireExpenses,
			expectedReturn: profile.simulation.expectedReturn,
			inflationRate: profile.simulation.inflationRate,
			taxRate: 0.26,
			withdrawalRate: profile.simulation.withdrawalRate,
			currentAge,
			retirementAge: profile.retirementAge,
			lifeExpectancy: profile.lifeExpectancy,
			startYear: currentYear
		});

		if (projections.length > 0) {
			drawPortfolioChart(doc, projections, margin, y, contentWidth, 100, yearsToFire, currentAge);
			y += 110;
		}
	}

	// === PAGE 3: Asset Allocation Bar + Disclaimer ===
	doc.addPage();
	y = margin;

	// --- Asset Allocation Stacked Bar ---
	addSectionHeader('9. Asset Allocation');
	{
		if (netWorth > 0) {
			const entries = Object.entries(portfolio).filter(([, v]) => v > 0);
			drawAssetAllocationBar(doc, entries, netWorth, margin, y, contentWidth);
			y += 50;
		} else {
			addRow('Nessun patrimonio', '-');
		}
	}

	// Footer / Disclaimer
	checkPageBreak(30);
	y += 8;
	addSeparator();
	doc.setFontSize(8);
	doc.setFont('helvetica', 'italic');
	doc.setTextColor(156, 163, 175); // gray-400
	const disclaimer =
		'Disclaimer: Questo report e\' generato automaticamente a scopo informativo e non costituisce ' +
		'consulenza finanziaria. I calcoli si basano su proiezioni e ipotesi che potrebbero non ' +
		'riflettere i risultati effettivi. Si consiglia di consultare un consulente finanziario ' +
		'qualificato prima di prendere decisioni di investimento.';
	const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
	doc.text(disclaimerLines, margin, y);
	y += disclaimerLines.length * 4 + 4;

	doc.setFont('helvetica', 'normal');
	doc.text(
		'FIRE Planner - https://fireplanner.app',
		pageWidth / 2,
		y,
		{ align: 'center' }
	);

	// Download
	const dateFileName = new Date().toISOString().slice(0, 10);
	doc.save(`fire-report-${dateFileName}.pdf`);
}

// === Chart Drawing Helpers ===

/** Colors for asset allocation segments */
const ASSET_COLORS: Record<string, [number, number, number]> = {
	stocks: [59, 130, 246],      // blue-500
	bonds: [16, 185, 129],       // emerald-500
	cash: [156, 163, 175],       // gray-400
	realEstate: [245, 158, 11],  // amber-500
	gold: [234, 179, 8],         // yellow-500
	crypto: [139, 92, 246],      // violet-500
	pensionFund: [236, 72, 153], // pink-500
	tfr: [14, 165, 233],         // sky-500
	other: [107, 114, 128]       // gray-500
};

/**
 * Draws a simple line chart of portfolio projections using jsPDF primitives.
 */
function drawPortfolioChart(
	doc: jsPDF,
	projections: YearlyProjection[],
	x: number,
	y: number,
	width: number,
	height: number,
	yearsToFire: number,
	currentAge: number
): void {
	const chartX = x + 20; // left margin for Y-axis labels
	const chartY = y;
	const chartW = width - 25;
	const chartH = height - 20; // bottom margin for X-axis labels

	// Find max portfolio value for scaling
	const maxValue = Math.max(...projections.map((p) => p.portfolio), 1);
	const totalPoints = projections.length;

	// Draw background
	doc.setFillColor(250, 250, 250);
	doc.rect(chartX, chartY, chartW, chartH, 'F');

	// Draw gridlines (horizontal)
	const gridLines = 5;
	doc.setDrawColor(229, 231, 235); // gray-200
	doc.setLineWidth(0.2);
	for (let i = 0; i <= gridLines; i++) {
		const gy = chartY + (chartH / gridLines) * i;
		doc.line(chartX, gy, chartX + chartW, gy);

		// Y-axis labels
		const val = maxValue * (1 - i / gridLines);
		doc.setFontSize(6);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(107, 114, 128);
		const label = val >= 1_000_000
			? `${(val / 1_000_000).toFixed(1)}M`
			: val >= 1_000
				? `${(val / 1_000).toFixed(0)}k`
				: `${val.toFixed(0)}`;
		doc.text(label, chartX - 2, gy + 1.5, { align: 'right' });
	}

	// Draw axes
	doc.setDrawColor(107, 114, 128); // gray-500
	doc.setLineWidth(0.4);
	doc.line(chartX, chartY, chartX, chartY + chartH); // Y-axis
	doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X-axis

	// Draw FIRE year vertical dashed line
	if (yearsToFire > 0 && yearsToFire < totalPoints) {
		const fireX = chartX + (yearsToFire / totalPoints) * chartW;
		doc.setDrawColor(239, 68, 68); // red-500
		doc.setLineWidth(0.3);
		// Draw dashed line manually
		const dashLen = 2;
		const gapLen = 1.5;
		let dy = chartY;
		while (dy < chartY + chartH) {
			const endDy = Math.min(dy + dashLen, chartY + chartH);
			doc.line(fireX, dy, fireX, endDy);
			dy = endDy + gapLen;
		}
		// Label
		doc.setFontSize(6);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(239, 68, 68);
		doc.text('FIRE', fireX, chartY - 2, { align: 'center' });
	}

	// Draw portfolio line
	doc.setDrawColor(30, 64, 175); // blue-800
	doc.setLineWidth(0.6);
	for (let i = 1; i < totalPoints; i++) {
		const x1 = chartX + ((i - 1) / totalPoints) * chartW;
		const y1 = chartY + chartH - (projections[i - 1].portfolio / maxValue) * chartH;
		const x2 = chartX + (i / totalPoints) * chartW;
		const y2 = chartY + chartH - (projections[i].portfolio / maxValue) * chartH;
		doc.line(x1, y1, x2, y2);
	}

	// X-axis labels (every N years)
	const labelInterval = totalPoints <= 20 ? 5 : totalPoints <= 40 ? 10 : 15;
	doc.setFontSize(6);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(107, 114, 128);
	for (let i = 0; i < totalPoints; i += labelInterval) {
		const lx = chartX + (i / totalPoints) * chartW;
		const age = currentAge + i + 1;
		doc.text(`${age}`, lx, chartY + chartH + 5, { align: 'center' });
	}
	// Last label
	if (totalPoints > 0) {
		const lx = chartX + ((totalPoints - 1) / totalPoints) * chartW;
		const age = currentAge + totalPoints;
		doc.text(`${age}`, lx, chartY + chartH + 5, { align: 'center' });
	}

	// Axis titles
	doc.setFontSize(7);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(55, 65, 81);
	doc.text('Eta\'', chartX + chartW / 2, chartY + chartH + 12, { align: 'center' });
	// Y-axis title (rotated via save/restore not available, use horizontal text)
	doc.text('EUR', x, chartY + chartH / 2, { align: 'left' });
}

/**
 * Draws a horizontal stacked bar chart for asset allocation.
 */
function drawAssetAllocationBar(
	doc: jsPDF,
	entries: [string, number][],
	totalValue: number,
	x: number,
	y: number,
	width: number
): void {
	const barH = 14;
	const barY = y;
	let currentX = x;

	// Draw the stacked bar
	for (const [key, value] of entries) {
		const pct = value / totalValue;
		const segW = pct * width;
		const color = ASSET_COLORS[key] ?? [107, 114, 128];

		doc.setFillColor(color[0], color[1], color[2]);
		doc.rect(currentX, barY, segW, barH, 'F');

		// Label inside the segment if wide enough
		if (segW > 18) {
			doc.setFontSize(7);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(255, 255, 255);
			const pctStr = `${(pct * 100).toFixed(1)}%`;
			doc.text(pctStr, currentX + segW / 2, barY + barH / 2 + 1, {
				align: 'center'
			});
		}

		currentX += segW;
	}

	// Draw border around the whole bar
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(0.3);
	doc.rect(x, barY, width, barH, 'S');

	// Legend below the bar
	const legendY = barY + barH + 6;
	const legendColW = width / Math.min(entries.length, 4);
	const row2Y = legendY + 10;

	for (let i = 0; i < entries.length; i++) {
		const [key, value] = entries[i];
		const color = ASSET_COLORS[key] ?? [107, 114, 128];
		const label = PORTFOLIO_LABELS[key] || key;
		const pct = ((value / totalValue) * 100).toFixed(1).replace('.', ',');
		const currentRow = i < 4 ? legendY : row2Y;
		const col = i < 4 ? i : i - 4;
		const lx = x + col * legendColW;

		// Color swatch
		doc.setFillColor(color[0], color[1], color[2]);
		doc.rect(lx, currentRow - 3, 4, 4, 'F');

		// Label text
		doc.setFontSize(7);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(55, 65, 81);
		doc.text(`${label} (${pct}%)`, lx + 6, currentRow, { align: 'left' });
	}
}
