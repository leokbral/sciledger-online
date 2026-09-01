import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import {
	convertDocxToHtmlWithLocalImages,
	extractDocxImageSources,
	rewriteHtmlImageSources
} from './docxImagePreview';

function escapeXml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function textRun(value: string) {
	return `<w:r><w:t>${escapeXml(value)}</w:t></w:r>`;
}

function scriptRun(value: string, script: 'subscript' | 'superscript') {
	return `<w:r><w:rPr><w:vertAlign w:val="${script}"/></w:rPr><w:t>${escapeXml(value)}</w:t></w:r>`;
}

function paragraph(runs: string[]) {
	return `<w:p>${runs.join('')}</w:p>`;
}

async function createDocxBuffer(documentBody: string) {
	const zip = new JSZip();
	zip.file(
		'[Content_Types].xml',
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
	);
	zip.folder('_rels')?.file(
		'.rels',
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
	);
	zip.folder('word')?.file(
		'document.xml',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${documentBody}<w:sectPr/></w:body></w:document>`
	);

	return zip.generateAsync({ type: 'nodebuffer' });
}

describe('DOCX image preview processing', () => {
	it('converts DOCX superscript and subscript formatting to semantic HTML', async () => {
		const docxBuffer = await createDocxBuffer(
			[
				paragraph([textRun('Chemical formulas: H'), scriptRun('2', 'subscript'), textRun('O')]),
				paragraph([
					textRun('Combined: SO'),
					scriptRun('4', 'subscript'),
					scriptRun('2-', 'superscript')
				]),
				paragraph([
					textRun('Mathematics: x'),
					scriptRun('2', 'superscript'),
					textRun(' and 10'),
					scriptRun('-3', 'superscript')
				])
			].join('')
		);

		const converted = await convertDocxToHtmlWithLocalImages({
			docxBuffer,
			originalFilename: 'supsub.docx'
		});

		expect(converted.html).toContain('H<sub>2</sub>O');
		expect(converted.html).toContain('SO<sub>4</sub><sup>2-</sup>');
		expect(converted.html).toContain('x<sup>2</sup>');
		expect(converted.html).toContain('10<sup>-3</sup>');
		expect(converted.html).not.toContain('H2O');
		expect(converted.html).not.toContain('SO42-');
	});

	it('extracts an embedded image from the paper template DOCX', async () => {
		const docxBuffer = readFileSync(resolve(process.cwd(), 'static/paper-template.docx'));

		const sources = await extractDocxImageSources({
			docxBuffer,
			originalFilename: 'paper-template.docx',
			storeImage: async ({ index }) => `/api/images/local-docx-image-${index + 1}`
		});

		expect(sources).toEqual(['/api/images/local-docx-image-1']);
	});

	it('rewrites a single converted image to the local SciLedger image route', () => {
		const result = rewriteHtmlImageSources('<p>Text</p><img src="/api/images/prod-id">', [
			'/api/images/local-id'
		]);

		expect(result.html).toContain('<img src="/api/images/local-id">');
		expect(result.html).not.toContain('/api/images/prod-id');
		expect(result.replacedImageCount).toBe(1);
	});

	it('preserves adjacent superscript and subscript tags while rewriting image sources', () => {
		const result = rewriteHtmlImageSources(
			'<p>SO<sub>4</sub><sup>2-</sup></p><img src="/api/images/prod-id">',
			['/api/images/local-id']
		);

		expect(result.html).toContain('SO<sub>4</sub><sup>2-</sup>');
		expect(result.html).toContain('/api/images/local-id');
		expect(result.html).not.toContain('SO42-');
	});


	it('rewrites multiple converted images without preserving production URLs', () => {
		const result = rewriteHtmlImageSources(
			'<img src="/api/images/prod-a"><p>Figure</p><img src="https://scideep.imd.ufrn.br/api/images/prod-b">',
			['/api/images/local-a', '/api/images/local-b']
		);

		expect(result.html).toContain('/api/images/local-a');
		expect(result.html).toContain('/api/images/local-b');
		expect(result.html).not.toContain('scideep.imd.ufrn.br');
		expect(result.replacedImageCount).toBe(2);
	});

	it('leaves a converted document without images unchanged', () => {
		const html = '<p>Document without figures.</p>';
		const result = rewriteHtmlImageSources(html, []);

		expect(result.html).toBe(html);
		expect(result.htmlImageCount).toBe(0);
		expect(result.replacedImageCount).toBe(0);
		expect(result.warnings).toEqual([]);
	});

	it('reports a warning when extracted images cannot be matched to preview image tags', () => {
		const result = rewriteHtmlImageSources('<p>No image tag here.</p>', ['/api/images/local-a']);

		expect(result.warnings).toContain(
			'Some embedded images were extracted but were not referenced in the converted preview.'
		);
	});
});
