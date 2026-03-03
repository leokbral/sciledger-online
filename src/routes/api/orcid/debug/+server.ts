import type { RequestHandler } from './$types';
import { getOrcidConfig } from '$lib/orcid/config';
import { start_mongo } from '$lib/db/mongooseConnection';

export const GET: RequestHandler = async () => {
	try {
		console.log('='.repeat(80));
		console.log('ORCID DEBUG ENDPOINT CALLED');
		console.log('='.repeat(80));

		// Check environment
		console.log('\n1. ENVIRONMENT VARIABLES:');
		console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
		console.log('  ORCID_CLIENT_ID:', process.env.ORCID_CLIENT_ID ? '***SET***' : 'NOT SET');
		console.log('  ORCID_PROD_CLIENT_ID:', process.env.ORCID_PROD_CLIENT_ID ? '***SET***' : 'NOT SET');
		console.log('  ORCID_SANDBOX_CLIENT_ID:', process.env.ORCID_SANDBOX_CLIENT_ID ? '***SET***' : 'NOT SET');

		// Check config resolution
		console.log('\n2. ORCID CONFIG RESOLUTION:');
		const config = getOrcidConfig();
		if (config) {
			console.log('  ✓ Config loaded successfully');
			console.log('  - ClientID:', config.clientId.substring(0, 10) + '...');
			console.log('  - Redirect URI:', config.redirectUri);
			console.log('  - Has Secret:', config.clientSecret ? 'YES' : 'NO');
		} else {
			console.log('  ✗ Config is NULL - ORCID NOT CONFIGURED');
		}

		// Check MongoDB
		console.log('\n3. MONGODB CONNECTION:');
		try {
			await start_mongo();
			console.log('  ✓ MongoDB connected successfully');
		} catch (err) {
			console.error('  ✗ MongoDB connection failed:', err);
		}

		// Create response
		const debugInfo = {
			timestamp: new Date().toISOString(),
			nodeEnv: process.env.NODE_ENV || 'NOT SET',
			orcidConfigured: !!config,
			orcidConfig: config ? {
				clientId: config.clientId.substring(0, 10) + '...',
				redirectUri: config.redirectUri,
				hasSecret: !!config.clientSecret
			} : null,
			mongodbConnected: true
		};

		console.log('\n4. DEBUG RESPONSE:');
		console.log(JSON.stringify(debugInfo, null, 2));
		console.log('='.repeat(80));

		return new Response(JSON.stringify(debugInfo, null, 2), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('DEBUG ENDPOINT ERROR:', error);
		return new Response(
			JSON.stringify({
				error: 'Debug endpoint failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
