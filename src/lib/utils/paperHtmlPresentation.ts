const STYLE_TAG_ID = 'paper-line-number-styles';
const LINE_FRAGMENT_CLASS = 'paper-line-fragment';
const LINE_NUMBER_EXEMPT_CLASS = 'paper-line-number-exempt';
const LINE_NUMBER_BLOCK_CLASS = 'paper-line-numbered-block';
const LINE_NUMBER_ROOT_CLASS = 'paper-line-numbered-root';
const LINE_NUMBER_LAYER_CLASS = 'paper-line-number-layer';
const LINE_NUMBER_MARKER_CLASS = 'paper-line-number-marker';
const LINE_NUMBER_HEIGHT_VAR = '--paper-line-number-height';
const PAPER_PRINT_WATERMARK_CLASS = 'paper-print-watermark';
const REFERENCE_STYLED_ATTR = 'data-paper-reference-styled';
const LINE_POSITION_TOLERANCE = 4;
const REFERENCE_CITATION_CLASS = 'paper-reference-citation';
const REFERENCE_BACKLINK_CLASS = 'paper-reference-backlink';
const REFERENCE_ENTRY_CLASS = 'paper-reference-entry';

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

export const PAPER_LINE_NUMBER_STYLE = `
	.${LINE_NUMBER_ROOT_CLASS} {
		--paper-line-gutter: 3.75rem;
		position: relative;
		box-sizing: border-box;
		padding-left: var(--paper-line-gutter);
	}

	.${LINE_NUMBER_ROOT_CLASS}::before {
		content: '';
		position: absolute;
		left: calc(var(--paper-line-gutter) - 0.65rem);
		top: 0;
		height: var(${LINE_NUMBER_HEIGHT_VAR}, 100%);
		width: 1px;
		background: #e2e8f0;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_NUMBER_BLOCK_CLASS} {
		position: relative;
		min-width: 0;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_FRAGMENT_CLASS} {
		position: relative;
	}

	.${LINE_NUMBER_ROOT_CLASS} > .${LINE_NUMBER_LAYER_CLASS} {
		position: absolute;
		left: 0;
		top: 0;
		height: var(${LINE_NUMBER_HEIGHT_VAR}, 100%);
		width: calc(var(--paper-line-gutter) - 0.75rem);
		pointer-events: none;
		user-select: none;
		z-index: 1;
	}

	.${LINE_NUMBER_ROOT_CLASS} > .${LINE_NUMBER_LAYER_CLASS} .${LINE_NUMBER_MARKER_CLASS} {
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

	.${LINE_NUMBER_ROOT_CLASS} .paper-reference-link {
		color: #0f766e;
		font-weight: 600;
	}

	.${LINE_NUMBER_ROOT_CLASS} .paper-reference-link:hover {
		color: #134e4a;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${REFERENCE_BACKLINK_CLASS} {
		margin-left: 0.4rem;
		font-size: 0.78rem;
		text-decoration: none;
		color: #0f766e;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${REFERENCE_BACKLINK_CLASS}:hover {
		color: #134e4a;
		text-decoration: underline;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${REFERENCE_ENTRY_CLASS} {
		scroll-margin-top: 1.5rem;
	}

	@media (max-width: 640px) {
		.${LINE_NUMBER_ROOT_CLASS} {
			--paper-line-gutter: 2.8rem;
		}

		.${LINE_NUMBER_ROOT_CLASS} > .${LINE_NUMBER_LAYER_CLASS} .${LINE_NUMBER_MARKER_CLASS} {
			font-size: 0.68rem;
		}
	}
`;

