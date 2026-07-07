/**
 * Simulazione Monte Carlo per la pianificazione FIRE.
 * Supporta tre modalità: parametrica, storica e block bootstrap.
 * Può essere usato sia nel thread principale che nel Web Worker.
 */

import type { RiskEvent } from './risk-scenarios.js';
import { applyRiskEvent } from './risk-scenarios.js';
import type { YearlyProjection } from './fire-calculator.js';
import {
	gaussianRandom,
	logNormalReturn,
	bootstrapSample,
	blockBootstrapSample,
	calculatePercentiles,
	calculateMean,
	correlatedReturns,
	seedRandom,
	resetRandom
} from './statistics.js';
import { calculateWithdrawal } from './withdrawal.js';

/** Configurazione di una singola asset class per simulazione multi-asset */
export interface AssetClassConfig {
	/** Identificativo: 'stocks', 'bonds', 'gold', 'cash', 'realEstate' */
	name: string;
	/** Allocazione (0..1) */
	allocation: number;
	/** Rendimento medio annuo atteso (es. 0.07 per 7%) */
	expectedReturn: number;
	/** Deviazione standard annua (es. 0.16 per 16%) */
	stdDev: number;
	/** Rendimenti storici per modalità historical/bootstrap (decimali) */
	historicalReturns?: number[];
}

/** Parametri della simulazione Monte Carlo */
export interface MonteCarloParams {
	/** Portafoglio iniziale */
	initialPortfolio: number;
	/** Contributo annuale (fase di accumulazione) */
	annualContribution: number;
	/** Spese annuali in pensione */
	annualExpenses: number;
	/** Tasso di prelievo (es. 0.04) */
	withdrawalRate: number;
	/** Strategia di prelievo */
	withdrawalStrategy: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based' | 'amortized';
	/** Valore terminale target (euro di oggi) per la strategia 'amortized' (die-with-X) */
	targetBequest?: number;
	/** Allocazione in azioni (0..1) */
	stockAllocation: number;
	/** Allocazione in obbligazioni (0..1) */
	bondAllocation: number;
	/** Anni fino al FIRE (fase accumulazione) */
	yearsToFire: number;
	/** Anni in pensione (fase decumulo) */
	yearsInRetirement: number;
	/** Tasso di inflazione annuale */
	inflationRate: number;
	/** Modalità di simulazione */
	simulationMode: 'parametric' | 'historical' | 'block-bootstrap';
	/** Numero di iterazioni (simulazioni) */
	iterations: number;
	/** Rendimento atteso azioni (parametric) */
	expectedStockReturn?: number;
	/** Deviazione standard azioni (parametric) */
	stockStdDev?: number;
	/** Rendimento atteso obbligazioni (parametric) */
	expectedBondReturn?: number;
	/** Deviazione standard obbligazioni (parametric) */
	bondStdDev?: number;
	/** Rendimenti storici azioni (historical/bootstrap) */
	historicalStockReturns?: number[];
	/** Rendimenti storici obbligazioni (historical/bootstrap) */
	historicalBondReturns?: number[];
	/** Inflazione storica (historical/bootstrap) */
	historicalInflation?: number[];
	/** Eventi di rischio da applicare */
	riskEvents?: RiskEvent[];
	/** Età attuale (per VPW) */
	currentAge?: number;
	/** Aspettativa di vita (per VPW) */
	lifeExpectancy?: number;
	/** Pensione INPS annua lorda (euro di oggi), attiva da pensionAge. Default 0 = assente. */
	annualPension?: number;
	/** Eta' di accesso alla pensione INPS. Senza una pensionAge valida non ha effetto. */
	pensionAge?: number;
	/** Altri redditi annui post-FIRE (affitti, dividendi; euro di oggi). Default 0. */
	otherIncome?: number;
	/** Eta' fino a cui otherIncome continua (incluso). Default: nessun limite. */
	otherIncomeEndAge?: number;
	/** Rapporto CAPE (per CAPE-based) */
	capeRatio?: number;
	/** Usa rendimenti correlati (Cholesky) per modalita' parametrica */
	useCorrelation?: boolean;
	/** Correlazione azioni-obbligazioni (default 0.189) */
	stockBondCorrelation?: number;
	/** Configurazione multi-asset (opzionale, sovrascrive il modo 2-asset) */
	assetClasses?: AssetClassConfig[];
	/** Matrice di correlazione NxN per multi-asset (opzionale) */
	correlationMatrix?: number[][];
	/**
	 * Seed per il PRNG: se valorizzato la simulazione e' deterministica
	 * (stesso seed -> stesso risultato), utile per test di regressione e per
	 * riprodurre una simulazione condivisa. Se omesso usa Math.random().
	 */
	seed?: number;
	/** Callback per aggiornamenti di progresso */
	onProgress?: (percent: number) => void;
	/**
	 * Glide path: riduzione progressiva dell'allocazione equity nel tempo.
	 * Se enabled, override `stockAllocation`/`bondAllocation` in funzione
	 * di (currentAge + year) tra `glidePathStartEquity` (anno 0) e
	 * `glidePathEndEquity` (anno finale).
	 */
	glidePathEnabled?: boolean;
	glidePathStartEquity?: number;
	glidePathEndEquity?: number;
	/**
	 * Bollo titoli annuo applicato al controvalore di portafoglio (0.002 default).
	 * IVAFE applicata alla quota foreignBrokerShare (0..1) del portafoglio.
	 * Default 0/0/0 = retrocompatibile, MC non applica imposte patrimoniali.
	 */
	stampDutyRate?: number;
	ivafeRate?: number;
	foreignBrokerShare?: number;
	/**
	 * Aliquota capital gain sui rendimenti POSITIVI (es. blended 0.26/0.125/0.33
	 * dalla composizione). Default 0 = retrocompatibile (le simulazioni storiche
	 * non tassano). Allinea il Monte Carlo al proiettore deterministico, che
	 * gia' tassa i rendimenti: senza questo il fan chart e' sistematicamente piu'
	 * ottimista della proiezione.
	 */
	capitalGainsTaxRate?: number;
	/**
	 * Quota del portafoglio ESENTE da bollo titoli (tipicamente i BFP). 0..1.
	 * Default 0. Viene sottratta dalla base del bollo (i BFP non lo scontano).
	 */
	bolloExemptShare?: number;
}

