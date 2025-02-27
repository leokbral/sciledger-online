import { json } from '@sveltejs/kit';

export function POST() {
	//console.log('sss - ')
	return json(
		{
			ok: true
		},
		{
			headers: {
				'set-cookie': 'jwt=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
			}
		}
	);
}
