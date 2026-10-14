import { describe, expect, it } from 'vitest';
import { buildHubWatermarkMarkup, resolveHubWatermark } from './hubWatermark';

describe('resolveHubWatermark', () => {
	it('carimba com o nome do hub quando o hub nunca configurou nada', () => {
		// Hubs salvos antes do campo existir nao tem `publicationWatermark`, e quem
		// le aqui e o driver nativo, sem defaults do Mongoose. Ausente vale ligada.
		const wm = resolveHubWatermark({ title: 'Mycology Hub' }, 'Mycology Hub');

		expect(wm).not.toBeNull();
		expect(wm?.mode).toBe('text');
		expect(wm?.text).toBe('Mycology Hub');
	});

	it('nao carimba um paper avulso', () => {
		expect(resolveHubWatermark(null, '')).toBeNull();
	});

	it('respeita o hub que desligou', () => {
		const wm = resolveHubWatermark(
			{ title: 'Mycology Hub', publicationWatermark: { enabled: false } },
			'Mycology Hub'
		);

		expect(wm).toBeNull();
	});

	it('prefere o texto proprio do hub ao titulo', () => {
		const wm = resolveHubWatermark(
			{ publicationWatermark: { enabled: true, text: 'Preprint' } },
			'Mycology Hub'
		);

		expect(wm?.text).toBe('Preprint');
	});

	it('usa o logo quando o hub pediu logo e a imagem existe', () => {
		const wm = resolveHubWatermark(
			{ publicationWatermark: { mode: 'logo' } },
			'Mycology Hub',
			'data:image/png;base64,AAA'
		);

		expect(wm?.mode).toBe('logo');
		expect(wm?.logo).toBe('data:image/png;base64,AAA');
		expect(wm?.text).toBe('');
	});

	it('cai para o texto quando o logo foi pedido mas nao existe', () => {
		// Publicar sem carimbo nenhum seria o contrario do que o hub pediu.
		const wm = resolveHubWatermark({ publicationWatermark: { mode: 'logo' } }, 'Mycology Hub', '');

		expect(wm?.mode).toBe('text');
		expect(wm?.text).toBe('Mycology Hub');
	});

	it('nao carimba quando nao sobrou nem texto nem logo', () => {
		expect(resolveHubWatermark({ publicationWatermark: { mode: 'logo' } }, '', '')).toBeNull();
	});

	it('limita a opacidade ao intervalo valido', () => {
		expect(resolveHubWatermark({ publicationWatermark: { opacity: 5 } }, 'Hub')?.opacity).toBe(1);
		expect(resolveHubWatermark({ publicationWatermark: { opacity: -2 } }, 'Hub')?.opacity).toBe(0);
		expect(resolveHubWatermark({ publicationWatermark: { opacity: 'x' } }, 'Hub')?.opacity).toBe(
			0.06
		);
	});

	it('limpa marcacao vinda do campo livre do hub', () => {
		const wm = resolveHubWatermark(
			{ publicationWatermark: { text: '  <b>Draft</b>   copy ' } },
			'Hub'
		);

		expect(wm?.text).toBe('Draft copy');
	});
});

