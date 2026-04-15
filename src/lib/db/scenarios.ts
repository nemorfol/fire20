/**
 * CRUD operations per gli scenari.
 */
import { db, type Scenario } from './index';

export type ScenarioInput = Omit<Scenario, 'id' | 'createdAt'>;

/** Crea un nuovo scenario */
export async function createScenario(data: ScenarioInput): Promise<number> {
	return await db.scenarios.add({
		...data,
		createdAt: new Date()
	} as Scenario);
}

/** Ottieni uno scenario per id */
export async function getScenarioById(id: number): Promise<Scenario | undefined> {
	return await db.scenarios.get(id);
}

/** Ottieni tutti gli scenari */
export async function getAllScenarios(): Promise<Scenario[]> {
	return await db.scenarios.orderBy('createdAt').reverse().toArray();
}

/** Ottieni scenari per profilo */
export async function getScenariosByProfileId(profileId: number): Promise<Scenario[]> {
	return await db.scenarios.where('profileId').equals(profileId).toArray();
}

/** Aggiorna uno scenario */
export async function updateScenario(id: number, data: Partial<ScenarioInput>): Promise<number> {
	return await db.scenarios.update(id, data);
}

/** Elimina uno scenario e i risultati collegati */
export async function deleteScenario(id: number): Promise<void> {
	await db.transaction('rw', [db.scenarios, db.simulation_results], async () => {
		await db.simulation_results.where('scenarioId').equals(id).delete();
		await db.scenarios.delete(id);
	});
}
