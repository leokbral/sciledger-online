import type { RequestHandler } from '@sveltejs/kit';
import { GridFSBucket, ObjectId } from 'mongodb';
import * as crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { chromium } from 'playwright';
import { db } from '$lib/db/mongo';
import { fsFiles } from '$lib/db/fs';

type PaperRecord = {
	_id?: unknown;
	id?: string;
	title?: string;
	abstract?: string;
	content?: string;
	keywords?: string[];
	pdfUrl?: string;
	paperPictures?: Array<string | null | undefined>;
	mainAuthor?: unknown;
	correspondingAuthor?: unknown;
	coAuthors?: unknown[];
	hubId?: unknown;
	authorAffiliations?: Array<{
		userId?: string;
		username?: string;
		name?: string;
		department?: string;
		affiliation?: string;
	}>;
	createdAt?: unknown;
};

const bucket = new GridFSBucket(db);
const papers = db.collection<PaperRecord>('papers');
const users = db.collection<Record<string, unknown>>('users');
const hubs = db.collection<Record<string, unknown>>('hubs');

function stripHtml(value: unknown): string {
	const source = typeof value === 'string' ? value : '';
	return source
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/\s+/g, ' ')
		.trim();
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
	return escapeHtml(value).replace(/`/g, '&#96;');
}

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

function toAbsoluteUrl(baseUrl: string, value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	try {
		return new URL(trimmed, baseUrl).toString();
	} catch {
		return null;
	}
}

function normalizeName(author: Record<string, unknown> | null): string {
	if (!author) {
		return 'Unknown author';
	}

	const firstName = String(author.firstName ?? '').trim();
	const lastName = String(author.lastName ?? '').trim();
	const fullName = `${firstName} ${lastName}`.trim();
	if (fullName) {
		return fullName;
	}

	const username = String(author.username ?? '').trim();
	if (username) {
		return username;
	}

	const email = String(author.email ?? '').trim();
	return email || 'Unknown author';
}

function getInitials(name: string): string {
	const parts = name.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'NA';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getReferenceTitle(value: unknown): string | null {
	if (!value) {
		return null;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed || null;
	}

	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		const candidate = record.title ?? record.name;
		return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
	}

	return null;
}

function getReferenceObjectId(value: unknown): string | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const record = value as Record<string, unknown>;
	const candidate = record.id ?? record._id;
	return candidate ? String(candidate) : null;
}

function normalizePaperQuery(paperId: string) {
	const orQuery: Array<Record<string, unknown>> = [{ id: paperId }, { _id: paperId }];
	if (ObjectId.isValid(paperId)) {
		orQuery.push({ _id: new ObjectId(paperId) });
	}
	return { $or: orQuery };
}

async function resolveUserByReference(reference: unknown): Promise<Record<string, unknown> | null> {
	const populated = reference && typeof reference === 'object' ? (reference as Record<string, unknown>) : null;
	if (populated?.firstName || populated?.lastName || populated?.username || populated?.profilePictureUrl) {
		return populated;
	}

	const referenceId = getReferenceId(reference);
	if (!referenceId) {
		return populated;
	}

	return (await users.findOne(
		{ $or: [{ id: referenceId }, { _id: referenceId }] },
		{
			projection: {
				id: 1,
				_id: 1,
				firstName: 1,
				lastName: 1,
				username: 1,
				email: 1,
				position: 1,
				institution: 1,
				profilePictureUrl: 1
			}
		}
	)) as Record<string, unknown> | null;
}

async function resolvePaperAuthors(paper: PaperRecord) {
	const [mainAuthor, correspondingAuthor, coAuthors] = await Promise.all([
		resolveUserByReference(paper.mainAuthor),
		resolveUserByReference(paper.correspondingAuthor),
		Promise.all((Array.isArray(paper.coAuthors) ? paper.coAuthors : []).map((author) => resolveUserByReference(author)))
	]);

	return {
		mainAuthor,
		correspondingAuthor,
		coAuthors: coAuthors.filter((author): author is Record<string, unknown> => Boolean(author))
	};
}

async function resolveHubName(reference: unknown): Promise<string | null> {
	if (reference && typeof reference === 'object') {
		const embeddedTitle = getReferenceTitle(reference);
		if (embeddedTitle) {
			return embeddedTitle;
		}
	}

	const hubId = typeof reference === 'string' ? reference.trim() : getReferenceObjectId(reference);
	if (!hubId) {
		return null;
	}

	const hub = (await hubs.findOne(
		{ $or: [{ id: hubId }, { _id: hubId }] },
		{ projection: { title: 1, name: 1 } }
	)) as Record<string, unknown> | null;

	const title = String(hub?.title ?? hub?.name ?? '').trim();
	return title || null;
}

function getPaperAuthorItems(authors: {
	mainAuthor: Record<string, unknown> | null;
	correspondingAuthor: Record<string, unknown> | null;
	coAuthors: Record<string, unknown>[];
}): Array<Record<string, unknown>> {
	const items: Array<Record<string, unknown>> = [];
	if (authors.mainAuthor) {
		items.push(authors.mainAuthor);
	}

	for (const author of authors.coAuthors) {
		items.push(author);
	}

	if (authors.correspondingAuthor && authors.correspondingAuthor !== authors.mainAuthor) {
		items.push(authors.correspondingAuthor);
	}

	return items.filter((item, index, self) => {
		const key = String(item.id ?? item._id ?? item.username ?? index);
		return self.findIndex((candidate) => String(candidate.id ?? candidate._id ?? candidate.username ?? '') === key) === index;
	});
}

function buildPaperHtml(
	paper: PaperRecord,
	baseUrl: string,
	authors: {
		mainAuthor: Record<string, unknown> | null;
		correspondingAuthor: Record<string, unknown> | null;
		coAuthors: Record<string, unknown>[];
	},
	hubName: string | null
): string {
	const plainTitle = stripHtml(paper.title) || 'Untitled Paper';
	const safeTitle = escapeHtml(plainTitle);
	const titleHtml = typeof paper.title === 'string' && paper.title.trim() ? paper.title : safeTitle;
	const abstractHtml = typeof paper.abstract === 'string' && paper.abstract.trim() ? paper.abstract : '<p>No abstract provided.</p>';
	const contentHtml = typeof paper.content === 'string' && paper.content.trim() ? paper.content : '<p>No content provided.</p>';
	const keywords = Array.isArray(paper.keywords)
		? paper.keywords.map((item) => escapeHtml(String(item))).filter(Boolean)
		: [];

	const keywordsHtml = keywords.length
		? `<div class="keywords"><strong>Keywords:</strong> ${keywords.join(', ')}</div>`
		: '';
	const authorItems = getPaperAuthorItems(authors);
	const authorNames = authorItems.map((author) => normalizeName(author)).filter(Boolean);
	const authorSectionHtml = authorNames.length
		? `<div class="paper-line-numbered-block paper-authors-inline">${escapeHtml(authorNames.join(', '))}</div>`
		: '';
	const publishedDate = paper.createdAt ? new Date(String(paper.createdAt)).toDateString() : '';
	const hubBadgeHtml = hubName
		? `<div class="paper-hub-badge paper-line-number-exempt">${escapeHtml(hubName)}</div>`
		: '';
	const watermarkHtml = `<div class="paper-watermark paper-line-number-exempt">In Review</div>`;

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${safeTitle}</title>
		<style>
			* {
				box-sizing: border-box;
			}

			html,
			body {
				margin: 0;
				padding: 0;
				background: #ffffff;
			}

			.page {
				width: 100%;
				max-width: 170mm;
				margin: 0 auto;
			}

			.paper-title {
				margin: 0 0 10pt;
				font-size: 24pt;
				font-weight: 700;
				line-height: 1.18;
				color: #0f172a;
			}

			.paper-published {
				margin: 0 0 12pt;
				font-size: 9pt;
				color: #64748b;
			}

			.paper-watermark {
				position: fixed;
				inset: 50% auto auto 50%;
				transform: translate(-50%, -50%) rotate(-28deg);
				font-size: 54pt;
				font-weight: 800;
				letter-spacing: 0.16em;
				text-transform: uppercase;
				color: rgba(148, 163, 184, 0.16);
				z-index: 0;
				pointer-events: none;
				user-select: none;
				white-space: nowrap;
			}

			.paper-hub-badge {
				position: fixed;
				top: 0;
				right: 0;
				transform: translate(-1mm, 1mm);
				padding: 2px 6px;
				border: 1px solid rgba(148, 163, 184, 0.45);
				border-radius: 999px;
				background: rgba(255, 255, 255, 0.72);
				color: rgba(71, 85, 105, 0.88);
				font-size: 7pt;
				font-weight: 600;
				letter-spacing: 0.02em;
				text-transform: uppercase;
				z-index: 2;
				pointer-events: none;
				user-select: none;
			}

			.paper-authors-inline {
				margin: 0 0 10pt;
				font-size: 11pt;
				font-weight: 500;
				line-height: 1.4;
				color: #475569;
			}

			.paper-line-numbered-root {
				--paper-line-gutter: 3.75rem;
				position: relative;
				box-sizing: border-box;
				padding-left: var(--paper-line-gutter);
			}

			.paper-line-numbered-root::before {
				content: '';
				position: absolute;
				left: calc(var(--paper-line-gutter) - 0.65rem);
				top: 0;
				height: var(--paper-line-number-height, 100%);
				width: 1px;
				background: #e2e8f0;
			}

			.paper-line-numbered-root .paper-line-numbered-block {
				position: relative;
				min-width: 0;
			}

			.paper-line-numbered-root .paper-line-fragment {
				position: relative;
			}

			.paper-line-numbered-root > .paper-line-number-layer {
				position: absolute;
				left: 0;
				top: 0;
				height: var(--paper-line-number-height, 100%);
				width: calc(var(--paper-line-gutter) - 0.75rem);
				pointer-events: none;
				user-select: none;
				z-index: 1;
			}

			.paper-line-numbered-root > .paper-line-number-layer .paper-line-number-marker {
				position: absolute;
				right: 0.45rem;
				transform: translateY(-0.08rem);
				color: #94a3b8;
				font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
				font-size: 0.72rem;
				font-weight: 600;
				line-height: 1;
				text-align: right;
				white-space: nowrap;
			}

			.keywords {
				font-size: 10pt;
				color: #334155;
				margin: 0 0 14pt;
			}

			.content img,
			.abstract img {
				max-width: 100%;
				height: auto;
			}

			.content table,
			.abstract table {
				width: 100%;
				border-collapse: collapse;
			}

			.content th,
			.content td,
			.abstract th,
			.abstract td {
				border: 1px solid #cbd5e1;
				padding: 6px;
			}

			@page {
				size: A4;
				margin: 20mm;
			}
		</style>
	</head>
	<body>
		${watermarkHtml}
		${hubBadgeHtml}
		<main class="page">
			<div class="paper-line-numbered-root">
				<h1 class="paper-title paper-line-numbered-block">${titleHtml}</h1>
				${publishedDate ? `<div class="paper-published paper-line-numbered-block">Published: ${escapeHtml(publishedDate)}</div>` : ''}
				${authorSectionHtml}
				${keywordsHtml ? `<div class="paper-line-numbered-block">${keywordsHtml}</div>` : ''}
				<section class="paper-line-numbered-block">
					<h2>Abstract</h2>
					<div class="abstract">${abstractHtml}</div>
				</section>
				<section class="paper-line-numbered-block">
					<div class="content">${contentHtml}</div>
				</section>
			</div>
		</main>
	</body>
</html>`;
}