const PAPER_PRINT_STYLE = `
	body {
		margin: 0;
		background: #ffffff;
		color: #0f172a;
		font-family: Georgia, 'Times New Roman', serif;
	}

	.paper-print-shell {
		max-width: 820px;
		margin: 0 auto;
		padding: 24px 18px 40px;
		position: relative;
		z-index: 1;
	}

	.${PAPER_PRINT_WATERMARK_CLASS} {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-content: space-evenly;
		justify-items: center;
		gap: 10vh 8vw;
		padding: 6vh 6vw;
		pointer-events: none;
		user-select: none;
		opacity: 0.06;
		z-index: 0;
		transform: rotate(-28deg);
		transform-origin: center;
	}

	.${PAPER_PRINT_WATERMARK_CLASS} span {
		color: #0f172a;
		font-family: 'Helvetica Neue', Arial, sans-serif;
		font-size: clamp(2.4rem, 6vw, 4.25rem);
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.paper-print-shell button {
		display: none !important;
	}

	.paper-print-shell .paper-export-title {
		margin: 0 0 1.25rem;
		font-size: 1.9rem;
		line-height: 1.2;
		font-weight: 700;
		color: #0f172a;
	}

	.paper-print-shell .paper-export-label {
		margin: 1.25rem 0 0.65rem;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #475569;
	}

	.paper-print-shell .paper-export-authors {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		align-items: start;
		gap: 0.6rem 1rem;
		margin: 0 0 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.9rem;
		background: #f8fafc;
	}

	.paper-print-shell .paper-export-author {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		min-width: 0;
		padding: 0.1rem 0;
		break-inside: avoid;
		page-break-inside: avoid;
	}

	.paper-print-shell .paper-export-author-avatar {
		flex: 0 0 2rem;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		overflow: hidden;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.paper-print-shell .paper-export-author-avatar > * {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: inherit;
		overflow: hidden;
	}

	.paper-print-shell .paper-export-author-avatar img,
	.paper-print-shell .paper-export-author-avatar picture,
	.paper-print-shell .paper-export-author-avatar svg,
	.paper-print-shell .paper-export-author-avatar canvas {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.paper-print-shell .paper-export-author-name {
		min-width: 0;
	}

	.paper-print-shell .paper-export-author-body {
		min-width: 0;
		flex: 1 1 auto;
	}

	.paper-print-shell .paper-export-author-role {
		display: block;
		color: #94a3b8;
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.paper-print-shell .paper-export-author-name a,
	.paper-print-shell .paper-export-author-name span {
		display: block;
		color: #0f172a;
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
		line-height: 1.35;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.paper-print-shell .paper-export-author-meta {
		margin-top: 0.2rem;
		font-size: 0.76rem;
		line-height: 1.45;
		color: #64748b;
	}

	.paper-print-shell .paper-export-author-meta p {
		margin: 0.12rem 0;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.paper-print-shell .paper-export-abstract,
	.paper-print-shell .paper-export-content {
		font-size: 1rem;
		line-height: 1.7;
		color: #1f2937;
	}

	.paper-print-shell .paper-export-abstract p,
	.paper-print-shell .paper-export-content p {
		margin: 0 0 0.9rem;
	}

	.paper-print-shell .paper-export-content h1,
	.paper-print-shell .paper-export-content h2,
	.paper-print-shell .paper-export-content h3,
	.paper-print-shell .paper-export-content h4,
	.paper-print-shell .paper-export-content h5,
	.paper-print-shell .paper-export-content h6 {
		margin: 1.2rem 0 0.65rem;
		line-height: 1.3;
		font-weight: 700;
	}

	.paper-print-shell .paper-export-content ul,
	.paper-print-shell .paper-export-content ol,
	.paper-print-shell .paper-export-abstract ul,
	.paper-print-shell .paper-export-abstract ol {
		margin: 0 0 0.9rem;
		padding-left: 1.5rem;
	}

	.paper-print-shell .paper-export-content li,
	.paper-print-shell .paper-export-abstract li {
		margin-bottom: 0.35rem;
	}

	.paper-print-shell .paper-export-content blockquote,
	.paper-print-shell .paper-export-abstract blockquote {
		margin: 1rem 0;
		padding-left: 1rem;
		border-left: 3px solid #cbd5e1;
		color: #475569;
	}

	.paper-print-shell .paper-export-content img,
	.paper-print-shell .paper-export-abstract img {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1rem auto;
	}

	.paper-print-shell .paper-export-badges,
	.paper-print-shell .paper-export-metadata,
	.paper-print-shell .paper-export-image {
		margin-bottom: 1rem;
	}

	.paper-print-shell .paper-export-main-image {
		page-break-inside: avoid;
		border-radius: 0.35rem;
		overflow: hidden;
	}

	.paper-print-shell img.paper-export-main-image {
		display: block;
		width: min(100%, 28rem);
		max-width: 100%;
		max-height: 15rem;
		height: auto;
		object-fit: cover;
		margin: 0.85rem auto 1rem;
	}

	.paper-print-shell div.paper-export-main-image {
		display: flex;
		align-items: center;
		justify-content: center;
		width: min(100%, 28rem);
		max-width: 100%;
		height: 12rem;
		margin: 0.85rem auto 1rem;
		color: #64748b;
	}

	.paper-print-shell .paper-export-badges span,
	.paper-print-shell .paper-export-metadata span {
		display: inline-block;
		margin: 0 0.4rem 0.4rem 0;
		padding: 0.25rem 0.65rem;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		font-size: 0.78rem;
		color: #475569;
	}

	@page {
		size: A4;
		margin: 14mm 12mm 16mm 16mm;
	}
`;

