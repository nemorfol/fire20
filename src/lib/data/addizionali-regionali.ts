/**
 * Addizionale regionale IRPEF per regione — valori INDICATIVI.
 *
 * Quadro normativo: l'addizionale regionale (D.Lgs. 360/1998 e s.m.i.) ha
 * un'aliquota base dell'1,23% che ciascuna Regione puo' maggiorare fino a un
 * massimo del 3,33%, eventualmente articolata per SCAGLIONI di reddito e con
 * soglie di esenzione proprie. I valori qui sotto sono aliquote indicative
 * "tipiche" per dare un default ragionevole all'utente: NON sostituiscono la
 * delibera della singola Regione per l'anno e lo scaglione di reddito.
 *
 * IMPORTANTE (regola di progetto sull'accuratezza fiscale): questi numeri vanno
 * verificati sulla delibera regionale vigente prima di farci affidamento. Sono
 * sempre sovrascrivibili manualmente nell'AssumptionsPanel. L'addizionale
 * COMUNALE (0%–0,9%) varia per singolo comune e resta da impostare a parte.
 *
 * Aliquote espresse come decimali (0.0173 = 1,73%).
 */
export interface RegionalSurtax {
	/** Nome della regione / provincia autonoma */
	region: string;
	/** Aliquota regionale indicativa (decimale) */
	rate: number;
	/** Nota breve (es. presenza di scaglioni o esenzioni) */
	note?: string;
}

/** Aliquota base di legge (minimo) e tetto massimo dell'addizionale regionale. */
export const ADDIZIONALE_REGIONALE_BASE = 0.0123;
export const ADDIZIONALE_REGIONALE_MAX = 0.0333;

/**
 * Tabella indicativa per regione. Dove la Regione applica scaglioni, si riporta
 * un valore rappresentativo (con nota "a scaglioni"). Da verificare sempre.
 */
export const ADDIZIONALI_REGIONALI: RegionalSurtax[] = [
	{ region: 'Abruzzo', rate: 0.0173 },
	{ region: 'Basilicata', rate: 0.0123, note: 'aliquota base; esenzioni per redditi bassi' },
	{ region: 'Calabria', rate: 0.0203, note: 'a scaglioni' },
	{ region: 'Campania', rate: 0.0203, note: 'a scaglioni (fino al massimo)' },
	{ region: 'Emilia-Romagna', rate: 0.0193, note: 'a scaglioni 1,43%–2,33%' },
	{ region: 'Friuli-Venezia Giulia', rate: 0.0123, note: 'aliquote ridotte per redditi bassi' },
	{ region: 'Lazio', rate: 0.0203, note: 'a scaglioni 1,73%–3,33%' },
	{ region: 'Liguria', rate: 0.0173, note: 'a scaglioni' },
	{ region: 'Lombardia', rate: 0.0173, note: 'a scaglioni 1,23%–1,74%' },
	{ region: 'Marche', rate: 0.0173, note: 'a scaglioni' },
	{ region: 'Molise', rate: 0.0213, note: 'a scaglioni (fino al massimo)' },
	{ region: 'Piemonte', rate: 0.0213, note: 'a scaglioni 1,62%–3,33%' },
	{ region: 'Puglia', rate: 0.0173, note: 'a scaglioni 1,33%–1,73%' },
	{ region: 'Sardegna', rate: 0.0123, note: 'aliquota base' },
	{ region: 'Sicilia', rate: 0.0123, note: 'aliquota base' },
	{ region: 'Toscana', rate: 0.0173, note: 'a scaglioni 1,42%–1,73%' },
	{ region: 'Trentino-A.A. (Bolzano)', rate: 0.0123, note: 'esenzione fino a ~35.000€' },
	{ region: 'Trentino-A.A. (Trento)', rate: 0.0123, note: 'esenzioni per redditi bassi' },
	{ region: 'Umbria', rate: 0.0173, note: 'a scaglioni 1,23%–1,83%' },
	{ region: "Valle d'Aosta", rate: 0.0123, note: 'aliquota base' },
	{ region: 'Veneto', rate: 0.0123, note: 'aliquota base; esenzioni specifiche' }
];
