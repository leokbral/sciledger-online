import type { Handle } from '@sveltejs/kit';
import * as cookie from 'cookie';

// Lazy load MongoDB to avoid connection during build
let mongoStarted = false;
const initMongo = async () => {
	if (mongoStarted) return;
	mongoStarted = true;
	try {
		const { start_mongo } = await import("$lib/db/mongo");
		await start_mongo();
		console.log('Mongo started');
	} catch (e) {
		console.error('Failed to start MongoDB:', e);
	}
};

// Start MongoDB when first request comes in
let mongoInitPromise: Promise<void> | null = null;

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize MongoDB on first request
	if (!mongoInitPromise) {
		mongoInitPromise = initMongo();
	}
	await mongoInitPromise;

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
