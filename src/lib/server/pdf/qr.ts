/**
 * SciLedger — Gerador de QR Code sem dependências externas.
 *
 * Por que escrever do zero: o projeto não tem (e não precisa ter) a lib `qrcode`.
 * Um QR é apenas uma matriz de bits desenhada em SVG — 200 linhas resolvem, sem
 * `npm install`, sem binário nativo, sem rede em tempo de build.
 *
 * Implementa QR Model 2, modo BYTE (UTF-8), versões 1..10, níveis L/M/Q/H.
 * Uma URL de verificação (~60 caracteres) cabe folgada na versão 4-5 com ECC M.
 *
 * Saída: `qrSvgDataUri(text)` ➜ "data:image/svg+xml;base64,..." pronto para <img src>.
 * SVG (e não PNG) porque o QR precisa ficar nítido em qualquer DPI de impressão.
 */

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

/* ── Tabelas do padrão ISO/IEC 18004 ─────────────────────────────────────── */

/** [ecCodewordsPorBloco, blocosG1, dadosG1, blocosG2, dadosG2] por versão 1..10. */
const EC_TABLE: Record<EccLevel, number[][]> = {
	L: [
		[], [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0],
		[26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0],
		[30, 2, 116, 0, 0], [18, 2, 68, 2, 69]
	],
	M: [
		[], [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
		[24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
		[22, 3, 36, 2, 37], [26, 4, 43, 1, 44]
	],
	Q: [
		[], [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0],
		[18, 2, 15, 2, 16], [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19],
		[20, 4, 16, 4, 17], [24, 6, 19, 2, 20]
	],
	H: [
		[], [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0],
		[22, 2, 11, 2, 12], [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15],
		[24, 4, 12, 4, 13], [28, 6, 15, 2, 16]
	]
};

/** Centros dos padrões de alinhamento por versão 1..10. */
const ALIGN_POS = [
	[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
	[6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
];

const ECC_BITS: Record<EccLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

/* ── Aritmética em GF(256) para Reed–Solomon ─────────────────────────────── */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		LOG[x] = i;
		x <<= 1;
		if (x & 0x100) x ^= 0x11d; // polinômio primitivo do QR
	}
	for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinômio gerador de grau `degree`. */
function rsGenerator(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMul(poly[j], EXP[i]);
		}
		poly = next;
	}
	return poly;
}

/** Codewords de correção de erro para um bloco de dados. */
function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
	const gen = rsGenerator(ecLen);
	const res = new Uint8Array(ecLen);
	for (const byte of data) {
		const factor = byte ^ res[0];
		res.copyWithin(0, 1);
		res[ecLen - 1] = 0;
		if (factor !== 0) {
			for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
		}
	}
	return res;
}

/* ── Bit stream ──────────────────────────────────────────────────────────── */

class BitBuffer {
	bits: number[] = [];
	put(value: number, length: number) {
		for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
	}
}

/* ── Codificação ─────────────────────────────────────────────────────────── */

function dataCapacityBytes(version: number, ecc: EccLevel): number {
	const [, b1, d1, b2, d2] = EC_TABLE[ecc][version];
	return b1 * d1 + b2 * d2;
}

function pickVersion(byteLen: number, ecc: EccLevel): number {
	for (let v = 1; v <= 10; v++) {
		// header = 4 bits de modo + 8 (v1-9) ou 16 (v10) bits de contagem
		const countBits = v < 10 ? 8 : 16;
		const needed = Math.ceil((4 + countBits + byteLen * 8) / 8);
		if (needed <= dataCapacityBytes(v, ecc)) return v;
	}
	throw new Error('QR: conteúdo grande demais para as versões 1..10.');
}

