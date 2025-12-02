<script lang="ts">
	import { onMount } from 'svelte';
	import 'quill/dist/quill.snow.css';
	import sanitizeHtml from 'sanitize-html';

	let editor: any = $state();

	interface Props {
		id: string;
		content?: string;
		placeholder?: string;
		minHeight?: string;
	}

	let { id, content = $bindable(''), placeholder = 'Enter text...', minHeight = '200px' }: Props = $props();

	// Insere estrutura inicial do artigo
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

	// Adiciona referência no texto e lista
	function addReference() {
		const contentHTML = editor.root.innerHTML;
		const refMatches = contentHTML.match(/\[\d+\]/g) || [];
		const nextRefNumber = refMatches.length + 1;

		// Insere [n] no local do cursor
		const range = editor.getSelection();
		if (range) {
			editor.insertText(range.index, `[${nextRefNumber}]`);
		}

		// Tenta localizar <ol> de referências
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

	// Função opcional: transforma [n] em links clicáveis no HTML exportado
	function processReferences(html: string): string {
		return html.replace(/\[(\d+)\]/g, (_match, num) => {
			return `<a href="#ref-${num}">[${num}]</a>`;
		});
	}

	onMount(async () => {
		const Quill = (await import('quill')).default;

		// Define toolbar baseada no id - título tem opções limitadas
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
					container: toolbarConfig,
					// handlers: {
					// 	template: insertArticleTemplate,
					// 	addRef: addReference
					// }
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
		// Atualiza conteúdo com HTML sanitizado
		editor.on('text-change', () => {
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

			// Processa para transformar [n] em links
			content = processReferences(safeHTML);
		});

		// Se houver conteúdo inicial, insere no editor
		if (content) {
			editor.root.innerHTML = content;
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