describe('buildHubWatermarkMarkup', () => {
	it('nao devolve nada quando nao ha marca', () => {
		expect(buildHubWatermarkMarkup(null)).toBe('');
	});

	it('escapa o texto do hub, que e campo livre', () => {
		const html = buildHubWatermarkMarkup({
			mode: 'text',
			text: '<script>alert(1)</script>',
			logo: '',
			opacity: 0.06
		});

		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('mantem o conteudo da pagina acima da marca', () => {
		// A marca e o primeiro filho do body; sem elevar a pagina ela cobriria o texto.
		const html = buildHubWatermarkMarkup({ mode: 'text', text: 'Hub', logo: '', opacity: 0.06 });

		expect(html).toContain('body > .page');
		expect(html).toContain('z-index: 1');
	});

	it('usa position fixed, que e o que repete a marca em toda pagina do PDF', () => {
		const html = buildHubWatermarkMarkup({ mode: 'text', text: 'Hub', logo: '', opacity: 0.06 });

		expect(html).toContain('position: fixed');
	});

	it('aplica a opacidade escolhida pelo hub', () => {
		const html = buildHubWatermarkMarkup({ mode: 'text', text: 'Hub', logo: '', opacity: 0.2 });

		expect(html).toContain('opacity: 0.2');
	});

	it('repete o carimbo para cobrir a pagina', () => {
		const html = buildHubWatermarkMarkup({ mode: 'text', text: 'Hub', logo: '', opacity: 0.06 });

		expect((html.match(/<span>/g) ?? []).length).toBeGreaterThan(1);
	});

	it('emite imagens no modo logo e nenhum texto', () => {
		const html = buildHubWatermarkMarkup({
			mode: 'logo',
			text: '',
			logo: 'data:image/png;base64,AAA',
			opacity: 0.06
		});

		expect(html).toContain('<img src="data:image/png;base64,AAA"');
		expect(html).not.toContain('<span>');
	});
});

describe('densidade dos carimbos', () => {
	it('usa menos carimbos quando o nome do hub e comprido', () => {
		// Nome comprido quebra em varias linhas; manter a mesma contagem faz os
		// carimbos se encostarem na pagina.
		const curto = buildHubWatermarkMarkup({
			mode: 'text',
			text: 'Mycology Hub',
			logo: '',
			opacity: 0.06
		});
		const longo = buildHubWatermarkMarkup({
			mode: 'text',
			text: 'Brazilian Society for Tropical Mycology and Biodiversity',
			logo: '',
			opacity: 0.06
		});

		const count = (html: string) => (html.match(/<span>/g) ?? []).length;
		expect(count(longo)).toBeLessThan(count(curto));
		expect(count(longo)).toBeGreaterThan(0);
	});
});

describe('isolamento entre hubs', () => {
	it('a configuracao de um hub nao vaza para o outro', () => {
		// A marca e resolvida por paper, a partir do registro do hub daquele paper:
		// nao ha estado compartilhado entre chamadas.
		const a = resolveHubWatermark(
			{ publicationWatermark: { enabled: true, text: 'Hub A stamp', opacity: 0.2 } },
			'Hub A'
		);
		const b = resolveHubWatermark(
			{ publicationWatermark: { enabled: false } },
			'Hub B'
		);
		const c = resolveHubWatermark({ publicationWatermark: { mode: 'logo' } }, 'Hub C', 'data:image/png;base64,BBB');

		expect(a?.text).toBe('Hub A stamp');
		expect(a?.opacity).toBe(0.2);
		expect(b).toBeNull();
		expect(c?.logo).toBe('data:image/png;base64,BBB');

		// Reresolver o primeiro depois dos outros devolve o mesmo resultado.
		const aAgain = resolveHubWatermark(
			{ publicationWatermark: { enabled: true, text: 'Hub A stamp', opacity: 0.2 } },
			'Hub A'
		);
		expect(aAgain).toEqual(a);
	});

	it('o logo de um hub nao aparece na marca de outro', () => {
		const comLogo = buildHubWatermarkMarkup(
			resolveHubWatermark({ publicationWatermark: { mode: 'logo' } }, 'Hub A', 'data:image/png;base64,AAA')
		);
		const semLogo = buildHubWatermarkMarkup(
			resolveHubWatermark({ publicationWatermark: { mode: 'text' } }, 'Hub B')
		);

		expect(comLogo).toContain('base64,AAA');
		expect(semLogo).not.toContain('base64,AAA');
		expect(semLogo).toContain('Hub B');
	});
});

describe('robustez da imagem do logo', () => {
	it('escapa a URI do logo, que vai para um atributo HTML', () => {
		const html = buildHubWatermarkMarkup({
			mode: 'logo',
			text: '',
			logo: 'data:image/png;base64,AAA" onerror="alert(1)',
			opacity: 0.06
		});

		expect(html).not.toContain('onerror="alert(1)"');
		expect(html).toContain('&quot;');
	});

	it('deixa a proporcao do logo a cargo do navegador, sem distorcer', () => {
		// width fixo com height auto: logo quadrado, largo ou alto entram sem
		// esticar. Um height fixo deformaria os que nao sao quadrados.
		const html = buildHubWatermarkMarkup({
			mode: 'logo',
			text: '',
			logo: 'data:image/png;base64,AAA',
			opacity: 0.06
		});

		expect(html).toContain('object-fit: contain');
		// As duas dimensoes limitadas: so a largura deixaria um logo alto estourar
		// a pagina inteira.
		expect(html).toContain('max-width:');
		expect(html).toContain('max-height:');
	});
});

describe('compatibilidade com os templates de publicacao', () => {
	it('todas as variantes que a rota de publicacao aceita tem o ponto de insercao', async () => {
		// `GET /api/papers/:id/pdf?template=` aceita as quatro variantes. Se uma
		// delas nao tiver o token, o hub que escolher aquela variante publica sem
		// marca d'agua nenhuma, em silencio.
		const { readFileSync } = await import('node:fs');
		const { dirname, resolve } = await import('node:path');
		const { fileURLToPath } = await import('node:url');
		const here = dirname(fileURLToPath(import.meta.url));

		for (const file of [
			'article-template.tpl.html',
			'article-template-v2-1col.tpl.html',
			'article-template-v2-2col.tpl.html',
			'article-template-v3-1col.tpl.html'
		]) {
			const tpl = readFileSync(resolve(here, file), 'utf8');
			expect(tpl, `${file} sem o token`).toContain('{{WATERMARK}}');
			// Precisa estar dentro do body, antes do conteudo da pagina.
			expect(tpl.indexOf('{{WATERMARK}}')).toBeGreaterThan(tpl.indexOf('<body'));
			expect(tpl.indexOf('{{WATERMARK}}')).toBeLessThan(tpl.indexOf('{{TITLE}}'));
		}
	});

	it('nao toca na previa de submissao nem no carimbo de revisao', () => {
		// A marca d'agua desta tarefa e so do PDF publicado. O watermark "In Review"
		// e o da previa de impressao vivem em outro caminho e continuam intactos.
		const html = buildHubWatermarkMarkup({ mode: 'text', text: 'Hub', logo: '', opacity: 0.06 });

		expect(html).not.toContain('paper-print-watermark');
		expect(html).not.toContain('In Review');
	});
});
