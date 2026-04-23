import type { RequestHandler } from '@sveltejs/kit';
import { GridFSBucket } from 'mongodb';
import { fsFiles } from '$lib/db/fs';
import { db } from '$lib/db/mongo';
import {
	buildStandardPdfFilename,
	getPaperSequenceNumber,
	getPaperYear
} from '$lib/utils/pdfFilename';

const bucket = new GridFSBucket(db);

type PaperRecord = {
	id?: string;
	_id?: string;
	createdAt?: unknown;
	status?: string;
	hubId?: string | Record<string, unknown> | null;
	correspondingAuthor?: string | Record<string, unknown> | null;
	mainAuthor?: string | Record<string, unknown> | null;
};

type UserRecord = {
	id?: string;
	_id?: string;
	lastName?: string;
};

type HubRecord = {
	id?: string;
	_id?: string;
	title?: string;
};

const papers = db.collection<PaperRecord>('papers');
const users = db.collection<UserRecord>('users');
const hubs = db.collection<HubRecord>('hubs');

function getReferenceId(value: unknown): string | null {
	if (!value) {
		return null;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed || null;
	}

	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		const candidate = record.id ?? record._id;
		return candidate ? String(candidate) : null;
	}

	return null;
}

function getStandalonePaperQuery() {
	return {
		$or: [{ hubId: { $exists: false } }, { hubId: null }, { hubId: '' }],
		status: 'published'
	};
}

function sanitizeHeaderFilename(filename: string): string {
	return filename.replace(/["\r\n]/g, '');
}

async function resolveDownloadFilename(pdfId: string, fallbackFilename: string): Promise<string> {
	const paper = (await papers.findOne(
		{ pdfUrl: pdfId },
		{
			projection: {
				_id: 1,
				id: 1,
				createdAt: 1,
				hubId: 1,
				correspondingAuthor: 1,
				mainAuthor: 1
			}
		}
	)) as PaperRecord | null;

	if (!paper) {
		return fallbackFilename;
	}

	const hubId = getReferenceId(paper.hubId);
	const authorId = getReferenceId(paper.correspondingAuthor) ?? getReferenceId(paper.mainAuthor);
	const targetYear = getPaperYear(paper.createdAt);

	const [author, hub, siblingPapers] = await Promise.all([
		authorId
			? users.findOne(
					{ $or: [{ id: authorId }, { _id: authorId }] },
					{ projection: { lastName: 1 } }
				)
			: null,
		hubId
			? hubs.findOne(
					{ $or: [{ id: hubId }, { _id: hubId }] },
					{ projection: { title: 1 } }
				)
			: null,
		papers
			.find(hubId ? { hubId, status: 'published' } : getStandalonePaperQuery(), {
				projection: { _id: 1, id: 1, createdAt: 1 }
			})
			.toArray()
	]);

	const sequenceNumber = getPaperSequenceNumber(
		siblingPapers as Array<{ id?: unknown; _id?: unknown; createdAt?: unknown }>,
		paper,
		targetYear
	);

	return buildStandardPdfFilename({
		authorLastName: author?.lastName ? String(author.lastName) : null,
		journalTitle: hub?.title ? String(hub.title) : 'SciLedger',
		sequenceNumber,
		year: targetYear
	});
}

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;
	if (!id) {
		return new Response('ID do PDF nÃ£o fornecido', { status: 400 });
	}

	try {
		const file = await fsFiles.findOne({ 'metadata.id': id });

		if (!file) {
			return new Response('Arquivo nÃ£o encontrado', { status: 404 });
		}

		const originalFilename = String(file.filename || 'document.pdf');
		let downloadFilename = originalFilename;

		try {
			downloadFilename = await resolveDownloadFilename(id, originalFilename);
		} catch (filenameError) {
			console.error('Erro ao montar nome padronizado do PDF:', filenameError);
		}

		const safeFilename = sanitizeHeaderFilename(downloadFilename);
		const downloadStream = bucket.openDownloadStream(file._id);

		return new Response(downloadStream as unknown as ReadableStream, {
			headers: {
				'Content-Type': file.contentType || 'application/pdf',
				'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
			}
		});
	} catch (error) {
		console.error('Erro ao recuperar o arquivo:', error);
		return new Response('Erro ao recuperar o arquivo', { status: 500 });
	}
};
