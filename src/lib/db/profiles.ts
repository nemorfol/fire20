/**
 * CRUD operations per i profili utente.
 */
import { db, type Profile } from './index';

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;

/** Crea un nuovo profilo e ritorna l'id */
export async function createProfile(data: ProfileInput): Promise<number> {
	const now = new Date();
	return await db.profiles.add({
		...data,
		createdAt: now,
		updatedAt: now
	} as Profile);
}

/** Ottieni un profilo per id */
export async function getProfileById(id: number): Promise<Profile | undefined> {
	return await db.profiles.get(id);
}

/** Ottieni tutti i profili */
export async function getAllProfiles(): Promise<Profile[]> {
	return await db.profiles.orderBy('updatedAt').reverse().toArray();
}

/** Aggiorna un profilo esistente */
export async function updateProfile(id: number, data: Partial<ProfileInput>): Promise<number> {
	return await db.profiles.update(id, {
		...data,
		updatedAt: new Date()
	});
}

/** Elimina un profilo e tutti i dati collegati */
export async function deleteProfile(id: number): Promise<void> {
	await db.transaction('rw', [db.profiles, db.scenarios, db.simulation_results], async () => {
		// Elimina risultati delle simulazioni collegate
		const scenarios = await db.scenarios.where('profileId').equals(id).toArray();
		const scenarioIds = scenarios.map(s => s.id);
		if (scenarioIds.length > 0) {
			await db.simulation_results.where('scenarioId').anyOf(scenarioIds).delete();
		}
		// Elimina anche risultati collegati direttamente al profilo
		await db.simulation_results.where('profileId').equals(id).delete();
		// Elimina scenari
		await db.scenarios.where('profileId').equals(id).delete();
		// Elimina profilo
		await db.profiles.delete(id);
	});
}