async function generatePaperPdfBuffer(
	paper: PaperRecord,
	baseUrl: string,
	authors: {
		mainAuthor: Record<string, unknown> | null;
		correspondingAuthor: Record<string, unknown> | null;
		coAuthors: Record<string, unknown>[];
	},
	hubName: string | null
): Promise<Buffer> {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage({
			viewport: {
				width: 1280,
				height: 1810
			}
		});

		await page.setContent(buildPaperHtml(paper, baseUrl, authors, hubName), {
			waitUntil: 'networkidle'
		});

		await page.evaluate(() => {
			const ROOT_CLASS = 'paper-line-numbered-root';
			const FRAGMENT_CLASS = 'paper-line-fragment';
			const EXEMPT_CLASS = 'paper-line-number-exempt';
			const LAYER_CLASS = 'paper-line-number-layer';
			const MARKER_CLASS = 'paper-line-number-marker';
			const HEIGHT_VAR = '--paper-line-number-height';
			const TOLERANCE = 4;
			const SKIP_TAGS = new Set([
				'SCRIPT',
				'STYLE',
				'NOSCRIPT',
				'TEXTAREA',
				'PRE',
				'CODE',
				'SVG',
				'MATH',
				'TABLE',
				'THEAD',
				'TBODY',
				'TFOOT',
				'TR',
				'TD',
				'TH'
			]);

			function wrapTextNodes(root: HTMLElement) {
				const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
					acceptNode(node) {
						if (!node.textContent?.trim()) {
							return NodeFilter.FILTER_REJECT;
						}

						const parent = node.parentElement;
						if (!parent) {
							return NodeFilter.FILTER_REJECT;
						}

						if (parent.closest(`.${EXEMPT_CLASS}`)) {
							return NodeFilter.FILTER_REJECT;
						}

						if (parent.closest(`.${FRAGMENT_CLASS}`)) {
							return NodeFilter.FILTER_REJECT;
						}

						if (SKIP_TAGS.has(parent.tagName)) {
							return NodeFilter.FILTER_REJECT;
						}

						return NodeFilter.FILTER_ACCEPT;
					}
				});

				const textNodes: Text[] = [];
				let currentNode = walker.nextNode();
				while (currentNode) {
					textNodes.push(currentNode as Text);
					currentNode = walker.nextNode();
				}

				for (const textNode of textNodes) {
					const parent = textNode.parentNode;
					if (!parent) continue;

					const tokens = textNode.textContent?.match(/(\s+|[^\s]+)/g);
					if (!tokens?.length) continue;

					const fragment = document.createDocumentFragment();
					for (const token of tokens) {
						if (/^\s+$/.test(token)) {
							fragment.append(document.createTextNode(token));
							continue;
						}

						const span = document.createElement('span');
						span.className = FRAGMENT_CLASS;
						span.textContent = token;
						fragment.append(span);
					}

					parent.replaceChild(fragment, textNode);
				}
			}

			function appendUniqueOffset(offsets: number[], candidate: number) {
				const normalized = Math.max(0, Math.round(candidate * 100) / 100);
				const previous = offsets[offsets.length - 1];
				if (previous === undefined || Math.abs(normalized - previous) > TOLERANCE / 2) {
					offsets.push(normalized);
				}
			}

			function collectLineMeasurements(root: HTMLElement) {
				const fragments = Array.from(root.querySelectorAll<HTMLElement>(`.${FRAGMENT_CLASS}`));
				const rootRect = root.getBoundingClientRect();
				const measurements = fragments
					.map((fragment) => {
						const rect = fragment.getBoundingClientRect();
						return {
							top: rect.top - rootRect.top,
							height: rect.height,
							width: rect.width
						};
					})
					.filter((measurement) => measurement.width > 0 || measurement.height > 0)
					.sort((left, right) => left.top - right.top);

				const uniqueLines: Array<{ top: number; height: number }> = [];
				for (const measurement of measurements) {
					const last = uniqueLines[uniqueLines.length - 1];
					if (last && Math.abs(measurement.top - last.top) <= TOLERANCE) {
						last.height = Math.max(last.height, measurement.height);
						continue;
					}

					uniqueLines.push({ top: measurement.top, height: measurement.height });
				}

				return uniqueLines;
			}

			function inferLineStep(root: HTMLElement, lines: Array<{ top: number; height: number }>) {
				const deltas = lines
					.slice(1)
					.map((line, index) => line.top - lines[index].top)
					.filter((delta) => delta > TOLERANCE && delta < 96)
					.sort((left, right) => left - right);

				if (deltas.length > 0) {
					const sampleSize = Math.max(1, Math.ceil(deltas.length * 0.5));
					const sample = deltas.slice(0, sampleSize);
					const midpoint = Math.floor(sample.length / 2);
					const inferred = sample[midpoint];
					return Math.min(42, Math.max(14, inferred));
				}

				const style = window.getComputedStyle(root);
				const explicitLineHeight = Number.parseFloat(style.lineHeight);
				if (Number.isFinite(explicitLineHeight)) {
					return Math.min(42, Math.max(14, explicitLineHeight));
				}

				const fontSize = Number.parseFloat(style.fontSize);
				if (Number.isFinite(fontSize)) {
					return Math.min(42, Math.max(14, fontSize * 1.5));
				}

				return 24;
			}

			function getLineBottom(lines: Array<{ top: number; height: number }>, baseStep: number) {
				if (!lines.length) {
					return 0;
				}

				const lastLine = lines[lines.length - 1];
				return Math.max(lastLine.top + lastLine.height, lastLine.top + baseStep);
			}

			function buildLineOffsets(
				lines: Array<{ top: number; height: number }>,
				baseStep: number,
				contentBottom: number
			) {
				const offsets: number[] = [];
				if (lines.length === 0) {
					return offsets;
				}

				const firstLineTop = lines[0].top;
				if (firstLineTop > baseStep * 1.25) {
					for (let initialTop = 0; initialTop < firstLineTop - baseStep * 0.45; initialTop += baseStep) {
						appendUniqueOffset(offsets, initialTop);
					}
				}

				for (let index = 0; index < lines.length; index += 1) {
					const currentLine = lines[index];
					appendUniqueOffset(offsets, currentLine.top);

					const nextLine = lines[index + 1];
					if (!nextLine) continue;

					const gap = nextLine.top - currentLine.top;
					const naturalGap = Math.max(baseStep * 1.35, currentLine.height * 1.15, nextLine.height * 1.15);
					if (gap <= naturalGap) continue;

					for (let gapTop = currentLine.top + baseStep; gapTop < nextLine.top - baseStep * 0.45; gapTop += baseStep) {
						appendUniqueOffset(offsets, gapTop);
					}
				}

				const lastOffset = offsets.length ? offsets[offsets.length - 1] : 0;
				for (let tailTop = lastOffset + baseStep; tailTop <= contentBottom - baseStep * 0.25; tailTop += baseStep) {
					appendUniqueOffset(offsets, tailTop);
				}

				return offsets;
			}

			function getOrCreateLayer(root: HTMLElement) {
				const existingLayer = Array.from(root.children).find((child) => child.classList.contains(LAYER_CLASS));
				if (existingLayer instanceof HTMLDivElement) {
					return existingLayer;
				}

				const layer = document.createElement('div');
				layer.className = `${LAYER_CLASS} ${EXEMPT_CLASS}`;
				layer.setAttribute('aria-hidden', 'true');
				root.insertBefore(layer, root.firstChild);
				return layer;
			}

			function renderLineNumbers(root: HTMLElement, offsets: number[], contentBottom: number) {
				const layer = getOrCreateLayer(root);
				layer.replaceChildren();
				root.style.setProperty(HEIGHT_VAR, `${Math.max(0, Math.round(contentBottom))}px`);

				const markers = document.createDocumentFragment();
				offsets.forEach((offset, index) => {
					const marker = document.createElement('span');
					marker.className = MARKER_CLASS;
					marker.textContent = String(index + 1);
					marker.style.top = `${offset}px`;
					markers.appendChild(marker);
				});

				layer.appendChild(markers);
			}

			Array.from(document.querySelectorAll<HTMLElement>(`.${ROOT_CLASS}`)).forEach((root) => {
				wrapTextNodes(root);
				const lines = collectLineMeasurements(root);
				const baseStep = inferLineStep(root, lines);
				const contentBottom = getLineBottom(lines, baseStep);
				const offsets = buildLineOffsets(lines, baseStep, contentBottom);
				renderLineNumbers(root, offsets, contentBottom);
			});
		});

		await page.waitForTimeout(150);

		await page.emulateMedia({ media: 'print' });

		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
			margin: {
				top: '20mm',
				right: '20mm',
				bottom: '20mm',
				left: '20mm'
			}
		});

		return Buffer.from(pdf);
	} finally {
		await browser.close();
	}
}

