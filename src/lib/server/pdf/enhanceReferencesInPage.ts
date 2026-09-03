/**
 * SciLedger — Referências cruzadas do PDF, com a MESMA lógica da web.
 *
 * A página do artigo faz isso no navegador, em `enhancePaperReferenceLinks`
 * (`$lib/utils/paperHtmlPresentation`): varre os nós de texto, transforma `[3]` em
 * link para `#ref-3`, **procura no DOM** a entrada da lista cujo texto começa com
 * `[3]`, marca ela com `id="ref-3"` e acrescenta as setinhas ↩ de volta.
 *
 * Antes eu tinha reescrito isso com expressão regular no servidor. Errado: a
 * regex assume que a referência 3 é o terceiro item da lista que o pipeline montou.
 * Quando a seção "References" não é reconhecida no corpo (título fora do padrão,
 * "Bibliografia", `<p><strong>REFERENCES</strong></p>` em vez de `<h1>`), a lista
 * fica vazia ou fora de ordem e os saltos vão para o lugar errado.
 *
 * Aqui a lógica roda no MESMO lugar da web — sobre o DOM já montado, dentro do
 * Chromium, logo antes de imprimir. Resolve por busca, não por posição, então
 * funciona nos três casos:
 *
 *   1. a entrada já tem `id="ref-N"` (lista montada pelo pipeline);
 *   2. a entrada está solta no corpo começando com "[3] Smith, J. …";
 *   3. nada disso — cai no N-ésimo item de `ol.refs`.
 *
 * O que a versão da web faz e aqui está igual: mesmos seletores, mesma varredura
 * por `TreeWalker`, mesmos ids (`ref-N`, `paper-cite-N-i`), mesmas setinhas.
 * A única correção deliberada: o tokenizador da web descarta colchetes soltos
 * (`[a]` perde os colchetes) porque eles não casam com nenhuma alternativa do
 * `match`; aqui eles são preservados.
 */

export type ReferenceLinkReport = {
	/** Marcadores [N] do texto que viraram link. */
	citations: number;
	/** Entradas da lista que foram encontradas e ancoradas. */
	resolved: number;
	/** Números citados no texto para os quais não existe entrada. */
	unresolved: number[];
};

/**
 * Roda dentro da página (Playwright `page.evaluate`).
 *
 * Precisa ser autocontida: nada de referência a escopo de módulo, porque só o
 * corpo da função é serializado para dentro do navegador.
 */
