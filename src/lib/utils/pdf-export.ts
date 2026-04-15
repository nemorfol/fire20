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
	calculateNetWorth
} from '$lib/engine/fire-calculator';

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