/** Risultato completo della simulazione Monte Carlo */
export interface MonteCarloResult {
	/** Tasso di successo (0..1): percentuale di simulazioni dove il portafoglio non si esaurisce */
	successRate: number;
	/** Valore mediano del portafoglio finale */
	medianFinalValue: number;
	/** Valore medio del portafoglio finale */
	meanFinalValue: number;
	/** Percentili per ogni anno: chiavi p5, p10, p25, p50, p75, p90, p95 */
	percentiles: Record<string, number[]>;
	/** Statistiche per ogni anno */
	yearlyStats: {
		year: number;
		median: number;
		mean: number;
		p5: number;
		p95: number;
		successRate: number;
	}[];
	/** Traiettoria peggiore */
	worstCase: number[];
	/** Traiettoria migliore */
	bestCase: number[];
	/** Anno mediano di fallimento, null se la maggior parte delle simulazioni hanno successo */
	failureYear: number | null;
	/**
	 * Errore standard binomiale del successRate: sqrt(p*(1-p)/N). Con N piccolo
	 * (es. 1000) il tasso di successo ha incertezza non trascurabile: serve a
	 * distinguere segnale da rumore (es. "88% ± 1pp") invece di leggere un numero
	 * puntuale come esatto.
	 */
	successRateStdError: number;
	/** Intervallo di confidenza ~95% del successRate (p ± 1.96*SE, clampato in [0,1]) */
	successRateCI95: { lower: number; upper: number };
}

/**
 * Genera rendimenti multi-asset per un singolo anno in base alla modalità.
 * Restituisce un array di rendimenti (uno per asset class) e l'inflazione.
 */
