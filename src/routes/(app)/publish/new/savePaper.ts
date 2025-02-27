import SERVER from '$lib/Pages/config';
import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';

export async function saveTask(
	data: PaperPublishStoreData
) {
	const res = await fetch(`${SERVER}/tasks/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id: crypto.randomUUID(),
			title: data.title,
			// skills: data.skills,
			// body: data.body,
			// command: data.command,
			// isTemplate: true,
			// scope: data.scope,
			// isValidated: false,
			// tags: [],
			// alternatives: data.alternatives,

			// creator /* : { id: 'c4dde268-a403-494a-904a-701c39164d8b' }, */
		})
	});

	console.log(res);
	alert('Verifique o console para saber se salvou!\n Falta implementar o redirect.');
}