/**
 * SciLedger — Transforma endereços escritos como texto em links de verdade.
 *
 * Por que existe: as referências chegam como texto corrido. Vêm do DOCX
 * ("Smith, J. (2021). … https://doi.org/10.1234/x") ou são montadas a partir de
 * `paper.citations`. Nenhuma delas traz `<a>`. O Chromium só cria uma anotação de
 * link no PDF quando existe uma âncora no HTML — sem `<a href>`, o leitor vê o
 * endereço mas não consegue clicar.
 *
 * Reconhece: URLs http(s), `www.`, DOIs (com ou sem o prefixo `doi:`) e e-mails.
 *
 * Regras de segurança:
 *  · nunca mexe dentro de uma tag (o texto de um atributo fica intacto);
 *  · nunca linka dentro de um `<a>` que já existe — hyperlink aninhado é HTML
 *    inválido e o Chromium descarta os dois;
 *  · pontuação final ("…/10.1234/x.") fica de fora do href.
 */

/** Um passo do varredor: ou uma tag inteira, ou um pedaço de texto. */
const TAG = /<[^>]*>/g;

/**
 * Ordem importa: a URL completa vem primeiro para que o "10.x" dentro de
 * `https://doi.org/10.x` seja consumido junto e não sobre para a regra de DOI.
 */
const TARGET = new RegExp(
	[
		'(https?:\\/\\/[^\\s<>"\'()\\[\\]]+)', // 1 · URL completa
		'(www\\.[^\\s<>"\'()\\[\\]]+)', // 2 · sem esquema
		'(?:doi:\\s*)?(10\\.\\d{4,9}\\/[^\\s<>"\'()\\[\\],;]+)', // 3 · DOI
		'([\\w.+-]+@[\\w-]+\\.[\\w.-]{2,})' // 4 · e-mail
	].join('|'),
	'gi'
);

/** Pontuação que costuma encostar no fim de uma citação e não faz parte do endereço. */
function trimTrailing(value: string): { url: string; tail: string } {
	let url = value;
	let tail = '';
	while (url.length > 1) {
		const last = url[url.length - 1];
		if ('.,;:!?'.includes(last) || (last === ')' && !url.includes('('))) {
			tail = last + tail;
			url = url.slice(0, -1);
			continue;
		}
		break;
	}
	return { url, tail };
}

function linkifyText(text: string): string {
	return text.replace(TARGET, (match, full?: string, www?: string, doi?: string, mail?: string) => {
		if (mail) {
			const clean = trimTrailing(mail);
			return `<a href="mailto:${clean.url}">${clean.url}</a>${clean.tail}`;
		}

		const raw = full ?? www ?? doi ?? '';
		const { url, tail } = trimTrailing(raw);

		let href: string;
		if (full) href = url;
		else if (www) href = `https://${url}`;
		else href = `https://doi.org/${url}`;

		// o rótulo mantém o que o autor escreveu, inclusive o prefixo "doi:"
		const label = match.slice(0, match.length - tail.length);
		return `<a href="${href}">${label}</a>${tail}`;
	});
}

/**
 * Percorre o HTML alternando entre tags e texto e só linka o texto que está
 * fora de qualquer `<a>`.
 */
export function autolinkHtml(html: string): string {
	if (!html) return '';

	let out = '';
	let cursor = 0;
	let anchorDepth = 0;

	TAG.lastIndex = 0;
	let tag: RegExpExecArray | null;
	while ((tag = TAG.exec(html))) {
		const text = html.slice(cursor, tag.index);
		out += anchorDepth > 0 ? text : linkifyText(text);

		const name = tag[0].toLowerCase();
		if (/^<a\b/.test(name)) anchorDepth += 1;
		else if (/^<\/a\s*>/.test(name) && anchorDepth > 0) anchorDepth -= 1;

		out += tag[0];
		cursor = tag.index + tag[0].length;
	}

	const rest = html.slice(cursor);
	out += anchorDepth > 0 ? rest : linkifyText(rest);
	return out;
}