function stripHtml(source: string): string {
	return source
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function escapeHtml(source: string): string {
	return source
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function buildPaperPrintWatermarkMarkup(watermarkText?: string): string {
	const normalizedText = stripHtml(watermarkText ?? '').trim();
	if (!normalizedText) {
		return '';
	}

	const safeText = escapeHtml(normalizedText);
	const stamps = Array.from({ length: 8 }, () => `<span>${safeText}</span>`).join('');
	return `<div class="${PAPER_PRINT_WATERMARK_CLASS}" aria-hidden="true">${stamps}</div>`;
}

function normalizeReferenceNumberToken(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return /^\d+$/.test(trimmed) ? trimmed : null;
}

function isInsideReferenceEntry(node: Node): boolean {
	const parent = node.parentElement;
	if (!parent) return false;

	return Boolean(parent.closest('[id^="ref-"]'));
}

function isInsideLink(node: Node): boolean {
	const parent = node.parentElement;
	if (!parent) return false;

	return Boolean(parent.closest('a'));
}

function getReferenceNumberFromHref(href: string | null): string | null {
	if (!href) return null;
	const match = href.match(/^#(?:paper-)?ref-(\d+)$/i);
	return match?.[1] ?? null;
}

function styleReferenceAnchor(
	anchor: HTMLAnchorElement,
	referenceNumber: string,
	citationIndex: number
) {
	anchor.classList.add(
		'paper-reference-link',
		REFERENCE_CITATION_CLASS,
		'text-primary-500',
		'hover:text-primary-950',
		'cursor-pointer',
		'font-medium',
		'no-underline'
	);
	anchor.dataset.referenceNumber = referenceNumber;
	if (!anchor.id) {
		anchor.id = `paper-cite-${referenceNumber}-${citationIndex}`;
	}
}

function findReferenceEntry(root: HTMLElement, referenceNumber: string): HTMLElement | null {
	const exactId = root.querySelector<HTMLElement>(`[id="ref-${referenceNumber}"]`);
	if (exactId) return exactId;

	const candidates = Array.from(
		root.querySelectorAll<HTMLElement>('li, p, div, td, dd, blockquote')
	);
	for (const candidate of candidates) {
		if (isInsideLink(candidate)) continue;
		const text = (candidate.textContent ?? '').replace(/\s+/g, ' ').trim();
		if (new RegExp(`^\\[${referenceNumber}\\]\\s*`).test(text)) {
			return candidate;
		}
	}

	return null;
}

export function enhancePaperReferenceLinks(root: HTMLElement) {
	const contentElements = Array.from(root.querySelectorAll<HTMLElement>('.paper-content'));

	for (const element of contentElements) {
		if (element.getAttribute(REFERENCE_STYLED_ATTR) === 'true') {
			continue;
		}

		const citationIdsByNumber = new Map<string, string[]>();

		const existingAnchors = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'));
		for (const anchor of existingAnchors) {
			const referenceNumber = normalizeReferenceNumberToken(
				getReferenceNumberFromHref(anchor.getAttribute('href'))
			);
			if (!referenceNumber) continue;

			const citationIds = citationIdsByNumber.get(referenceNumber) ?? [];
			citationIds.push(anchor.id || `paper-cite-${referenceNumber}-${citationIds.length + 1}`);
			citationIdsByNumber.set(referenceNumber, citationIds);
			styleReferenceAnchor(anchor, referenceNumber, citationIds.length);
		}

		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.textContent?.includes('[')) return NodeFilter.FILTER_REJECT;
				if (!node.textContent.match(/\[\d+\]/)) return NodeFilter.FILTER_REJECT;
				if (!node.parentElement) return NodeFilter.FILTER_REJECT;
				if (isInsideReferenceEntry(node) || isInsideLink(node)) return NodeFilter.FILTER_REJECT;
				if (SKIP_TAGS.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			}
		});

		const textNodes: Text[] = [];
		let current = walker.nextNode();
		while (current) {
			textNodes.push(current as Text);
			current = walker.nextNode();
		}

		for (const textNode of textNodes) {
			const parent = textNode.parentNode;
			if (!parent) continue;

			const tokenPattern = new RegExp(String.raw`(\[\d+\]|\s+|[^\s\[\]]+)`, 'g');
			const tokens = textNode.textContent?.match(tokenPattern);
			if (!tokens?.length) continue;

			const fragment = document.createDocumentFragment();
			for (const token of tokens) {
				const citationMatch = token.match(/^\[(\d+)\]$/);
				if (!citationMatch) {
					fragment.append(document.createTextNode(token));
					continue;
				}

				const referenceNumber = citationMatch[1];
				const citationIds = citationIdsByNumber.get(referenceNumber) ?? [];
				const citationIndex = citationIds.length + 1;
				const citationId = `paper-cite-${referenceNumber}-${citationIndex}`;
				citationIds.push(citationId);
				citationIdsByNumber.set(referenceNumber, citationIds);

				const anchor = document.createElement('a');
				anchor.href = `#ref-${referenceNumber}`;
				styleReferenceAnchor(anchor, referenceNumber, citationIndex);
				anchor.setAttribute('aria-label', `Go to reference ${referenceNumber}`);
				anchor.innerHTML = `[<span class="paper-reference-number">${referenceNumber}</span>]`;
				fragment.append(anchor);
			}

			parent.replaceChild(fragment, textNode);
		}

		for (const [referenceNumber, citationIds] of citationIdsByNumber.entries()) {
			const referenceEntry = findReferenceEntry(element, referenceNumber);
			if (!referenceEntry) continue;

			referenceEntry.id = `ref-${referenceNumber}`;
			referenceEntry.classList.add(REFERENCE_ENTRY_CLASS);

			if (!referenceEntry.querySelector(`.${REFERENCE_BACKLINK_CLASS}`) && citationIds.length > 0) {
				const backlinksWrapper = document.createElement('span');
				backlinksWrapper.className = 'ml-2 inline-flex flex-wrap gap-1';

				citationIds.forEach((citationId, index) => {
					const backlink = document.createElement('a');
					backlink.className = `${REFERENCE_BACKLINK_CLASS} text-primary-500 hover:text-primary-950 cursor-pointer font-medium no-underline`;
					backlink.href = `#${citationId}`;
					backlink.title = `Back to citation ${index + 1} in text`;
					backlink.textContent = `↩${index + 1}`;
					backlinksWrapper.appendChild(backlink);
				});

				referenceEntry.appendChild(backlinksWrapper);
			}
		}

		element.setAttribute(REFERENCE_STYLED_ATTR, 'true');
	}
}

