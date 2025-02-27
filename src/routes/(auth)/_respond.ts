import { error, json } from '@sveltejs/kit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function respond(body: any) {
	if (body.errors) {
		error(body.status, body);
	}

	const value = Buffer.from(JSON.stringify(body)).toString('base64');

	return json(body, {
		headers: {
			'set-cookie': `jwt=${value}; Path=/; HttpOnly`
		}
	});
}