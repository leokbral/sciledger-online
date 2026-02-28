<script lang="ts">
	import { onMount } from 'svelte';
	import 'quill/dist/quill.snow.css';
	import sanitizeHtml from 'sanitize-html';

	let editor: any = $state();
	let previousContent = $state('');
	let isInternalChange = false;

	interface Props {
		id: string;
		content?: string;
		placeholder?: string;
		minHeight?: string;
	}

	let { id, content = $bindable(''), placeholder = 'Enter text...', minHeight = '200px' }: Props = $props();

	function insertArticleTemplate() {
		const templateHTML = `
			<h2><strong>Main</strong></h2>
			<p>Your main text goes here...</p>
			<br/>

			<h2><strong>Discussion/Conclusions</strong></h2> 
			<p>Your discussion or conclusions go here...</p>
			<br/>

			<h2><strong>Methods</strong></h2>
			<p>Your methods go here...</p>
			<br/>

			<h2><strong>References</strong></h2>
			<ol>
			    <li id="ref-1">Reference 1</li>
			</ol>
		`;

		const range = editor.getSelection();
		if (range) {
			editor.clipboard.dangerouslyPasteHTML(range.index, templateHTML);
		}
	}

	function addReference() {
		const contentHTML = editor.root.innerHTML;
		const refMatches = contentHTML.match(/\[\d+\]/g) || [];
		const nextRefNumber = refMatches.length + 1;

		const range = editor.getSelection();
		if (range) {
			editor.insertText(range.index, `[${nextRefNumber}]`);
		}

		const refContainer = editor.root.querySelector('ol');
		if (refContainer) {
			const newRef = document.createElement('li');
			newRef.id = `ref-${nextRefNumber}`;
			newRef.innerHTML = `New Reference ${nextRefNumber}`;
			refContainer.appendChild(newRef);
		} else {
			const html = `
				<h2><strong>References</strong></h2>
				<ol>
					<li id="ref-${nextRefNumber}">New Reference ${nextRefNumber}</li>
				</ol>`;
			editor.clipboard.dangerouslyPasteHTML(editor.getLength(), html);
		}
	}

	function processReferences(html: string): string {
		return html.replace(/\[(\d+)\]/g, (_match, num) => {
			return `<a href="#ref-${num}">[${num}]</a>`;
		});
	}

	onMount(async () => {
		const Quill = (await import('quill')).default;

		const toolbarConfig = id === 'title' 
			? [
				['bold', 'italic', 'underline'],
				['clean']
			]
			: [
				[{ header: [1, 2, 3, false] }],
				['bold', 'italic', 'underline'],
				[{ list: 'ordered' }, { list: 'bullet' }],
				['link', 'blockquote', 'code-block'],
				[{ align: [] }],
				[{ background: [] }],
				['clean'],
				[ `${id !== 'abstract' ? 'image' : '' }` ],
				['template', 'addRef']
			];

		editor = new Quill(`#${id}`, {
			theme: 'snow',
			placeholder,
			modules: {
				toolbar: {
					container: toolbarConfig
				}
			}
		});

		if (id !== 'abstract' && id !== 'title') {
			const templateBtn = document.querySelector('.ql-template') as HTMLElement;
			const addRefButton = document.querySelector('.ql-addRef') as HTMLElement;

			if (templateBtn) {
				templateBtn.innerText = '📄';
				templateBtn.setAttribute('title', 'Insert Structure');
				templateBtn.style.minWidth = '2.5rem';
			}

			if (addRefButton) {
				addRefButton.innerText = '🔗';
				addRefButton.setAttribute('title', 'Add Reference');
				addRefButton.style.minWidth = '2.5rem';
			}
		}
		editor.on('text-change', () => {
			isInternalChange = true;
			
			const rawHTML = editor.root.innerHTML;

			const safeHTML = sanitizeHtml(rawHTML, {
				allowedTags: [
					'h1',
					'h2',
					'h3',
					'p',
					'strong',
					'em',
					'ul',
					'ol',
					'li',
					'blockquote',
					'code',
					'a',
					'br',
					'u',
					'span'
				],
				allowedAttributes: {
					a: ['href', 'target', 'id'],
					li: ['id'],
					span: ['style']
				},
				allowedStyles: {
					'*': {
						'background-color': [/^.*$/],
						'text-align': [/^.*$/]
					}
				},
				allowedSchemes: ['http', 'https', 'mailto']
			});

			content = processReferences(safeHTML);
			previousContent = content;
			
			setTimeout(() => {
				isInternalChange = false;
			}, 0);
		});

		if (content) {
			editor.root.innerHTML = content;
			previousContent = content;
		}
	});

	$effect(() => {
		if (editor && content !== previousContent && !isInternalChange) {
			const selection = editor.getSelection();
			
			editor.root.innerHTML = content;
			previousContent = content;
			
			if (selection) {
				const newLength = editor.getLength();
				const safeIndex = Math.min(selection.index, newLength - 1);
				editor.setSelection(safeIndex, 0);
			}
		}
	});
</script>

<div class="h-full border border-surface-300 rounded-lg mb-4">
	<div {id} style="min-height: {minHeight}"></div>
</div>

<style>
	:global(.ql-editor) {
		height: 100%;
	}
	:global(.ql-container) {
		height: auto !important;
	}
</style>
