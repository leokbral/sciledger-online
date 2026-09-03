import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import {
	renderArticlePdf,
	renderArticleHtml,
	isTemplateVariant,
	type TemplateVariant
} from '$lib/server/pdf/renderArticlePdf';

function slugify(value: string) {
	return (
		String(value ?? 'article')
			.replace(/<[^>]*>/g, ' ')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60) || 'article'
	);
}

/**
 * GET /api/papers/:id/pdf
 *
 *   ?template=v3-1col | v2-1col | v2-2col | v1   (padrão: v3-1col)
 *   ?inline=1                                    abre no navegador em vez de baixar
 *   ?debug=html                                  devolve o HTML preenchido (inspeção no navegador)
 *   ?debug=json                                  devolve só o diagnóstico da extração
 *   ?draft=1                                     permite exportar antes de publicar (teste)
 *
 * Gera o PDF do artigo no template da SciLedger, com os dados reais do banco.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		await start_mongo();
		const paperId = params.id;
		if (!paperId) return json({ error: 'Paper ID is required' }, { status: 400 });

		const paper = await Papers.findOne({ $or: [{ id: paperId }, { _id: paperId }] })
			.lean()
			.exec();

		if (!paper) return json({ error: 'Paper not found' }, { status: 404 });

		// Só artigos publicados viram PDF final. `?draft=1` libera para teste interno.
		const allowDraft = url.searchParams.get('draft') === '1';
		if (!allowDraft && String(paper.status) !== 'published') {
			return json(
				{
					error: 'Only published papers can be exported.',
					status: paper.status,
					hint: 'Append ?draft=1 to preview an unpublished manuscript.'
				},
				{ status: 409 }
			);
		}

		const requested = url.searchParams.get('template');
		const variant: TemplateVariant = isTemplateVariant(requested) ? requested : 'v3-1col';
		const origin = url.origin;
		const debug = url.searchParams.get('debug');

		if (debug === 'html') {
			const { html } = await renderArticleHtml(paper, variant, origin);
			return new Response(html, {
				headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
			});
		}

		if (debug === 'json') {
			// Passa pelo render completo de propósito: as referências cruzadas só são
			// resolvidas dentro do Chromium, então o diagnóstico delas não existe antes.
			const { diagnostics } = await renderArticlePdf(paper, variant, origin);
			return json({ paperId, variant, diagnostics });
		}

		const { pdf, diagnostics } = await renderArticlePdf(paper, variant, origin);
		console.info('[pdf] rendered', paperId, variant, diagnostics);

		const disposition = url.searchParams.get('inline') ? 'inline' : 'attachment';
		const filename = `${slugify(paper.title)}-sciledger.pdf`;

		return new Response(new Uint8Array(pdf), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `${disposition}; filename="${filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (error) {
		console.error('Error generating article PDF:', error);
		return json(
			{
				error: 'Internal server error',
				detail: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