function markReferenceLinks(root: HTMLElement) {
	enhancePaperReferenceLinks(root);
}

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

			if (parent.closest(`.${LINE_NUMBER_EXEMPT_CLASS}`)) {
				return NodeFilter.FILTER_REJECT;
			}

			if (parent.closest(`.${LINE_FRAGMENT_CLASS}`)) {
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
			span.className = LINE_FRAGMENT_CLASS;
			span.textContent = token;
			fragment.append(span);
		}

		parent.replaceChild(fragment, textNode);
	}
}

type PaperLineMeasurement = {
	top: number;
	height: number;
};

function getOrCreateLineNumberLayer(root: HTMLElement, doc: Document = document): HTMLDivElement {
	const existingLayer = Array.from(root.children).find((child) =>
		child.classList.contains(LINE_NUMBER_LAYER_CLASS)
	);
	if (existingLayer instanceof HTMLDivElement) {
		return existingLayer;
	}

	const layer = doc.createElement('div');
	layer.className = `${LINE_NUMBER_LAYER_CLASS} ${LINE_NUMBER_EXEMPT_CLASS}`;
	layer.setAttribute('aria-hidden', 'true');
	root.insertBefore(layer, root.firstChild);
	return layer;
}

function collectPaperLineMeasurements(root: HTMLElement): PaperLineMeasurement[] {
	const fragments = Array.from(root.querySelectorAll<HTMLElement>(`.${LINE_FRAGMENT_CLASS}`));
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

	const uniqueLines: PaperLineMeasurement[] = [];
	for (const measurement of measurements) {
		const last = uniqueLines[uniqueLines.length - 1];
		if (last && Math.abs(measurement.top - last.top) <= LINE_POSITION_TOLERANCE) {
			last.height = Math.max(last.height, measurement.height);
			continue;
		}

		uniqueLines.push({
			top: measurement.top,
			height: measurement.height
		});
	}

	return uniqueLines;
}

