/**
 * SciLedger — Número impresso da referência.
 *
 * A ligação `[3]` ➜ referência 3 é feita por `enhanceReferencesInPage.ts`, dentro
 * do navegador, com a mesma lógica da página web. Aqui sobrou só a parte que
 * precisa acontecer antes, na montagem do HTML: descobrir com que número o autor
 * numerou cada referência.
 */

/**
 * Uma referência copiada do DOCX costuma vir com o próprio número na frente
 * ("[3] Smith, J. …" ou "3. Smith, J. …"). Como o template já numera com `<ol>`,
 * o número duplicaria. Aqui ele é extraído e reaproveitado como âncora — assim o
 * `[3]` do texto aponta para a entrada que o autor de fato numerou como 3.
 */
export function parseReferenceNumber(item: string): { number: number | null; html: string } {
	// Só quando o marcador está mesmo no começo do texto: se vier envolvido em tags
	// (`<em>[3]</em> …`), cortar o prefixo deixaria uma tag de fechamento órfã.
	const match = item.match(/^\s*\[?(\d{1,3})[\].)]\s+/);
	if (!match) return { number: null, html: item };

	const number = Number(match[1]);
	if (number < 1 || number > 999) return { number: null, html: item };

	return { number, html: item.slice(match[0].length) };
}