function buildCodewords(bytes: Uint8Array, version: number, ecc: EccLevel): Uint8Array {
	const capacity = dataCapacityBytes(version, ecc);
	const buf = new BitBuffer();
	buf.put(0b0100, 4); // modo byte
	buf.put(bytes.length, version < 10 ? 8 : 16);
	for (const b of bytes) buf.put(b, 8);

	// terminador + alinhamento em byte
	const maxBits = capacity * 8;
	for (let i = 0; i < 4 && buf.bits.length < maxBits; i++) buf.bits.push(0);
	while (buf.bits.length % 8 !== 0) buf.bits.push(0);

	const data = new Uint8Array(capacity);
	for (let i = 0; i < buf.bits.length; i += 8) {
		let byte = 0;
		for (let j = 0; j < 8; j++) byte = (byte << 1) | buf.bits[i + j];
		data[i / 8] = byte;
	}
	// bytes de preenchimento alternados definidos pelo padrão
	const pad = [0xec, 0x11];
	for (let i = Math.ceil(buf.bits.length / 8), k = 0; i < capacity; i++, k++) data[i] = pad[k % 2];

	// divide em blocos, calcula ECC, intercala
	const [ecLen, b1, d1, b2, d2] = EC_TABLE[ecc][version];
	const dataBlocks: Uint8Array[] = [];
	const ecBlocks: Uint8Array[] = [];
	let offset = 0;
	for (let i = 0; i < b1 + b2; i++) {
		const size = i < b1 ? d1 : d2;
		const block = data.slice(offset, offset + size);
		offset += size;
		dataBlocks.push(block);
		ecBlocks.push(rsEncode(block, ecLen));
	}

	const out: number[] = [];
	const maxData = Math.max(d1, d2);
	for (let i = 0; i < maxData; i++) {
		for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
	}
	for (let i = 0; i < ecLen; i++) {
		for (const block of ecBlocks) out.push(block[i]);
	}
	return new Uint8Array(out);
}

/* ── Matriz ──────────────────────────────────────────────────────────────── */

type Matrix = { size: number; mods: Int8Array; fixed: Uint8Array };

const at = (m: Matrix, r: number, c: number) => m.mods[r * m.size + c];
const set = (m: Matrix, r: number, c: number, v: number, fixed = true) => {
	m.mods[r * m.size + c] = v;
	if (fixed) m.fixed[r * m.size + c] = 1;
};

function placeFinder(m: Matrix, row: number, col: number) {
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const rr = row + r;
			const cc = col + c;
			if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
			const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
			const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
			set(m, rr, cc, inRing || inCore ? 1 : 0);
		}
	}
}

function buildMatrix(version: number, ecc: EccLevel, codewords: Uint8Array, mask: number): Matrix {
	const size = version * 4 + 17;
	const m: Matrix = { size, mods: new Int8Array(size * size).fill(-1), fixed: new Uint8Array(size * size) };

	placeFinder(m, 0, 0);
	placeFinder(m, 0, size - 7);
	placeFinder(m, size - 7, 0);

	// timing
	for (let i = 8; i < size - 8; i++) {
		set(m, 6, i, i % 2 === 0 ? 1 : 0);
		set(m, i, 6, i % 2 === 0 ? 1 : 0);
	}

	// alinhamento
	const centers = ALIGN_POS[version];
	for (const r of centers) {
		for (const c of centers) {
			const nearFinder =
				(r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8);
			if (nearFinder) continue;
			for (let dr = -2; dr <= 2; dr++) {
				for (let dc = -2; dc <= 2; dc++) {
					const ring = Math.max(Math.abs(dr), Math.abs(dc));
					set(m, r + dr, c + dc, ring === 1 ? 0 : 1);
				}
			}
		}
	}

	set(m, size - 8, 8, 1); // módulo escuro obrigatório

	// reserva as áreas de formato
	for (let i = 0; i < 9; i++) {
		if (at(m, 8, i) === -1) set(m, 8, i, 0);
		if (at(m, i, 8) === -1) set(m, i, 8, 0);
	}
	for (let i = 0; i < 8; i++) {
		if (at(m, 8, size - 1 - i) === -1) set(m, 8, size - 1 - i, 0);
		if (at(m, size - 1 - i, 8) === -1) set(m, size - 1 - i, 8, 0);
	}
	// reserva a área de versão (v >= 7)
	if (version >= 7) {
		for (let i = 0; i < 6; i++) {
			for (let j = 0; j < 3; j++) {
				set(m, i, size - 11 + j, 0);
				set(m, size - 11 + j, i, 0);
			}
		}
	}

	// dados em zigue-zague, com máscara aplicada na hora
	let bitIndex = 0;
	let upward = true;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5; // pula a coluna de timing
		for (let step = 0; step < size; step++) {
			const row = upward ? size - 1 - step : step;
			for (let k = 0; k < 2; k++) {
				const col = right - k;
				if (m.fixed[row * m.size + col]) continue;
				let bit = 0;
				if (bitIndex < codewords.length * 8) {
					bit = (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
				}
				bitIndex++;
				if (maskFn(mask, row, col)) bit ^= 1;
				set(m, row, col, bit, false);
			}
		}
		upward = !upward;
	}

	writeFormat(m, ecc, mask);
	if (version >= 7) writeVersion(m, version);
	return m;
}