function generateMultiAssetReturn(
	params: MonteCarloParams,
	assetClasses: AssetClassConfig[],
	corrMatrix: number[][]
): { assetReturns: number[]; inflation: number } {
	const mode = params.simulationMode;
	const n = assetClasses.length;

	if (mode === 'parametric') {
		const inflation = gaussianRandom(params.inflationRate, 0.01);
		const useCorrelation = params.useCorrelation ?? true;

		if (useCorrelation && corrMatrix.length === n) {
			const means = assetClasses.map((a) => a.expectedReturn);
			const stdDevs = assetClasses.map((a) => a.stdDev);
			const assetReturns = correlatedReturns(means, stdDevs, corrMatrix);
			return { assetReturns, inflation: Math.max(0, inflation) };
		}

		// Rendimenti indipendenti (fallback)
		const assetReturns = assetClasses.map((a) =>
			logNormalReturn(a.expectedReturn, a.stdDev)
		);
		return { assetReturns, inflation: Math.max(0, inflation) };
	}

	// historical / block-bootstrap: campiona dai rendimenti storici di ogni asset
	const inflationHist = params.historicalInflation ?? [];
	const assetReturns = assetClasses.map((a) => {
		const hist = a.historicalReturns ?? [];
		return bootstrapSample(hist.length > 0 ? hist : [a.expectedReturn]);
	});

	return {
		assetReturns,
		inflation: bootstrapSample(inflationHist.length > 0 ? inflationHist : [params.inflationRate])
	};
}

/**
 * Genera un rendimento del portafoglio per un singolo anno in base alla modalità.
 * Versione legacy 2-asset, usata quando assetClasses non è fornito.
 */
function generateReturn(
	params: MonteCarloParams,
	year: number
): { stockReturn: number; bondReturn: number; inflation: number } {
	const mode = params.simulationMode;

	if (mode === 'parametric') {
		const useCorrelation = params.useCorrelation ?? true;
		const inflation = gaussianRandom(params.inflationRate, 0.01);

		if (useCorrelation) {
			// Genera rendimenti correlati con decomposizione di Cholesky
			const correlation = params.stockBondCorrelation ?? 0.189;
			const corrMatrix = [
				[1.0, correlation],
				[correlation, 1.0]
			];
			const means = [
				params.expectedStockReturn ?? 0.07,
				params.expectedBondReturn ?? 0.03
			];
			const stdDevs = [
				params.stockStdDev ?? 0.16,
				params.bondStdDev ?? 0.06
			];
			const [stockReturn, bondReturn] = correlatedReturns(means, stdDevs, corrMatrix);
			return { stockReturn, bondReturn, inflation: Math.max(0, inflation) };
		}

		// Rendimenti indipendenti (fallback)
		const stockReturn = logNormalReturn(
			params.expectedStockReturn ?? 0.07,
			params.stockStdDev ?? 0.16
		);
		// Floor a -99%: una normale puo' generare rendimenti <= -100% (impossibili,
		// non si perde piu' del capitale); senza limite azzererebbero il portafoglio.
		const bondReturn = Math.max(
			-0.99,
			gaussianRandom(params.expectedBondReturn ?? 0.03, params.bondStdDev ?? 0.06)
		);
		return { stockReturn, bondReturn, inflation: Math.max(0, inflation) };
	}

	if (mode === 'historical') {
		const stockReturns = params.historicalStockReturns ?? [];
		const bondReturns = params.historicalBondReturns ?? [];
		const inflationHist = params.historicalInflation ?? [];

		return {
			stockReturn: bootstrapSample(stockReturns.length > 0 ? stockReturns : [0.07]),
			bondReturn: bootstrapSample(bondReturns.length > 0 ? bondReturns : [0.03]),
			inflation: bootstrapSample(inflationHist.length > 0 ? inflationHist : [params.inflationRate])
		};
	}

	// block-bootstrap: usa blocchi pre-generati passati come contesto
	// Se non ci sono blocchi pre-generati, usa bootstrap semplice come fallback
	const stockReturns = params.historicalStockReturns ?? [];
	const bondReturns = params.historicalBondReturns ?? [];
	const inflationHist = params.historicalInflation ?? [];

	return {
		stockReturn: bootstrapSample(stockReturns.length > 0 ? stockReturns : [0.07]),
		bondReturn: bootstrapSample(bondReturns.length > 0 ? bondReturns : [0.03]),
		inflation: bootstrapSample(inflationHist.length > 0 ? inflationHist : [params.inflationRate])
	};
}

/**
 * Esegue una singola simulazione Monte Carlo (una traiettoria).
 *
 * @returns Array dei valori del portafoglio per ogni anno
 */
