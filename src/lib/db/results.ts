/**
 * CRUD operations per i risultati delle simulazioni.
 */
import { db, type SimulationResult } from './index';

export type SimulationResultInput = Omit<SimulationResult, 'id' | 'runAt'>;

/** Salva un nuovo risultato di simulazione */
export async function createResult(data: SimulationResultInput): Promise<number> {
	return await db.simulation_results.add({
		...data,
		runAt: new Date()
	} as SimulationResult);
}

/** Ottieni un risultato per id */
export async function getResultById(id: number): Promise<SimulationResult | undefined> {
	return await db.simulation_results.get(id);
}

/** Ottieni tutti i risultati */
export async function getAllResults(): Promise<SimulationResult[]> {
	return await db.simulation_results.orderBy('runAt').reverse().toArray();
}

/** Ottieni risultati per scenario */
export async function getResultsByScenarioId(scenarioId: number): Promise<SimulationResult[]> {
	return await db.simulation_results.where('scenarioId').equals(scenarioId).toArray();
}

/** Ottieni risultati per profilo */
export async function getResultsByProfileId(profileId: number): Promise<SimulationResult[]> {
	return await db.simulation_results.where('profileId').equals(profileId).toArray();
}

/** Aggiorna un risultato */
export async function updateResult(id: number, data: Partial<SimulationResultInput>): Promise<number> {
	return await db.simulation_results.update(id, data);
}

/** Elimina un risultato */
export async function deleteResult(id: number): Promise<void> {
	await db.simulation_results.delete(id);
}

/** Elimina tutti i risultati di uno scenario */
export async function deleteResultsByScenarioId(scenarioId: number): Promise<number> {
	return await db.simulation_results.where('scenarioId').equals(scenarioId).delete();
}
