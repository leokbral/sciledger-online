const STYLE_TAG_ID = 'paper-line-number-styles';
const LINE_FRAGMENT_CLASS = 'paper-line-fragment';
const LINE_START_CLASS = 'paper-line-start';
const LINE_NUMBER_EXEMPT_CLASS = 'paper-line-number-exempt';
const LINE_NUMBER_BLOCK_CLASS = 'paper-line-numbered-block';
const LINE_NUMBER_ROOT_CLASS = 'paper-line-numbered-root';
const REFERENCE_STYLED_ATTR = 'data-paper-reference-styled';
const LINE_POSITION_TOLERANCE = 4;

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
		--paper-line-gutter: 3.5rem;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_NUMBER_BLOCK_CLASS} {
		position: relative;
		padding-left: var(--paper-line-gutter);
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_NUMBER_BLOCK_CLASS}::before {
		content: '';
		position: absolute;
		left: calc(var(--paper-line-gutter) - 0.65rem);
		top: 0;
		bottom: 0;
		width: 1px;
		background: #e2e8f0;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_FRAGMENT_CLASS} {
		position: relative;
	}

	.${LINE_NUMBER_ROOT_CLASS} .${LINE_FRAGMENT_CLASS}.${LINE_START_CLASS}::before {
		content: attr(data-line-number);
		position: absolute;
		left: calc(-1 * var(--paper-line-gutter));
		top: 0;
		width: calc(var(--paper-line-gutter) - 0.95rem);
		color: #94a3b8;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.35;
		text-align: right;
		pointer-events: none;
		user-select: none;
	}

	.${LINE_NUMBER_ROOT_CLASS} .paper-reference-link {
		color: #0f766e;
		font-weight: 600;
	}

	.${LINE_NUMBER_ROOT_CLASS} .paper-reference-link:hover {
		color: #134e4a;
	}

	@media (max-width: 640px) {
		.${LINE_NUMBER_ROOT_CLASS} {
			--paper-line-gutter: 2.8rem;
		}

		.${LINE_NUMBER_ROOT_CLASS} .${LINE_FRAGMENT_CLASS}.${LINE_START_CLASS}::before {
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

function markReferenceLinks(root: HTMLElement) {
	const contentElements = Array.from(root.querySelectorAll<HTMLElement>('.paper-content'));

	for (const element of contentElements) {
		if (element.getAttribute(REFERENCE_STYLED_ATTR) === 'true') {
			continue;
		}

		element.innerHTML = element.innerHTML.replace(
			/\[(\d+)\]/g,
			'<span class="paper-reference-link">[<span class="paper-reference-number">$1</span>]</span>'
		);
		element.setAttribute(REFERENCE_STYLED_ATTR, 'true');
	}
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

export function refreshPaperLineNumbers(root: HTMLElement): number {
	const fragments = Array.from(root.querySelectorAll<HTMLElement>(`.${LINE_FRAGMENT_CLASS}`));
	const rootTop = root.getBoundingClientRect().top;

	for (const fragment of fragments) {
		fragment.classList.remove(LINE_START_CLASS);
		fragment.removeAttribute('data-line-number');
	}

	let lineNumber = 0;
	let previousTop: number | null = null;

	for (const fragment of fragments) {
		const rect = fragment.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			continue;
		}

		const currentTop = Math.round(rect.top - rootTop);
		const isNewLine =
			previousTop === null || Math.abs(currentTop - previousTop) > LINE_POSITION_TOLERANCE;

		if (!isNewLine) {
			continue;
		}

		lineNumber += 1;
		previousTop = currentTop;
		fragment.classList.add(LINE_START_CLASS);
		fragment.dataset.lineNumber = String(lineNumber);
	}

	return lineNumber;
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
	preferredFilename?: string
): boolean {
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
		<div class="paper-print-shell">
			${root.outerHTML}
		</div>
		<script>
			(function() {
				var rootSelector = '.${LINE_NUMBER_ROOT_CLASS}';
				var fragmentSelector = '.${LINE_FRAGMENT_CLASS}';
				var lineStartClass = '${LINE_START_CLASS}';
				var tolerance = ${LINE_POSITION_TOLERANCE};

				function refresh(root) {
					var fragments = Array.prototype.slice.call(root.querySelectorAll(fragmentSelector));
					var rootRect = root.getBoundingClientRect();
					var previousTop = null;
					var lineNumber = 0;

					fragments.forEach(function(fragment) {
						fragment.classList.remove(lineStartClass);
						fragment.removeAttribute('data-line-number');
					});

					fragments.forEach(function(fragment) {
						var rect = fragment.getBoundingClientRect();
						if (rect.width === 0 && rect.height === 0) return;

						var currentTop = Math.round(rect.top - rootRect.top);
						var isNewLine = previousTop === null || Math.abs(currentTop - previousTop) > tolerance;

						if (!isNewLine) return;

						lineNumber += 1;
						previousTop = currentTop;
						fragment.classList.add(lineStartClass);
						fragment.setAttribute('data-line-number', String(lineNumber));
					});
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