function resolveFallbackLineHeight(root: HTMLElement): number {
	const style = window.getComputedStyle(root);
	const explicitLineHeight = Number.parseFloat(style.lineHeight);
	if (Number.isFinite(explicitLineHeight)) {
		return explicitLineHeight;
	}

	const fontSize = Number.parseFloat(style.fontSize);
	if (Number.isFinite(fontSize)) {
		return fontSize * 1.5;
	}

	return 24;
}

function inferPaperLineStep(root: HTMLElement, lines: PaperLineMeasurement[]): number {
	const deltas = lines
		.slice(1)
		.map((line, index) => line.top - lines[index].top)
		.filter((delta) => delta > LINE_POSITION_TOLERANCE && delta < 96)
		.sort((left, right) => left - right);

	if (deltas.length > 0) {
		const sampleSize = Math.max(1, Math.ceil(deltas.length * 0.5));
		const sample = deltas.slice(0, sampleSize);
		const midpoint = Math.floor(sample.length / 2);
		const inferred = sample[midpoint];
		return Math.min(42, Math.max(14, inferred));
	}

	const heights = lines
		.map((line) => line.height)
		.filter((height) => height > 0)
		.sort((left, right) => left - right);

	if (heights.length > 0) {
		const inferred = heights[Math.floor(heights.length / 2)];
		return Math.min(42, Math.max(14, inferred));
	}

	return Math.min(42, Math.max(14, resolveFallbackLineHeight(root)));
}

function appendUniqueLineOffset(offsets: number[], candidate: number) {
	const normalized = Math.max(0, Math.round(candidate * 100) / 100);
	const previous = offsets[offsets.length - 1];
	if (previous === undefined || Math.abs(normalized - previous) > LINE_POSITION_TOLERANCE / 2) {
		offsets.push(normalized);
	}
}

