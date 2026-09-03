/**
 * SciLedger — Correção das coordenadas de destino no PDF.
 *
 * # O problema
 *
 * O Chromium cria os links internos corretamente: cada `<a href="#ref-3">` vira uma
 * anotação de link e cada `id` vira um destino nomeado em `/Dests`, no catálogo do
 * PDF. Só que ele calcula a coordenada do destino **ignorando a margem superior da
 * página**. O alvo fica exatamente `margem-do-topo` pontos acima de onde deveria.
 *
 * Com margem de 12 mm (34 pt) e uma lista de referências no alto da última página,
 * o leitor tenta rolar para um ponto acima do início do conteúdo, bate no limite da
 * página e para — todos os `[N]` parecem levar "para a última página, sem sair do
 * lugar". Era o sintoma relatado.
 *
 * Medido em cinco margens diferentes (0, 8, 12, 20 e 25 mm): o erro é sempre igual
 * à margem superior, com desvio abaixo de 1 pt. Não é escala, é deslocamento.
 *
 * # A correção
 *
 * Reescrever o `y` de cada destino, subtraindo a margem superior.
 *
 * A reescrita é feita **byte a byte, mantendo o tamanho exato do objeto**: o `y` só
 * diminui, então o número novo nunca é mais longo que o antigo, e a diferença é
 * preenchida com espaços (espaço em branco dentro de um array é válido em PDF).
 * Como nenhum byte muda de posição, a tabela xref continua correta e não é preciso
 * reescrever o arquivo nem depender de uma biblioteca de PDF.
 *
 * Se qualquer premissa falhar (não achou o `/Dests`, o número cresceu, o tamanho
 * mudou), a função devolve o PDF original intacto: um link impreciso é muito melhor
 * do que um arquivo corrompido.
 */

/** Folga acima do alvo, para a linha não encostar na borda da janela do leitor. */
const LEAD_PT = 6;

const MM_TO_PT = 72 / 25.4;

/** "12mm", "0.5in", "34pt", "20" (px) ➜ pontos. */
export function toPoints(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value * 0.75; // px
	const match = String(value).trim().match(/^([\d.]+)\s*(mm|cm|in|pt|px)?$/i);
	if (!match) return 0;
	const n = Number(match[1]);
	switch ((match[2] ?? 'px').toLowerCase()) {
		case 'mm': return n * MM_TO_PT;
		case 'cm': return n * MM_TO_PT * 10;
		case 'in': return n * 72;
		case 'pt': return n;
		default: return n * 0.75;
	}
}

/**
 * Desloca todos os destinos nomeados do PDF em `shiftPt` pontos para baixo.
 * `shiftPt` deve ser a margem superior usada na impressão.
 */
export function fixPdfDestinations(pdf: Buffer, shiftPt: number): Buffer {
	if (!(shiftPt > 0)) return pdf;

	const raw = pdf.toString('latin1');

	// 1 · o catálogo aponta para o objeto que guarda os destinos
	const pointer = raw.match(/\/Dests\s+(\d+)\s+(\d+)\s+R/);
	if (!pointer) return pdf;

	// 2 · localiza esse objeto
	const objRe = new RegExp(`(^|[^0-9])${pointer[1]}\\s+${pointer[2]}\\s+obj\\b`, 'm');
	const objMatch = raw.match(objRe);
	if (!objMatch || objMatch.index === undefined) return pdf;

	const start = objMatch.index + objMatch[0].length;
	const end = raw.indexOf('endobj', start);
	if (end === -1) return pdf;

	// 3 · reescreve cada "/XYZ x y zoom" mantendo o comprimento
	let failed = false;
	const patched = raw.slice(start, end).replace(
		/\/XYZ\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g,
		(whole, x: string, y: string, zoom: string) => {
			const corrected = Math.max(0, Number(y) - shiftPt + LEAD_PT);
			const next = `/XYZ ${x} ${trimNumber(corrected)} ${zoom}`;
			if (next.length > whole.length) {
				failed = true;
				return whole;
			}
			return next.padEnd(whole.length, ' ');
		}
	);

	if (failed) return pdf;

	const out = raw.slice(0, start) + patched + raw.slice(end);
	if (out.length !== raw.length) return pdf; // xref quebraria — desiste

	return Buffer.from(out, 'latin1');
}

/** Duas casas decimais, sem zeros à direita — o PDF do Chromium usa o mesmo formato. */
function trimNumber(value: number): string {
	return value.toFixed(2).replace(/\.?0+$/, '') || '0';
}
