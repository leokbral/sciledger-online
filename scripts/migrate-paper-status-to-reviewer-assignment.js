/**
 * Migra status de papers: "under negotiation" -> "reviewer assignment"
 *
 * Uso:
 *   node scripts/migrate-paper-status-to-reviewer-assignment.js
 *   node scripts/migrate-paper-status-to-reviewer-assignment.js --dry-run
 *
 * Variaveis de ambiente suportadas:
 *   MONGODB_URI (preferencial)
 *   MONGO_URL (fallback)
 *   MONGODB_DB_NAME (opcional para forcar nome do banco)
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const OLD_STATUS = 'under negotiation';
const NEW_STATUS = 'reviewer assignment';

function getMongoUri() {
	const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
	if (!uri) {
		throw new Error('Defina MONGODB_URI ou MONGO_URL no ambiente.');
	}
	return uri;
}

function getDbName(uri) {
	if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;

	try {
		const parsed = new URL(uri);
		const dbFromPath = parsed.pathname?.replace(/^\//, '').split('/')[0];
		if (dbFromPath) return dbFromPath;
	} catch {
		// Ignora parse failure e usa fallback abaixo.
	}

	return 'sciledger';
}

async function run() {
	const dryRun = process.argv.includes('--dry-run');
	const uri = getMongoUri();
	const dbName = getDbName(uri);
	const client = new MongoClient(uri);

	console.log('Iniciando migracao de status de papers...');
	console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUCAO'}`);
	console.log(`Banco: ${dbName}`);

	try {
		await client.connect();
		const db = client.db(dbName);
		const papers = db.collection('papers');

		const filter = { status: OLD_STATUS };
		const toMigrate = await papers.countDocuments(filter);
		console.log(`Papers com status "${OLD_STATUS}": ${toMigrate}`);

		if (toMigrate === 0) {
			console.log('Nada para migrar.');
			return;
		}

		if (dryRun) {
			const sample = await papers.find(filter).project({ _id: 1, id: 1, title: 1, status: 1 }).limit(10).toArray();
			console.log('Amostra de documentos que seriam migrados (max 10):');
			for (const doc of sample) {
				console.log(`- _id=${doc._id} id=${doc.id || 'N/A'} status=${doc.status} title=${doc.title || 'N/A'}`);
			}
			return;
		}

		const now = new Date();
		const result = await papers.updateMany(
			filter,
			{
				$set: {
					status: NEW_STATUS,
					updatedAt: now
				}
			}
		);

		console.log('Migracao concluida.');
		console.log(`- matchedCount: ${result.matchedCount}`);
		console.log(`- modifiedCount: ${result.modifiedCount}`);

		const remainingOld = await papers.countDocuments({ status: OLD_STATUS });
		const totalNew = await papers.countDocuments({ status: NEW_STATUS });
		console.log(`- restante com status antigo: ${remainingOld}`);
		console.log(`- total com status novo: ${totalNew}`);
	} finally {
		await client.close();
	}
}

run().catch((error) => {
	console.error('Falha na migracao:', error);
	process.exitCode = 1;
});
