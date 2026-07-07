/**
 * Import del patrimonio da GestPTF (o da qualsiasi sorgente che produca il
 * formato di interscambio "patrimonio-italiano").
 *
 * Filosofia: import ONE-WAY, file-based, mediato dall'utente — coerente col
 * vincolo di FIRE Planner "tutto nel browser, nessun backend, nessuna PII fuori
 * dal dispositivo". Nessuna chiamata di rete: l'utente esporta un file da
 * GestPTF e lo carica qui.
 *
 * Il formato usa ESATTAMENTE le chiavi di PortfolioAllocation, quindi l'import
 * e' quasi una deserializzazione: niente euristiche per keyword. In particolare
 * `bfp` e `cd` mappano 1:1 (non vengono piu' collassati in bonds/cash).
 */
import type { PortfolioAllocation } from '$lib/db/index';
import { formatCurrency } from '$lib/utils/format';

/** Versione del formato di interscambio supportata. */
export const GESTPTF_FORMAT = 'patrimonio-italiano';
export const GESTPTF_VERSION = 1;

/** Le 11 categorie di asset, identiche alle chiavi di PortfolioAllocation. */
const ASSET_KEYS: (keyof PortfolioAllocation)[] = [
	'stocks',
	'bonds',
	'bfp',
	'cd',
	'cash',
	'realEstate',
	'gold',
	'crypto',
	'pensionFund',
	'tfr',
	'other'
];

export interface GestptfImportResult {
	/** Data dello snapshot patrimoniale (ISO YYYY-MM-DD), se presente. */
	asOf?: string;
	/** App sorgente dichiarata nel file (es. "gestptf"). */
	app?: string;
	/** Valori per categoria, sempre tutte e 11 le chiavi (0 se assenti). */
	assets: Record<keyof PortfolioAllocation, number>;
	/** Debiti totali dichiarati (scalare). NON importati automaticamente. */
	debts: number;
	/** Affitti netti annui stimati dagli immobili. NON importati automaticamente. */
	rentalIncomeAnnual: number;
	/** Somma di tutte le categorie di asset. */
	totalAssets: number;
	/** Avvisi non bloccanti da mostrare all'utente. */
	warnings: string[];
}

function toNumber(v: unknown): number {
	const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Valida e converte un export "patrimonio-italiano" in un risultato pronto da
 * applicare al patrimonio del profilo. Lancia un Error (messaggio in italiano)
 * se il file non e' valido o la versione non e' supportata.
 */
export function parseGestptfExport(raw: string): GestptfImportResult {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error("File non valido: non e' un JSON leggibile.");
	}
	if (!data || typeof data !== 'object') {
		throw new Error('Formato file non riconosciuto.');
	}
	const obj = data as Record<string, unknown>;

	if (obj.format !== GESTPTF_FORMAT) {
		throw new Error(
			'Questo file non e\' un export di patrimonio compatibile ' +
				`(atteso format="${GESTPTF_FORMAT}").`
		);
	}
	if (toNumber(obj.version) !== GESTPTF_VERSION) {
		throw new Error(
			`Versione del formato non supportata (${String(obj.version ?? 'assente')}): ` +
				'aggiorna FIRE Planner o ri-esporta da GestPTF.'
		);
	}

	const srcAssets =
		obj.assets && typeof obj.assets === 'object'
			? (obj.assets as Record<string, unknown>)
			: {};

	const assets = {} as Record<keyof PortfolioAllocation, number>;
	for (const k of ASSET_KEYS) {
		// Arrotonda ai centesimi per evitare code di floating point.
		assets[k] = Math.round(toNumber(srcAssets[k]) * 100) / 100;
	}
	const totalAssets = ASSET_KEYS.reduce((s, k) => s + assets[k], 0);

	const debts = Math.max(0, toNumber(obj.debts));
	const rentalIncomeAnnual = Math.max(0, toNumber(obj.rentalIncomeAnnual));

	const warnings: string[] = [];
	if (debts > 0) {
		warnings.push(
			`Debiti per ${formatCurrency(debts)} non importati automaticamente: ` +
				'aggiungili in Profilo → Debiti / Mutuo (struttura e tasso non sono nel file).'
		);
	}
	if (rentalIncomeAnnual > 0) {
		warnings.push(
			`Affitti netti stimati ${formatCurrency(rentalIncomeAnnual)}/anno: ` +
				'impostali in Profilo → Reddito → Altri redditi annui (rendita passiva).'
		);
	}
	warnings.push(
		"Importato l'aggregato per categoria: il dettaglio per singolo titolo/ISIN " +
			'resta in GestPTF (FIRE Planner ragiona per classi di asset).'
	);

	return {
		asOf: typeof obj.asOf === 'string' ? obj.asOf : undefined,
		app: typeof obj.app === 'string' ? obj.app : undefined,
		assets,
		debts,
		rentalIncomeAnnual,
		totalAssets,
		warnings
	};
}
