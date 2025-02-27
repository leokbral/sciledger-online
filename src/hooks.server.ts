import { start_mongo } from "$lib/db/mongo";
import type { Handle } from '@sveltejs/kit';
import * as cookie from 'cookie';

start_mongo().then(() => {
	console.log('Mongo started');
}).catch(e => { console.error(e) })

export const handle: Handle = async ({ event, resolve }) => {
	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	const jwt = cookies.jwt && Buffer.from(cookies.jwt, 'base64').toString('utf-8');

	if (jwt) {
		//console.log('heio', jwt)
		const _jwt = JSON.parse(jwt);
		//console.log('heia', _jwt)
		event.locals.user = _jwt.user;
		event.locals.token = _jwt.token;
		event.locals.refreshToken = _jwt.refreshToken;
		//console.log('heihu - ', event.locals)
	}

	const response = await resolve(event);
	
	response.headers.set('Access-Control-Allow-Origin', '*');  // Permite todas as origens, você pode restringir para um domínio específico
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
	
	return response;
};
