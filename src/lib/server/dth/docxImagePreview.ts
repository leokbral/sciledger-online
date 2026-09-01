import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { fsFiles } from '$lib/db/fs';

const require = createRequire(import.meta.url);
const bucket = new GridFSBucket(db);

type MammothImage = {
	contentType: string;
	readAsArrayBuffer: () => Promise<ArrayBuffer>;
};

type MammothModule = {
	convertToHtml: (
		input: { buffer: Buffer },
		options: {
			convertImage: unknown;
		}
	) => Promise<{ value: string; messages?: unknown[] }>;
	images: {
		imgElement: (converter: (image: MammothImage) => Promise<{ src: string }>) => unknown;
	};
};

type StoreDocxImageInput = {
	buffer: Buffer;
	contentType: string;
	originalFilename: string;
	index: number;
};

type StoreDocxImage = (input: StoreDocxImageInput) => Promise<string>;

type ConvertedDocxHtml = {
	html: string;
	imageSources: string[];
};

function imageExtension(contentType: string) {
	if (contentType === 'image/png') return 'png';
	if (contentType === 'image/gif') return 'gif';
	if (contentType === 'image/webp') return 'webp';
	if (contentType === 'image/svg+xml') return 'svg';
	return 'jpg';
}

function safeBaseName(filename: string) {
	return filename
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-z0-9_-]+/gi, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80) || 'document';
}

function escapeHtmlAttribute(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export async function storeDocxImageInGridFs(input: StoreDocxImageInput) {
	const fileHash = createHash('sha256').update(input.buffer).digest('hex');
	const existing = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
	if (existing?.metadata?.id) {
		return `/api/images/${existing.metadata.id}`;
	}

	const id = randomUUID();
	const extension = imageExtension(input.contentType);
	const filename = `${safeBaseName(input.originalFilename)}-image-${input.index + 1}.${extension}`;
	const uploadStream = bucket.openUploadStream(filename, {
		contentType: input.contentType || 'application/octet-stream',
		metadata: {
			id,
			fileHash,
			size: input.buffer.byteLength,
			type: 'image',
			source: 'docx'
		}
	});

	await new Promise<void>((resolve, reject) => {
		Readable.from(input.buffer)
			.pipe(uploadStream)
			.on('error', reject)
			.on('finish', () => resolve());
	});

	return `/api/images/${id}`;
}

export async function convertDocxToHtmlWithLocalImages(input: {
	docxBuffer: Buffer;
	originalFilename: string;
	storeImage?: StoreDocxImage;
}): Promise<ConvertedDocxHtml> {
	const mammoth = require('mammoth') as MammothModule;
	const storeImage = input.storeImage ?? storeDocxImageInGridFs;
	const imageSources: string[] = [];

	const converted = await mammoth.convertToHtml(
		{ buffer: input.docxBuffer },
		{
			convertImage: mammoth.images.imgElement(async (image: MammothImage) => {
				const imageBuffer = Buffer.from(await image.readAsArrayBuffer());
				const src = await storeImage({
					buffer: imageBuffer,
					contentType: image.contentType,
					originalFilename: input.originalFilename,
					index: imageSources.length
				});
				imageSources.push(src);
				return { src };
			})
		}
	);

	return {
		html: converted.value || '',
		imageSources
	};
}

export async function extractDocxImageSources(input: {
	docxBuffer: Buffer;
	originalFilename: string;
	storeImage?: StoreDocxImage;
}) {
	const converted = await convertDocxToHtmlWithLocalImages(input);
	return converted.imageSources;
}

export function rewriteHtmlImageSources(html: string, imageSources: string[]) {
	let imageIndex = 0;
	let replacedImageCount = 0;
	const warnings: string[] = [];

	const rewrittenHtml = html.replace(/<img\b[^>]*>/gi, (tag) => {
		const src = imageSources[imageIndex];
		imageIndex += 1;
		if (!src) return tag;

		replacedImageCount += 1;
		const escapedSrc = escapeHtmlAttribute(src);
		if (/\bsrc\s*=/i.test(tag)) {
			return tag.replace(/\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `src="${escapedSrc}"`);
		}

		return tag.replace(/\/?>$/, ` src="${escapedSrc}">`);
	});

	if (imageSources.length > replacedImageCount) {
		warnings.push('Some embedded images were extracted but were not referenced in the converted preview.');
	}
	if (imageIndex > imageSources.length && imageSources.length > 0) {
		warnings.push('Some preview image references could not be matched to embedded DOCX images.');
	}

	return {
		html: rewrittenHtml,
		htmlImageCount: imageIndex,
		extractedImageCount: imageSources.length,
		replacedImageCount,
		warnings
	};
}
