/**
 * Script de Migração: Inicializar Review Slots
 * 
 * Este script adiciona o sistema de slots de revisão aos papers existentes.
 * Executa as seguintes operações:
 * 1. Adiciona reviewSlots array vazio se não existir
 * 2. Inicializa 3 slots por paper
 * 3. Marca slots como ocupados se houver revisores aceitos
 * 4. Atualiza os contadores de slots disponíveis
 * 
 * Para executar:
 * node scripts/migrate-review-slots.js
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sciledger';
const DB_NAME = 'sciledger'; // Ajuste conforme necessário

async function migrateReviewSlots() {
	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		console.log('✅ Conectado ao MongoDB');

		const db = client.db(DB_NAME);
		const papersCollection = db.collection('papers');

		// Buscar todos os papers que não têm reviewSlots
		const papers = await papersCollection.find({
			$or: [
				{ reviewSlots: { $exists: false } },
				{ reviewSlots: { $size: 0 } },
				{ reviewSlots: null }
			]
		}).toArray();

		console.log(`📄 Encontrados ${papers.length} papers para migrar`);

		let updatedCount = 0;
		let errorCount = 0;

		for (const paper of papers) {
			try {
				// Inicializar slots
				const slots = [
					{ slotNumber: 1, reviewerId: null, status: 'available' },
					{ slotNumber: 2, reviewerId: null, status: 'available' },
					{ slotNumber: 3, reviewerId: null, status: 'available' }
				];

				// Verificar se há revisores aceitos no peer_review
				const acceptedReviewers = paper.peer_review?.responses?.filter(
					r => r.status === 'accepted' || r.status === 'completed'
				) || [];

				// Ocupar slots com revisores aceitos (máximo 3)
				acceptedReviewers.slice(0, 3).forEach((response, index) => {
					if (slots[index]) {
						slots[index].reviewerId = response.reviewerId;
						slots[index].status = 'occupied';
						slots[index].acceptedAt = response.responseDate || response.assignedAt || new Date();
					}
				});

				// Calcular slots disponíveis
				const availableSlots = slots.filter(
					s => s.status === 'available' || s.status === 'declined'
				).length;

				// Atualizar o paper
				await papersCollection.updateOne(
					{ _id: paper._id },
					{
						$set: {
							reviewSlots: slots,
							maxReviewSlots: 3,
							availableSlots: availableSlots
						}
					}
				);

				updatedCount++;
				console.log(`✅ Paper ${paper.id || paper._id} migrado (${acceptedReviewers.length} slots ocupados)`);
			} catch (error) {
				errorCount++;
				console.error(`❌ Erro ao migrar paper ${paper.id || paper._id}:`, error.message);
			}
		}

		console.log('\n📊 Resumo da Migração:');
		console.log(`   ✅ Papers atualizados: ${updatedCount}`);
		console.log(`   ❌ Erros: ${errorCount}`);
		console.log(`   📄 Total processados: ${papers.length}`);
	} catch (error) {
		console.error('❌ Erro na migração:', error);
	} finally {
		await client.close();
		console.log('🔌 Conexão fechada');
	}
}

// Executar migração
migrateReviewSlots().catch(console.error);
