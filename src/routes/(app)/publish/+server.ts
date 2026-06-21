import { MongoClient, GridFSBucket } from 'mongodb';
import type { RequestHandler } from '@sveltejs/kit';
import { MONGO_URL } from '$env/static/private';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongo';
import Papers from '$lib/db/models/Paper';
import { emitPaperLifecycleEvent } from '$lib/server/paperLifecycleEvents';

const client = new MongoClient(MONGO_URL);

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		await client.connect();
		const db = client.db('fargodb');
		const bucket = new GridFSBucket(db, { bucketName: 'fs' });

		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ error: 'User not authenticated' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;
		const title = formData.get('title')?.toString();
		const abstract = formData.get('abstract')?.toString();
		const keywords = formData
			.get('keywords')
			?.toString()
			?.split(',')
			.map((keyword) => keyword.trim());
		const mainAuthor = user.id;
		const correspondingAuthor = formData.get('correspondingAuthor')?.toString();
		const coAuthors = formData
			.get('coAuthors')
			?.toString()
			?.split(',')
			.map((coAuthor) => coAuthor.trim());
		const tags = formData
			.get('tags')
			?.toString()
			?.split(',')
			.map((tag) => tag.trim());

		if (!file || !(file instanceof File)) {
			return new Response(JSON.stringify({ error: 'No file uploaded or invalid file type' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const uploadStream = bucket.openUploadStream(file.name, {
			contentType: file.type,
			metadata: {
				submittedBy: user.id,
				title
			}
		});

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await new Promise<void>((resolve) => {
			uploadStream.end(buffer, () => {
				resolve();
			});
		});

		const pdfId = uploadStream.id;
		const paperId = crypto.randomUUID();

		const newPaper = new Papers({
			_id: paperId,
			paperId,
			title,
			abstract,
			keywords,
			mainAuthor,
			correspondingAuthor,
			coAuthors,
			pdfId,
			tags,
			status: 'draft',
			submittedBy: user.id,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await newPaper.save();

		try {
			await emitPaperLifecycleEvent('paper.created', newPaper, {
				actorId: user.id,
				metadata: {
					endpoint: '/publish'
				}
			});
		} catch (eventError) {
			console.error('Failed to emit paper created event:', eventError);
		}

		return new Response(JSON.stringify({ success: true, paperId: newPaper.id }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: (error as Error).message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	} finally {
		await client.close();
	}
};