function runSingleSimulation(params: MonteCarloParams): number[] {
	const totalYears = params.yearsToFire + params.yearsInRetirement;
	const portfolioValues: number[] = [];
	let portfolio = params.initialPortfolio;
	let initialRetirementPortfolio = 0;
	let previousWithdrawal = 0;
	// Fattore di inflazione cumulata realizzata lungo il percorso (1 al primo
	// anno): indicizza il prelievo 'fixed' a importo reale fisso.
	let cumulativeInflation = 1;
	// Inflazione cumulata catturata all'inizio della pensione: indicizza il
	// prelievo del ramo di fallback a partire da quel momento (fattore 1 al 1o anno).
	let inflationAtRetirementStart = 1;

	// Modalità multi-asset: usa assetClasses e correlationMatrix
	const useMultiAsset = params.assetClasses && params.assetClasses.length > 0;
	const assetClasses = params.assetClasses ?? [];
	const corrMatrix = params.correlationMatrix ?? [];

	// Pre-genera blocchi per block-bootstrap (preserva autocorrelazione)
	// Multi-asset: un array di blocchi per ogni asset class
	let pregenAssetReturns: number[][] | null = null;
	let pregenStockReturns: number[] | null = null;
	let pregenBondReturns: number[] | null = null;
	let pregenInflation: number[] | null = null;

	if (params.simulationMode === 'block-bootstrap') {
		const blockSize = 5;
		const inflData = params.historicalInflation ?? [params.inflationRate];

		pregenInflation = [];
		for (let i = 0; i < totalYears; i += blockSize) {
			const iBlock = blockBootstrapSample(inflData, blockSize);
			pregenInflation.push(...iBlock);
		}

		if (useMultiAsset) {
			pregenAssetReturns = assetClasses.map((ac) => {
				const hist = ac.historicalReturns ?? [ac.expectedReturn];
				const blocks: number[] = [];
				for (let i = 0; i < totalYears; i += blockSize) {
					blocks.push(...blockBootstrapSample(hist, blockSize));
				}
				return blocks;
			});
		} else {
			const stockData = params.historicalStockReturns ?? [0.07];
			const bondData = params.historicalBondReturns ?? [0.03];

			pregenStockReturns = [];
			pregenBondReturns = [];

			for (let i = 0; i < totalYears; i += blockSize) {
				const sBlock = blockBootstrapSample(stockData, blockSize);
				const bBlock = blockBootstrapSample(bondData, blockSize);
				pregenStockReturns.push(...sBlock);
				pregenBondReturns.push(...bBlock);
			}
		}
	}

	for (let year = 0; year < totalYears; year++) {
		const isRetired = year >= params.yearsToFire;
		const retirementYear = isRetired ? year - params.yearsToFire : 0;

		// Salva il portafoglio all'inizio della pensione
		if (year === params.yearsToFire) {
			initialRetirementPortfolio = portfolio;
			inflationAtRetirementStart = cumulativeInflation;
			previousWithdrawal = portfolio * params.withdrawalRate;
		}

		let portfolioReturn: number;
		let inflation: number;

		if (useMultiAsset) {
			// === Multi-asset path ===
			if (pregenAssetReturns && pregenInflation) {
				// block-bootstrap con blocchi pre-generati
				const assetReturns = assetClasses.map((_, idx) =>
					pregenAssetReturns![idx][year] ?? assetClasses[idx].expectedReturn
				);
				inflation = Math.max(0, pregenInflation[year] ?? params.inflationRate);
				portfolioReturn = assetClasses.reduce(
					(sum, ac, idx) => sum + assetReturns[idx] * ac.allocation, 0
				);
			} else {
				// parametric o historical
				const ret = generateMultiAssetReturn(params, assetClasses, corrMatrix);
				inflation = ret.inflation;
				portfolioReturn = assetClasses.reduce(
					(sum, ac, idx) => sum + ret.assetReturns[idx] * ac.allocation, 0
				);
			}
		} else {
			// === Legacy 2-asset path ===
			let stockReturn: number, bondReturn: number;
			if (pregenStockReturns && pregenBondReturns && pregenInflation) {
				stockReturn = pregenStockReturns[year] ?? 0.07;
				bondReturn = pregenBondReturns[year] ?? 0.03;
				inflation = Math.max(0, pregenInflation[year] ?? params.inflationRate);
			} else {
				const returns = generateReturn(params, year);
				stockReturn = returns.stockReturn;
				bondReturn = returns.bondReturn;
				inflation = returns.inflation;
			}

			// Glide path: se abilitato, modulo l'allocazione equity tra
			// startEquity (anno 0) e endEquity (anno finale) in modo lineare
			// rispetto al tempo totale di simulazione.
			let stockAlloc = params.stockAllocation;
			let bondAlloc = params.bondAllocation;
			if (params.glidePathEnabled) {
				const totalLen = Math.max(1, totalYears - 1);
				const t = Math.min(1, year / totalLen);
				const startEq = params.glidePathStartEquity ?? params.stockAllocation;
				const endEq = params.glidePathEndEquity ?? Math.max(0.2, params.stockAllocation - 0.4);
				stockAlloc = startEq + (endEq - startEq) * t;
				bondAlloc = Math.max(0, 1 - stockAlloc);
			}
			// Rendimento ponderato del portafoglio
			portfolioReturn = stockReturn * stockAlloc + bondReturn * bondAlloc;
		}

		// Fase di accumulazione: aggiungi contributi
		if (!isRetired) {
			portfolio += params.annualContribution;
			// Se la pensione INPS decorre DURANTE l'accumulazione (eta' attuale +
			// anno >= pensionAge ma siamo ancora pre-FIRE), va accreditata anche
			// qui: il deterministico (fire-calculator.ts) la aggiunge ai contributi
			// con accumPensionIncome. Senza questo, MC e proiezione divergono per
			// chi ha yearsToFire alto. otherIncome resta escluso in accumulo, anche
			// nel deterministico viene consumato solo nel ramo di decumulo.
			const ageAccum = (params.currentAge ?? 40) + year;
			if (ageAccum >= (params.pensionAge ?? Infinity)) {
				portfolio += (params.annualPension ?? 0) * cumulativeInflation;
			}
		}

		// Applica rendimenti, al netto del capital gain sui rendimenti POSITIVI
		// (coerente col proiettore deterministico: senza questo il MC e' troppo
		// ottimista). Default 0 = retrocompatibile con le simulazioni storiche.
		const returns = portfolio * portfolioReturn;
		const capGainsRate = params.capitalGainsTaxRate ?? 0;
		const capGainsTax = returns > 0 ? returns * capGainsRate : 0;
		portfolio += returns - capGainsTax;

		// Imposte patrimoniali (bollo titoli + IVAFE) sul controvalore di
		// fine anno. Default 0 = retrocompatibile con simulazioni storiche.
		const stampRate = params.stampDutyRate ?? 0;
		const ivafeRate = params.ivafeRate ?? 0;
		const foreignShare = Math.max(0, Math.min(1, params.foreignBrokerShare ?? 0));
		const exemptShare = Math.max(0, Math.min(1, params.bolloExemptShare ?? 0));
		if ((stampRate > 0 || ivafeRate > 0) && portfolio > 0) {
			// Base del bollo: quota italiana NON esente (i BFP non scontano il bollo).
			// L'IVAFE si applica alla quota su intermediari esteri.
			const italianValue = Math.max(0, portfolio * (1 - foreignShare - exemptShare));
			const foreignValue = portfolio * foreignShare;
			const stamp = italianValue * stampRate;
			const ivafe = foreignValue * ivafeRate;
			portfolio = Math.max(0, portfolio - stamp - ivafe);
		}

		// Fase di decumulo: preleva
		if (isRetired && portfolio > 0) {
			let withdrawal: number;

			switch (params.withdrawalStrategy) {
				case 'fixed':
					// Prelievo ancorato alle SPESE REALI dell'utente, indicizzate
					// all'inflazione CUMULATA realizzata su questo percorso. Ancorarlo a
					// initialPortfolio*rate (prima) rendeva l'esito scale-invariante e
					// ignorava annualExpenses. Coerente col proiettore deterministico.
					withdrawal =
						params.annualExpenses > 0
							? params.annualExpenses * cumulativeInflation
							: initialRetirementPortfolio *
								params.withdrawalRate *
								(cumulativeInflation / inflationAtRetirementStart);
					break;

				case 'vpw':
					withdrawal = calculateWithdrawal('vpw', {
						portfolio,
						age: (params.currentAge ?? 40) + year,
						lifeExpectancy: params.lifeExpectancy ?? 90
					});
					break;

				case 'guyton-klinger':
					withdrawal = calculateWithdrawal('guyton-klinger', {
						portfolio,
						guytonKlinger: {
							portfolio,
							initialWithdrawal: initialRetirementPortfolio * params.withdrawalRate,
							initialRate: params.withdrawalRate,
							inflationRate: inflation,
							year: retirementYear,
							previousWithdrawal:
								retirementYear === 0
									? initialRetirementPortfolio * params.withdrawalRate
									: previousWithdrawal
						}
					});
					break;

				case 'cape-based':
					withdrawal = calculateWithdrawal('cape-based', {
						portfolio,
						capeRatio: params.capeRatio ?? 25
					});
					break;

				case 'amortized': {
					// Rendimento reale di pianificazione (blend atteso azioni/bond).
					const blendedNominal =
						(params.expectedStockReturn ?? 0.07) * params.stockAllocation +
						(params.expectedBondReturn ?? 0.03) * params.bondAllocation;
					withdrawal = calculateWithdrawal('amortized', {
						portfolio,
						age: (params.currentAge ?? 40) + year,
						lifeExpectancy: params.lifeExpectancy ?? 90,
						realReturn: (1 + blendedNominal) / (1 + params.inflationRate) - 1,
						targetBequest: params.targetBequest ?? 0
					});
					break;
				}

				default:
					withdrawal = portfolio * params.withdrawalRate;
			}

			// Redditi passivi (pensione INPS + altri redditi) riducono il prelievo
			// netto dal portafoglio; l'eventuale surplus viene reinvestito. Importi in
			// euro nominali via cumulativeInflation, allineato alla proiezione
			// deterministica (fire-calculator.ts) salvo uno sfasamento convenzionale di
			// ~1 anno sull'eta' (entro tolleranza). Default 0 = retrocompatibile.
			const ageNow = (params.currentAge ?? 40) + year;
			const pensionNow =
				ageNow >= (params.pensionAge ?? Infinity)
					? (params.annualPension ?? 0) * cumulativeInflation
					: 0;
			const otherIncomeNow =
				ageNow <= (params.otherIncomeEndAge ?? Infinity)
					? (params.otherIncome ?? 0) * cumulativeInflation
					: 0;

			previousWithdrawal = withdrawal;
			portfolio -= withdrawal - pensionNow - otherIncomeNow;
		}

		// Il portafoglio non può essere negativo
		portfolio = Math.max(0, portfolio);
		portfolioValues.push(portfolio);

		// Accumula l'inflazione realizzata di quest'anno: indicizza i prelievi
		// futuri all'inflazione cumulata (dopo aver usato cumulativeInflation).
		cumulativeInflation *= 1 + inflation;
	}

	return portfolioValues;
}

