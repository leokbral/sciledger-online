import * as crypto from 'crypto';
import { Readable } from 'stream';
import { GridFSBucket } from 'mongodb';
import { db, start_mongo as startNativeMongo } from '$lib/db/mongo';
import { fsFiles } from '$lib/db/fs';

const bucket = new GridFSBucket(db);

export const REVIEW_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_REVIEW_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_REVIEW_ATTACHMENT_MIME_TYPES = new Set([
	'application/pdf',
	'application/x-pdf',
	'application/msword',
	'application/vnd.ms-word',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/octet-stream'
]);

export type ReviewAttachmentFile = {
	id: string;
	fileId: string;
	filename: string;
	fileSize: number;
	mimeType: string;
	uploadedBy: string;
	createdAt: Date;
};

type SaveReviewAttachmentOptions = {
	paperId: string;
	reviewerId: string;
	reviewId: string;
	reviewRound: number;
};

function getExtension(filename: string): string {
	const parts = filename.split('.');
	return parts.length > 1 ? String(parts.pop()).toLowerCase() : '';
}

export function isReviewAttachmentFile(value: unknown): value is File {
	return (
		typeof value === 'object' &&
		value !== null &&
		'name' in value &&
		'size' in value &&
		'type' in value &&
		'arrayBuffer' in value &&
		typeof (value as File).arrayBuffer === 'function'
	);
}

export function validateReviewAttachmentFile(file: File): string | null {
	const extension = getExtension(file.name || '');
	const mimeType = file.type || 'application/octet-stream';

	if (!file.size) {
		return 'The selected review file is empty.';
	}

	if (file.size > REVIEW_ATTACHMENT_MAX_SIZE) {
		return 'The review file must be 10MB or smaller.';
	}

	if (!ALLOWED_REVIEW_ATTACHMENT_EXTENSIONS.has(extension)) {
		return 'Review files must be PDF, DOC, or DOCX.';
	}

	if (!ALLOWED_REVIEW_ATTACHMENT_MIME_TYPES.has(mimeType)) {
		return 'Review files must be PDF, DOC, or DOCX.';
	}

	return null;
}

export async function saveReviewAttachmentFile(
	file: File,
	options: SaveReviewAttachmentOptions
): Promise<ReviewAttachmentFile> {
	const validationError = validateReviewAttachmentFile(file);
	if (validationError) {
		throw new Error(validationError);
	}

	await startNativeMongo();

	const fileId = crypto.randomUUID();
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
	const mimeType = file.type || 'application/octet-stream';

	const uploadStream = bucket.openUploadStream(file.name, {
		contentType: mimeType,
		metadata: {
			id: fileId,
			fileHash,
			size: file.size,
			lastModified: file.lastModified,
			type: 'review-attachment',
			paperId: options.paperId,
			reviewerId: options.reviewerId,
			reviewId: options.reviewId,
			reviewRound: options.reviewRound,
			uploadedBy: options.reviewerId
		}
	});

	await new Promise<void>((resolve, reject) => {
		uploadStream.on('error', reject);
		uploadStream.on('finish', resolve);
		uploadStream.end(buffer);
	});

	return {
		id: fileId,
		fileId,
		filename: file.name,
		fileSize: file.size,
		mimeType,
		uploadedBy: options.reviewerId,
		createdAt: new Date()
	};
}

export async function findReviewAttachmentGridFsFile(fileId: string) {
	await startNativeMongo();
	return fsFiles.findOne({
		'metadata.id': fileId,
		'metadata.type': 'review-attachment'
	});
}

export function buildReviewAttachmentResponse(fileDoc: any): Response {
	const downloadStream = bucket.openDownloadStream(fileDoc._id);
	const webStream = Readable.toWeb(downloadStream) as unknown as ReadableStream;
	const contentType = String(fileDoc.contentType || 'application/octet-stream');
	const filename = sanitizeHeaderFilename(String(fileDoc.filename || 'review-attachment'));
	const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';

	return new Response(webStream, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
			'Cache-Control': 'private, no-store'
		}
	});
}

function sanitizeHeaderFilename(filename: string): string {
	// Remove any character that's not ASCII (0-127)
	// Replace common Unicode characters with ASCII equivalents
	return filename
		.replace(/["\r\n]/g, '') // Remove quotes and line breaks
		.replace(/–/g, '-') // Replace en-dash with hyphen
		.replace(/—/g, '-') // Replace em-dash with hyphen
		.replace(/[^\x00-\x7F]/g, '_') // Replace any remaining non-ASCII with underscore
		.slice(0, 200); // Limit length to prevent header overflow
}