export function enhanceReferencesInPage(): ReferenceLinkReport {
	const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'PRE', 'CODE', 'SVG', 'MATH']);

	const bodyRoot = document.querySelector<HTMLElement>('.paper-content');
	if (!bodyRoot) return { citations: 0, resolved: 0, unresolved: [] };

	// A lista pode estar no back matter do template OU ainda solta no corpo, quando
	// o título da seção não foi reconhecido na extração. Procura nos dois, nessa
	// ordem — o back matter tem prioridade, o documento inteiro é a rede de segurança.
	const searchRoots: HTMLElement[] = [];
	const backMatter = document.querySelector<HTMLElement>('.paper-references');
	if (backMatter) searchRoots.push(backMatter);
	searchRoots.push(document.body);

	const citationIdsByNumber = new Map<string, string[]>();

	const remember = (n: string, anchor: HTMLAnchorElement) => {
		const ids = citationIdsByNumber.get(n) ?? [];
		if (!anchor.id) anchor.id = `paper-cite-${n}-${ids.length + 1}`;
		ids.push(anchor.id);
		citationIdsByNumber.set(n, ids);
		anchor.classList.add('xref');
		anchor.setAttribute('aria-label', `Go to reference ${n}`);
	};

	// 1 · âncoras que já vieram do Word apontando para #ref-N
	for (const anchor of Array.from(bodyRoot.querySelectorAll('a[href]'))) {
		const href = anchor.getAttribute('href') ?? '';
		const match = href.match(/^#(?:paper-)?ref-(\d+)$/i);
		if (match) remember(match[1], anchor as HTMLAnchorElement);
	}

	// 2 · [N] escrito como texto ➜ link (mesmo TreeWalker da web)
	const walker = document.createTreeWalker(bodyRoot, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const text = node.textContent ?? '';
			// grupo de citação: [3], [1,2], [2-4] — a web só reconhece [3]; os grupos
			// são acréscimo, porque artigos reais usam as três formas
			if (!/\[\s*\d+(?:\s*[,;]\s*\d+|\s*[–—-]\s*\d+)*\s*\]/.test(text)) {
				return NodeFilter.FILTER_REJECT;
			}
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;
			if (parent.closest('[id^="ref-"]') || parent.closest('a')) return NodeFilter.FILTER_REJECT;
			if (SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_ACCEPT;
		}
	});

	const textNodes: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node as Text);

	for (const textNode of textNodes) {
		const parent = textNode.parentNode;
		if (!parent) continue;

		// `[[\]]` no fim preserva colchetes soltos, que o tokenizador da web descarta
		const tokens = (textNode.textContent ?? '').match(
			/\[\s*\d+(?:\s*[,;]\s*\d+|\s*[–—-]\s*\d+)*\s*\]|\s+|[^\s[\]]+|[[\]]/g
		);
		if (!tokens?.length) continue;

		const fragment = document.createDocumentFragment();
		for (const token of tokens) {
			if (!/^\[\s*\d/.test(token)) {
				fragment.append(document.createTextNode(token));
				continue;
			}
			// dentro do grupo só os NÚMEROS viram link; vírgulas, traços e os
			// colchetes seguem texto, então a citação impressa fica idêntica
			for (const part of token.match(/\d+|[^\d]+/g) ?? []) {
				if (!/^\d+$/.test(part)) {
					fragment.append(document.createTextNode(part));
					continue;
				}
				const anchor = document.createElement('a');
				anchor.href = `#ref-${part}`;
				anchor.textContent = part;
				remember(part, anchor);
				fragment.append(anchor);
			}
		}
		parent.replaceChild(fragment, textNode);
	}

	// 3 · acha a entrada de cada referência citada e ancora nela
	const unresolved: number[] = [];
	let resolved = 0;

	for (const [n, citeIds] of Array.from(citationIdsByNumber.entries())) {
		let entry = document.getElementById(`ref-${n}`);

		// busca por texto: "[3] Smith, J. …", "3. Smith, J. …", "3) Smith, J. …"
		if (!entry) {
			const pattern = new RegExp(`^\\[?${n}[\\].)]\\s`);
			for (const root of searchRoots) {
				for (const candidate of Array.from(
					root.querySelectorAll<HTMLElement>('li, p, div, td, dd, blockquote')
				)) {
					if (candidate.closest('a') || candidate.querySelector('li, p')) continue;
					const text = (candidate.textContent ?? '').replace(/\s+/g, ' ').trim();
					if (pattern.test(text)) {
						entry = candidate;
						break;
					}
				}
				if (entry) break;
			}
		}

		// último recurso: o N-ésimo item da lista do back matter
		if (!entry) {
			const items = document.querySelectorAll<HTMLElement>('ol.paper-references > li');
			entry = items[Number(n) - 1] ?? null;
		}

		if (!entry) {
			unresolved.push(Number(n));
			continue;
		}

		entry.id = `ref-${n}`;
		resolved += 1;

		// setinhas de volta para cada ponto do texto que citou esta referência
		if (!entry.querySelector('.backrefs')) {
			const wrapper = document.createElement('span');
			wrapper.className = 'backrefs';
			citeIds.forEach((citeId, i) => {
				const back = document.createElement('a');
				back.className = 'backref';
				back.href = `#${citeId}`;
				back.title = `Back to citation ${i + 1}`;
				back.textContent = `↩${i + 1}`;
				wrapper.append(back);
			});
			entry.append(document.createTextNode(' '), wrapper);
		}
	}

	const citations = Array.from(citationIdsByNumber.values()).reduce((sum, ids) => sum + ids.length, 0);
	return { citations, resolved, unresolved };
}