/**
 * Esegue la simulazione Monte Carlo completa.
 *
 * Per ogni iterazione:
 * 1. Genera rendimenti casuali per ogni anno (parametrici o storici)
 * 2. Simula accumulazione e decumulo
 * 3. Applica la strategia di prelievo scelta
 * 4. Applica eventuali eventi di rischio
 * 5. Registra la traiettoria del portafoglio
 *
 * @param params - Parametri della simulazione
 * @returns Risultato aggregato con statistiche, percentili e traiettorie
 */
export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
	const totalYears = params.yearsToFire + params.yearsInRetirement;
	const iterations = Math.max(1, params.iterations);

	// Riproducibilita': con un seed la simulazione e' deterministica. Lo stato
	// del PRNG viene ripristinato a fine run (resetRandom piu' sotto) per non
	// condizionare simulazioni successive non seedate.
	if (params.seed !== undefined) {
		seedRandom(params.seed);
	}

	// Matrice di tutte le simulazioni: [iterazione][anno]
	const allSimulations: number[][] = [];

	// Progresso
	const progressStep = Math.max(1, Math.floor(iterations / 10));

	for (let i = 0; i < iterations; i++) {
		let trajectory = runSingleSimulation(params);

		// Applica eventi di rischio se presenti
		if (params.riskEvents && params.riskEvents.length > 0) {
			// Converti traiettoria in YearlyProjection per l'applicazione degli eventi
			let projections: YearlyProjection[] = trajectory.map((value, idx) => ({
				year: idx,
				age: (params.currentAge ?? 40) + idx,
				portfolio: value,
				contributions: idx < params.yearsToFire ? params.annualContribution : 0,
				withdrawals: idx >= params.yearsToFire ? params.annualExpenses : 0,
				returns: 0,
				taxes: 0,
				netWorth: value
			}));

			for (const event of params.riskEvents) {
				// Aggiusta yearOfOccurrence relativo all'inizio della pensione
				const adjustedEvent: RiskEvent = {
					...event,
					impact: {
						...event.impact,
						yearOfOccurrence: params.yearsToFire + event.impact.yearOfOccurrence
					}
				};
				projections = applyRiskEvent(projections, adjustedEvent);
			}

			trajectory = projections.map((p) => p.portfolio);
		}

		allSimulations.push(trajectory);

		// Report progresso
		if (params.onProgress && (i + 1) % progressStep === 0) {
			params.onProgress(((i + 1) / iterations) * 100);
		}
	}

	// Ripristina Math.random() se avevamo seedato: il seed non deve "perdurare".
	if (params.seed !== undefined) {
		resetRandom();
	}

	// === Calcolo statistiche ===

	// Valori finali
	const finalValues = allSimulations.map((sim) => sim[sim.length - 1] ?? 0);

	// Tasso di successo: portafoglio finale > 0
	const successCount = finalValues.filter((v) => v > 0).length;
	const successRate = successCount / iterations;

	// Percentili anno per anno
	const percentileKeys = ['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'];
	const percentileValues = [5, 10, 25, 50, 75, 90, 95];
	const percentiles: Record<string, number[]> = {};
	for (const key of percentileKeys) {
		percentiles[key] = [];
	}

	const yearlyStats: MonteCarloResult['yearlyStats'] = [];

	// Traiettorie estreme
	const worstCase: number[] = [];
	const bestCase: number[] = [];

	for (let yearIdx = 0; yearIdx < totalYears; yearIdx++) {
		const yearValues = allSimulations.map((sim) => sim[yearIdx] ?? 0);

		const percs = calculatePercentiles(yearValues, percentileValues);
		for (let p = 0; p < percentileKeys.length; p++) {
			percentiles[percentileKeys[p]].push(Math.round(percs[p]));
		}

		const mean = calculateMean(yearValues);
		const yearSuccess = yearValues.filter((v) => v > 0).length / iterations;

		yearlyStats.push({
			year: yearIdx + 1,
			median: Math.round(percs[3]), // p50
			mean: Math.round(mean),
			p5: Math.round(percs[0]),
			p95: Math.round(percs[6]),
			successRate: yearSuccess
		});

		// Worst/best case: usa p5 e p95 come proxy
		worstCase.push(Math.round(percs[0]));
		bestCase.push(Math.round(percs[6]));
	}

	// Anno mediano di fallimento
	let failureYear: number | null = null;
	if (successRate < 1) {
		const failureYears: number[] = [];
		for (const sim of allSimulations) {
			const failIdx = sim.findIndex((v) => v <= 0);
			if (failIdx >= 0) {
				failureYears.push(failIdx + 1);
			}
		}
		if (failureYears.length > 0) {
			failureYears.sort((a, b) => a - b);
			failureYear = failureYears[Math.floor(failureYears.length / 2)];
		}
	}

	// Mediana e media dei valori finali
	const sortedFinal = [...finalValues].sort((a, b) => a - b);
	const medianFinalValue = sortedFinal[Math.floor(sortedFinal.length / 2)];
	const meanFinalValue = calculateMean(finalValues);

	// Errore standard binomiale del tasso di successo e IC ~95%. Il successRate
	// e' una proporzione su N iterazioni: la sua incertezza statistica e'
	// sqrt(p*(1-p)/N), non l'arrotondamento.
	const seSuccess = Math.sqrt((successRate * (1 - successRate)) / iterations);
	const ciHalf = 1.96 * seSuccess;

	return {
		successRate: Math.round(successRate * 10000) / 10000,
		medianFinalValue: Math.round(medianFinalValue),
		meanFinalValue: Math.round(meanFinalValue),
		percentiles,
		yearlyStats,
		worstCase,
		bestCase,
		failureYear,
		successRateStdError: Math.round(seSuccess * 100000) / 100000,
		successRateCI95: {
			lower: Math.round(Math.max(0, successRate - ciHalf) * 10000) / 10000,
			upper: Math.round(Math.min(1, successRate + ciHalf) * 10000) / 10000
		}
	};
}
