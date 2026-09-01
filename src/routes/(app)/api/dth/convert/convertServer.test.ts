import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	env: {
		DTH_CONVERT_URL: 'https://dev.sciledger.imd.ufrn.br/dth/api/convert',
		DTH_API_URL: ''
	},
	convertDocxToHtmlWithLocalImages: vi.fn(),
	rewriteHtmlImageSources: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: mocks.env
}));

vi.mock('$lib/server/dth/docxImagePreview', () => ({
	convertDocxToHtmlWithLocalImages: mocks.convertDocxToHtmlWithLocalImages,
	rewriteHtmlImageSources: mocks.rewriteHtmlImageSources
}));

function createRequest(file = new File(['docx'], 'paper.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })) {
	const formData = new FormData();
	formData.set('file', file);
	return new Request('http://localhost:5173/api/dth/convert', {
		method: 'POST',
		body: formData
	});
}

describe('POST /api/dth/convert image preview handling', () => {
	beforeEach(() => {
		vi.resetModules();
		mocks.convertDocxToHtmlWithLocalImages.mockReset();
		mocks.rewriteHtmlImageSources.mockReset();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						html: '<p>Figure</p><img src="https://scideep.imd.ufrn.br/api/images/prod-image">'
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			})
		);
	});

	it('rewrites converted DOCX image sources to local image routes before returning preview HTML', async () => {
		mocks.convertDocxToHtmlWithLocalImages.mockResolvedValue({
			html: '<p>Figure</p><img src="/api/images/local-image">',
			imageSources: ['/api/images/local-image']
		});
		mocks.rewriteHtmlImageSources.mockReturnValue({
			html: '<p>Figure</p><img src="/api/images/local-image">',
			htmlImageCount: 1,
			extractedImageCount: 1,
			replacedImageCount: 1,
			warnings: []
		});

		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest(),
			url: new URL('http://localhost:5173/api/dth/convert')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.html).toContain('/api/images/local-image');
		expect(body.html).not.toContain('scideep.imd.ufrn.br');
		expect(body.replacedImageCount).toBe(1);
		expect(mocks.convertDocxToHtmlWithLocalImages).toHaveBeenCalledOnce();
		expect(mocks.rewriteHtmlImageSources).toHaveBeenCalledOnce();
	});

	it('uses local DOCX semantic HTML when DTH flattens superscript and subscript text', async () => {
		mocks.convertDocxToHtmlWithLocalImages.mockResolvedValue({
			html: '<p>Water is H<sub>2</sub>O and SO<sub>4</sub><sup>2-</sup>.</p><p>Math x<sup>2</sup>.</p>',
			imageSources: []
		});

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						html: '<p>Water is H2O and SO42-.</p><p>Math x2.</p>'
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			})
		);

		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest(),
			url: new URL('http://localhost:5173/api/dth/convert')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.html).toContain('H<sub>2</sub>O');
		expect(body.html).toContain('SO<sub>4</sub><sup>2-</sup>');
		expect(body.html).toContain('x<sup>2</sup>');
		expect(body.html).not.toContain('H2O');
		expect(body.html).not.toContain('SO42-');
		expect(mocks.rewriteHtmlImageSources).not.toHaveBeenCalled();
	});

	it('returns a service-unavailable response when the conversion service cannot be reached', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('fetch failed');
			})
		);

		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest(),
			url: new URL('http://localhost:5173/api/dth/convert')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.message).toContain('Document conversion service is unavailable');
	});
});
