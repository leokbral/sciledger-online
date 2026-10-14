/**
 * SciLedger — Marca d'água do hub no PDF publicado.
 *
 * Cada hub pode carimbar o PDF final com o próprio nome (ou outra frase) ou com
 * o seu logo. A geometria é a mesma do watermark que o projeto já usa no preview
 * de impressão (`paperHtmlPresentation.ts`): carimbos lado a lado, rotacionados
 * −28°, opacidade baixa. Aqui ela é reescrita em CSS de impressão porque o PDF
 * é gerado pelo Chromium a partir de `setContent`, não pela janela de print.
 *
 * `position: fixed` é intencional: no modo de impressão do Chromium um elemento
 * fixo é repetido em TODA página, que é exatamente o que uma marca d'água
 * precisa. Um elemento absoluto apareceria só na primeira.
 *
 * Os defaults são aplicados AQUI, em código, e não pelo Mongoose: quem lê o hub
 * neste caminho é o driver nativo (`db.collection('hubs')`), que não conhece o
 * schema. Hub sem configuração nenhuma vale como ligada com o nome do hub.
 */

export type HubWatermarkMode = 'text' | 'logo';

export type ResolvedHubWatermark = {
	mode: HubWatermarkMode;
	/** Já sem HTML; vazio quando `mode === 'logo'`. */
	text: string;
	/** `data:` URI; vazio quando `mode === 'text'`. */
	logo: string;
	opacity: number;
};

const DEFAULT_OPACITY = 0.06;
const STAMP_COUNT = 5;
/**
 * Nome comprido quebra em varias linhas, e carimbos altos demais acabam se
 * encostando. Acima deste tamanho a pagina leva menos carimbos.
 */
const LONG_TEXT_LENGTH = 24;
const LONG_TEXT_STAMP_COUNT = 3;

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** Tira marcação e espaço repetido: o texto vem de um campo livre do hub. */
function plainText(value: unknown): string {
	return String(value ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function clampOpacity(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed)) return DEFAULT_OPACITY;
	return Math.min(1, Math.max(0, parsed));
}

/**
 * Decide a marca d'água de um paper a partir do registro do hub.
 *
 * Devolve `null` quando não há marca a aplicar — paper avulso (sem hub), hub que
 * desligou, ou configuração que não sobrou nada para carimbar.
 */
export function resolveHubWatermark(
	hub: Record<string, unknown> | null | undefined,
	hubName: string,
	logoDataUri = ''
): ResolvedHubWatermark | null {
	// Sem hub não há marca d'água de hub: um paper avulso sai limpo.
	if (!hub && !hubName) return null;

	const config = (hub?.publicationWatermark ?? {}) as Record<string, unknown>;

	// Ausente vale como ligada: a configuração só existe nos hubs salvos depois
	// desta mudança, e a decisão do produto é carimbar por padrão.
	if (config.enabled === false) return null;

	const opacity = clampOpacity(config.opacity);
	const requestedMode: HubWatermarkMode = config.mode === 'logo' ? 'logo' : 'text';
	const text = plainText(config.text) || plainText(hubName);

	if (requestedMode === 'logo') {
		if (logoDataUri) {
			return { mode: 'logo', text: '', logo: logoDataUri, opacity };
		}
		// Logo pedido mas indisponível (hub sem logo, ou imagem que não abriu):
		// cai para o texto em vez de publicar um PDF sem marca nenhuma, que é o
		// contrário do que o hub pediu.
		if (text) {
			return { mode: 'text', text, logo: '', opacity };
		}
		return null;
	}

	if (!text) return null;
	return { mode: 'text', text, logo: '', opacity };
}

/**
 * Monta o bloco que entra no `{{WATERMARK}}` do template: estilo + carimbos.
 *
 * O estilo também eleva o conteúdo da página (`z-index: 1`), senão a marca
 * d'água, que é o primeiro filho do body, ficaria por cima do texto.
 */
export function buildHubWatermarkMarkup(watermark: ResolvedHubWatermark | null): string {
	if (!watermark) return '';

	const count =
		watermark.mode === 'text' && watermark.text.length > LONG_TEXT_LENGTH
			? LONG_TEXT_STAMP_COUNT
			: STAMP_COUNT;

	const stamps =
		watermark.mode === 'logo'
			? Array.from({ length: count }, () => `<img src="${escapeHtml(watermark.logo)}" alt="">`).join(
					''
				)
			: Array.from({ length: count }, () => `<span>${escapeHtml(watermark.text)}</span>`).join('');

	return `<style>
	body > .page { position: relative; z-index: 1; }
	.hub-watermark {
		position: fixed;
		inset: 0;
		z-index: 0;
		display: grid;
		/* Uma coluna so: dois carimbos lado a lado se sobrepoem assim que o nome
		   do hub passa de poucos caracteres -- e nome de hub costuma ser longo. */
		grid-template-columns: 1fr;
		align-content: space-evenly;
		justify-items: center;
		gap: 6vh;
		padding: 8vh 8vw;
		pointer-events: none;
		user-select: none;
		opacity: ${watermark.opacity};
		transform: rotate(-28deg);
		transform-origin: center;
	}
	.hub-watermark span {
		color: #0f172a;
		font-family: 'Helvetica Neue', Arial, sans-serif;
		font-size: clamp(1.1rem, 3.4vw, 2.3rem);
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		/* Quebra em vez de sangrar para fora da pagina num nome comprido. */
		max-width: 72vw;
		text-align: center;
		line-height: 1.25;
	}
	.hub-watermark img {
		/* As DUAS dimensoes limitadas: um logo alto (ex. 300x1600) com apenas a
		   largura fixa passaria de 300 mm de altura e estouraria a pagina. */
		width: auto;
		height: auto;
		max-width: min(28vw, 260px);
		max-height: 16vh;
		object-fit: contain;
	}
</style><div class="hub-watermark" aria-hidden="true">${stamps}</div>`;
}

/** Forma guardada no hub. */
export type HubWatermarkConfig = {
	enabled: boolean;
	mode: HubWatermarkMode;
	text: string;
	opacity: number;
};

/**
 * Normaliza o que veio do formulario do hub antes de gravar.
 *
 * Fica aqui, junto dos defaults e do clamp que a renderizacao ja usa, para que
 * gravacao e renderizacao nao possam discordar sobre o que e um valor valido.
 */
export function normalizeHubWatermarkConfig(input: unknown): HubWatermarkConfig {
	const raw = (input ?? {}) as Record<string, unknown>;
	return {
		// Ausente vale ligada, igual a `resolveHubWatermark`.
		enabled: raw.enabled !== false,
		mode: raw.mode === 'logo' ? 'logo' : 'text',
		text: plainText(raw.text),
		opacity: clampOpacity(raw.opacity)
	};
}