function maskFn(mask: number, r: number, c: number): boolean {
	switch (mask) {
		case 0: return (r + c) % 2 === 0;
		case 1: return r % 2 === 0;
		case 2: return c % 3 === 0;
		case 3: return (r + c) % 3 === 0;
		case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
		case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
		case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
		default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
	}
}

function bch(value: number, generator: number, genBits: number): number {
	let v = value;
	const genLen = 32 - Math.clz32(generator);
	while (32 - Math.clz32(v) >= genLen) v ^= generator << (32 - Math.clz32(v) - genLen);
	return v & ((1 << genBits) - 1);
}

function writeFormat(m: Matrix, ecc: EccLevel, mask: number) {
	const data = (ECC_BITS[ecc] << 3) | mask;
	const bits = (((data << 10) | bch(data << 10, 0b10100110111, 10)) ^ 0b101010000010010) & 0x7fff;
	const size = m.size;
	for (let i = 0; i < 15; i++) {
		const bit = (bits >>> i) & 1;
		// cópia vertical, coluna 8
		if (i < 6) set(m, i, 8, bit);
		else if (i < 8) set(m, i + 1, 8, bit);
		else set(m, size - 15 + i, 8, bit);
		// cópia horizontal, linha 8
		if (i < 8) set(m, 8, size - i - 1, bit);
		else if (i < 9) set(m, 8, 15 - i, bit);
		else set(m, 8, 14 - i, bit);
	}
	set(m, size - 8, 8, 1); // módulo escuro obrigatório
}

function writeVersion(m: Matrix, version: number) {
	const bits = (version << 12) | bch(version << 12, 0b1111100100101, 12);
	const size = m.size;
	for (let i = 0; i < 18; i++) {
		const bit = (bits >>> i) & 1;
		const r = Math.floor(i / 3);
		const c = size - 11 + (i % 3);
		set(m, r, c, bit);
		set(m, c, r, bit);
	}
}

/* ── Penalidade e escolha de máscara ─────────────────────────────────────── */