function getPaperLineBottom(lines: PaperLineMeasurement[], baseStep: number): number {
	if (lines.length === 0) {
		return 0;
	}

	const lastLine = lines[lines.length - 1];
	return Math.max(lastLine.top + lastLine.height, lastLine.top + baseStep);
}

function buildPaperLineOffsets(
	lines: PaperLineMeasurement[],
	baseStep: number,
	contentBottom: number
): number[] {
	const offsets: number[] = [];

	if (lines.length === 0) {
		return offsets;
	}

	const firstLineTop = lines[0].top;
	if (firstLineTop > baseStep * 1.25) {
		for (let top = 0; top < firstLineTop - baseStep * 0.45; top += baseStep) {
			appendUniqueLineOffset(offsets, top);
		}
	}

	for (let index = 0; index < lines.length; index += 1) {
		const currentLine = lines[index];
		appendUniqueLineOffset(offsets, currentLine.top);

		const nextLine = lines[index + 1];
		if (!nextLine) continue;

		const gap = nextLine.top - currentLine.top;
		const naturalGap = Math.max(baseStep * 1.35, currentLine.height * 1.15, nextLine.height * 1.15);

		if (gap <= naturalGap) {
			continue;
		}

		for (
			let top = currentLine.top + baseStep;
			top < nextLine.top - baseStep * 0.45;
			top += baseStep
		) {
			appendUniqueLineOffset(offsets, top);
		}
	}

	const lastOffset = offsets[offsets.length - 1] ?? 0;
	for (let top = lastOffset + baseStep; top <= contentBottom - baseStep * 0.25; top += baseStep) {
		appendUniqueLineOffset(offsets, top);
	}

	return offsets;
}

function renderPaperLineNumbers(root: HTMLElement, lineOffsets: number[], contentBottom: number) {
	const layer = getOrCreateLineNumberLayer(root);
	layer.replaceChildren();
	root.style.setProperty(LINE_NUMBER_HEIGHT_VAR, `${Math.max(0, Math.round(contentBottom))}px`);

	const markers = document.createDocumentFragment();
	lineOffsets.forEach((offset, index) => {
		const marker = document.createElement('span');
		marker.className = LINE_NUMBER_MARKER_CLASS;
		marker.textContent = String(index + 1);
		marker.style.top = `${offset}px`;
		markers.appendChild(marker);
	});

	layer.appendChild(markers);
}

export function refreshPaperLineNumbers(root: HTMLElement): number {
	const lines = collectPaperLineMeasurements(root);
	const baseStep = inferPaperLineStep(root, lines);
	const contentBottom = getPaperLineBottom(lines, baseStep);
	const lineOffsets = buildPaperLineOffsets(lines, baseStep, contentBottom);
	renderPaperLineNumbers(root, lineOffsets, contentBottom);
	return lineOffsets.length;
}

export function ensurePaperLineNumberStyles(doc: Document = document) {
	if (doc.getElementById(STYLE_TAG_ID)) {
		return;
	}

	const styleTag = doc.createElement('style');
	styleTag.id = STYLE_TAG_ID;
	styleTag.textContent = PAPER_LINE_NUMBER_STYLE;
	doc.head.appendChild(styleTag);
}

export function setupPaperHtmlPresentation(root: HTMLElement) {
	ensurePaperLineNumberStyles();
	enhancePaperReferenceLinks(root);
	markReferenceLinks(root);
	wrapTextNodes(root);

	let frameId = 0;
	const refresh = () => {
		cancelAnimationFrame(frameId);
		frameId = window.requestAnimationFrame(() => {
			refreshPaperLineNumbers(root);
		});
	};

	const resizeObserver = new ResizeObserver(() => {
		refresh();
	});

	resizeObserver.observe(root);
	window.addEventListener('resize', refresh);
	void document.fonts?.ready?.then(() => refresh());
	refresh();

	return () => {
		cancelAnimationFrame(frameId);
		resizeObserver.disconnect();
		window.removeEventListener('resize', refresh);
	};
}