async function uploadPdfBuffer(paperId: string, filename: string, pdfBuffer: Buffer): Promise<string> {
	const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
	const existing = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
	if (existing?.metadata?.id) {
		return String(existing.metadata.id);
	}

	const generatedId = crypto.randomUUID();
	const uploadStream = bucket.openUploadStream(filename, {
		contentType: 'application/pdf',
		metadata: {
			id: generatedId,
			fileHash,
			source: 'generated-paper',
			paperId,
			size: pdfBuffer.length,
			generatedAt: new Date().toISOString()
		}
	});

	await new Promise<void>((resolve, reject) => {
		Readable.from(pdfBuffer)
			.pipe(uploadStream)
			.on('finish', () => resolve())
			.on('error', reject);
	});

	return generatedId;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const paperId = String(params.paperId ?? '').trim();
	if (!paperId) {
		return new Response(JSON.stringify({ message: 'paperId is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let force = false;
	try {
		const payload = (await request.json()) as { force?: boolean };
		force = Boolean(payload?.force);
	} catch {
		force = false;
	}

	try {
		const paperQuery = normalizePaperQuery(paperId);
		const paper = await papers.findOne(paperQuery, {
			projection: {
				_id: 1,
				id: 1,
				title: 1,
				abstract: 1,
				content: 1,
				keywords: 1,
				pdfUrl: 1,
				paperPictures: 1,
				mainAuthor: 1,
				correspondingAuthor: 1,
				coAuthors: 1,
				authorAffiliations: 1,
				hubId: 1,
				createdAt: 1
			}
		});

		if (!paper) {
			return new Response(JSON.stringify({ message: 'Paper not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!force && paper.pdfUrl) {
			const existingPdf = await fsFiles.findOne({ 'metadata.id': paper.pdfUrl });
			if (existingPdf) {
				return new Response(JSON.stringify({ pdfId: String(paper.pdfUrl), reused: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		const authors = await resolvePaperAuthors(paper);
		const hubName = await resolveHubName(paper.hubId);
		const pdfBuffer = await generatePaperPdfBuffer(paper, new URL(request.url).origin, authors, hubName);
		const filename = `${paper.id || paperId}-submission.pdf`;
		const generatedPdfId = await uploadPdfBuffer(paperId, filename, pdfBuffer);

		await papers.updateOne(paperQuery, { $set: { pdfUrl: generatedPdfId } });

		return new Response(
			JSON.stringify({
				pdfId: generatedPdfId,
				pdfUrl: `/api/pdfs/${generatedPdfId}`,
				reused: false
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Error generating paper PDF:', error);
		return new Response(
			JSON.stringify({
				message: 'Failed to generate paper PDF',
				detail: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.message : String(error)
			}),
			{
			status: 500,
			headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