function penalty(m: Matrix): number {
	const n = m.size;
	let score = 0;

	// regra 1 — sequências de 5+ módulos iguais
	for (let pass = 0; pass < 2; pass++) {
		for (let a = 0; a < n; a++) {
			let run = 1;
			let prev = pass === 0 ? at(m, a, 0) : at(m, 0, a);
			for (let b = 1; b < n; b++) {
				const cur = pass === 0 ? at(m, a, b) : at(m, b, a);
				if (cur === prev) {
					run++;
				} else {
					if (run >= 5) score += run - 2;
					run = 1;
					prev = cur;
				}
			}
			if (run >= 5) score += run - 2;
		}
	}

	// regra 2 — blocos 2x2 da mesma cor
	for (let r = 0; r < n - 1; r++) {
		for (let c = 0; c < n - 1; c++) {
			const v = at(m, r, c);
			if (v === at(m, r, c + 1) && v === at(m, r + 1, c) && v === at(m, r + 1, c + 1)) score += 3;
		}
	}

	// regra 3 — padrão 1:1:3:1:1 com quiet zone
	const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
	const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
	for (let r = 0; r < n; r++) {
		for (let c = 0; c <= n - 11; c++) {
			let ok1 = true;
			let ok2 = true;
			let ok3 = true;
			let ok4 = true;
			for (let k = 0; k < 11; k++) {
				if (at(m, r, c + k) !== p1[k]) ok1 = false;
				if (at(m, r, c + k) !== p2[k]) ok2 = false;
				if (at(m, c + k, r) !== p1[k]) ok3 = false;
				if (at(m, c + k, r) !== p2[k]) ok4 = false;
			}
			if (ok1) score += 40;
			if (ok2) score += 40;
			if (ok3) score += 40;
			if (ok4) score += 40;
		}
	}

	// regra 4 — desequilíbrio entre claro e escuro
	let dark = 0;
	for (let i = 0; i < m.mods.length; i++) if (m.mods[i] === 1) dark++;
	const pct = (dark * 100) / (n * n);
	score += Math.floor(Math.abs(pct - 50) / 5) * 10;

	return score;
}

/* ── API pública ─────────────────────────────────────────────────────────── */

/** Matriz booleana do QR (true = módulo escuro), já com a melhor máscara. */
export function qrMatrix(text: string, ecc: EccLevel = 'M'): boolean[][] {
	const bytes = new TextEncoder().encode(text);
	const version = pickVersion(bytes.length, ecc);
	const codewords = buildCodewords(bytes, version, ecc);

	let best: Matrix | null = null;
	let bestScore = Infinity;
	for (let mask = 0; mask < 8; mask++) {
		const candidate = buildMatrix(version, ecc, codewords, mask);
		const s = penalty(candidate);
		if (s < bestScore) {
			bestScore = s;
			best = candidate;
		}
	}

	const m = best!;
	const out: boolean[][] = [];
	for (let r = 0; r < m.size; r++) {
		const row: boolean[] = [];
		for (let c = 0; c < m.size; c++) row.push(at(m, r, c) === 1);
		out.push(row);
	}
	return out;
}

/**
 * SVG do QR, em path único (arquivo pequeno e nítido em qualquer DPI).
 * `quiet` = zona silenciosa em módulos; o padrão exige 4.
 */
export function qrSvg(text: string, opts: { ecc?: EccLevel; quiet?: number; dark?: string; light?: string } = {}): string {
	const { ecc = 'M', quiet = 2, dark = '#0B1533', light = '#FFFFFF' } = opts;
	const m = qrMatrix(text, ecc);
	const n = m.length;
	const total = n + quiet * 2;

	let d = '';
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			if (m[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
		}
	}

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
		`<rect width="${total}" height="${total}" fill="${light}"/>` +
		`<path d="${d}" fill="${dark}"/>` +
		`</svg>`
	);
}

/** Pronto para `<img src="...">` dentro do template. */
export function qrSvgDataUri(text: string, opts?: Parameters<typeof qrSvg>[1]): string {
	const svg = qrSvg(text, opts);
	return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

/** Somente para testes: matriz com máscara fixa. */
export function __qrMatrixWithMask(text: string, ecc: EccLevel, mask: number): boolean[][] {
	const bytes = new TextEncoder().encode(text);
	const version = pickVersion(bytes.length, ecc);
	const codewords = buildCodewords(bytes, version, ecc);
	const m = buildMatrix(version, ecc, codewords, mask);
	const out: boolean[][] = [];
	for (let r = 0; r < m.size; r++) {
		const row: boolean[] = [];
		for (let c = 0; c < m.size; c++) row.push(at(m, r, c) === 1);
		out.push(row);
	}
	return out;
}
