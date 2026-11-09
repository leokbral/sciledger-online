import type { PageServerLoad } from './$types';
import { loadPublicHubs } from '$lib/server/publicHubs';

export const load: PageServerLoad = async () => ({ hubs: await loadPublicHubs() });