export function openPaperPdfPreview(
	root: HTMLElement,
	paperTitle: string,
	preferredFilename?: string,
	watermarkText?: string
): boolean {
	enhancePaperReferenceLinks(root);
	refreshPaperLineNumbers(root);
	const printableTitle = stripHtml(paperTitle) || 'paper';
	const printDocumentTitle =
		stripHtml(preferredFilename ?? '')
			.replace(/\.pdf$/i, '')
			.trim() || printableTitle;
	const printWindow = window.open('', '_blank');

	if (!printWindow) {
		return false;
	}

	const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(printDocumentTitle)}</title>
		<style>${PAPER_LINE_NUMBER_STYLE}</style>
		<style>${PAPER_PRINT_STYLE}</style>
	</head>
	<body>
		${buildPaperPrintWatermarkMarkup(watermarkText)}
		<div class="paper-print-shell">
			${root.outerHTML}
		</div>
		<script>
			(function() {
				var rootSelector = '.${LINE_NUMBER_ROOT_CLASS}';
				var fragmentSelector = '.${LINE_FRAGMENT_CLASS}';
				var layerClass = '${LINE_NUMBER_LAYER_CLASS}';
				var markerClass = '${LINE_NUMBER_MARKER_CLASS}';
				var heightVar = '${LINE_NUMBER_HEIGHT_VAR}';
				var exemptClass = '${LINE_NUMBER_EXEMPT_CLASS}';
				var tolerance = ${LINE_POSITION_TOLERANCE};

				function appendUniqueOffset(offsets, candidate) {
					var normalized = Math.max(0, Math.round(candidate * 100) / 100);
					var previous = offsets.length ? offsets[offsets.length - 1] : null;
					if (previous === null || Math.abs(normalized - previous) > tolerance / 2) {
						offsets.push(normalized);
					}
				}

				function getLineBottom(lines, baseStep) {
					if (!lines.length) {
						return 0;
					}

					var lastLine = lines[lines.length - 1];
					return Math.max(lastLine.top + lastLine.height, lastLine.top + baseStep);
				}

				function getOrCreateLayer(root) {
					var children = Array.prototype.slice.call(root.children);
					for (var index = 0; index < children.length; index += 1) {
						if (children[index].classList.contains(layerClass)) {
							return children[index];
						}
					}

					var layer = document.createElement('div');
					layer.className = layerClass + ' ' + exemptClass;
					layer.setAttribute('aria-hidden', 'true');
					root.insertBefore(layer, root.firstChild);
					return layer;
				}

				function collectLineMeasurements(root) {
					var fragments = Array.prototype.slice.call(root.querySelectorAll(fragmentSelector));
					var rootRect = root.getBoundingClientRect();
					var measurements = fragments
						.map(function(fragment) {
							var rect = fragment.getBoundingClientRect();
							return {
								top: rect.top - rootRect.top,
								height: rect.height,
								width: rect.width
							};
						})
						.filter(function(measurement) {
							return measurement.width > 0 || measurement.height > 0;
						})
						.sort(function(left, right) {
							return left.top - right.top;
						});

					var uniqueLines = [];
					measurements.forEach(function(measurement) {
						var last = uniqueLines.length ? uniqueLines[uniqueLines.length - 1] : null;
						if (last && Math.abs(measurement.top - last.top) <= tolerance) {
							last.height = Math.max(last.height, measurement.height);
							return;
						}

						uniqueLines.push({
							top: measurement.top,
							height: measurement.height
						});
					});

					return uniqueLines;
				}

				function resolveFallbackLineHeight(root) {
					var style = window.getComputedStyle(root);
					var explicitLineHeight = Number.parseFloat(style.lineHeight);
					if (Number.isFinite(explicitLineHeight)) {
						return explicitLineHeight;
					}

					var fontSize = Number.parseFloat(style.fontSize);
					if (Number.isFinite(fontSize)) {
						return fontSize * 1.5;
					}

					return 24;
				}

				function inferLineStep(root, lines) {
					var deltas = lines
						.slice(1)
						.map(function(line, index) {
							return line.top - lines[index].top;
						})
						.filter(function(delta) {
							return delta > tolerance && delta < 96;
						})
						.sort(function(left, right) {
							return left - right;
						});

					if (deltas.length > 0) {
						var sampleSize = Math.max(1, Math.ceil(deltas.length * 0.5));
						var sample = deltas.slice(0, sampleSize);
						var inferred = sample[Math.floor(sample.length / 2)];
						return Math.min(42, Math.max(14, inferred));
					}

					var heights = lines
						.map(function(line) {
							return line.height;
						})
						.filter(function(height) {
							return height > 0;
						})
						.sort(function(left, right) {
							return left - right;
						});

					if (heights.length > 0) {
						var heightGuess = heights[Math.floor(heights.length / 2)];
						return Math.min(42, Math.max(14, heightGuess));
					}

					return Math.min(42, Math.max(14, resolveFallbackLineHeight(root)));
				}

				function buildLineOffsets(lines, baseStep, contentBottom) {
					var offsets = [];

					if (lines.length === 0) {
						return offsets;
					}

					var firstLineTop = lines[0].top;
					if (firstLineTop > baseStep * 1.25) {
						for (var initialTop = 0; initialTop < firstLineTop - baseStep * 0.45; initialTop += baseStep) {
							appendUniqueOffset(offsets, initialTop);
						}
					}

					for (var index = 0; index < lines.length; index += 1) {
						var currentLine = lines[index];
						appendUniqueOffset(offsets, currentLine.top);

						var nextLine = lines[index + 1];
						if (!nextLine) continue;

						var gap = nextLine.top - currentLine.top;
						var naturalGap = Math.max(
							baseStep * 1.35,
							currentLine.height * 1.15,
							nextLine.height * 1.15
						);

						if (gap <= naturalGap) {
							continue;
						}

						for (
							var gapTop = currentLine.top + baseStep;
							gapTop < nextLine.top - baseStep * 0.45;
							gapTop += baseStep
						) {
							appendUniqueOffset(offsets, gapTop);
						}
					}

					var lastOffset = offsets.length ? offsets[offsets.length - 1] : 0;
					for (
						var tailTop = lastOffset + baseStep;
						tailTop <= contentBottom - baseStep * 0.25;
						tailTop += baseStep
					) {
						appendUniqueOffset(offsets, tailTop);
					}

					return offsets;
				}

				function renderLineNumbers(root, lineOffsets, contentBottom) {
					var layer = getOrCreateLayer(root);
					layer.replaceChildren();
					root.style.setProperty(heightVar, Math.max(0, Math.round(contentBottom)) + 'px');

					var markers = document.createDocumentFragment();
					lineOffsets.forEach(function(offset, index) {
						var marker = document.createElement('span');
						marker.className = markerClass;
						marker.textContent = String(index + 1);
						marker.style.top = offset + 'px';
						markers.appendChild(marker);
					});

					layer.appendChild(markers);
				}

				function refresh(root) {
					var lines = collectLineMeasurements(root);
					var baseStep = inferLineStep(root, lines);
					var contentBottom = getLineBottom(lines, baseStep);
					var lineOffsets = buildLineOffsets(lines, baseStep, contentBottom);
					renderLineNumbers(root, lineOffsets, contentBottom);
				}

				function refreshAll() {
					Array.prototype.slice.call(document.querySelectorAll(rootSelector)).forEach(refresh);
				}

				window.addEventListener('load', function() {
					requestAnimationFrame(function() {
						refreshAll();
						setTimeout(function() {
							window.focus();
							window.print();
						}, 250);
					});
				});

				window.addEventListener('resize', refreshAll);
				window.addEventListener('afterprint', function() {
					window.close();
				});
			})();
		</script>
	</body>
</html>`;

	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
	return true;
}
