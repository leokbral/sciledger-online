import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	MAIN_PAPER_FILE_LIMIT_LABEL,
	MAIN_PAPER_FILE_MAX_BYTES
} from '$lib/constants/paperUploadLimits';
import {
	convertDocxToHtmlWithLocalImages,
	rewriteHtmlImageSources
} from '$lib/server/dth/docxImagePreview';
import { validateMainPaperFileSize } from '$lib/utils/paperFileValidation';

function resolveDthConvertUrl(requestUrl: URL) {
	const configured = env.DTH_CONVERT_URL?.trim() || env.DTH_API_URL?.trim();
	if (configured) {
		if (
			requestUrl.hostname === 'dev.sciledger.imd.ufrn.br' &&
			configured.includes('scideep.imd.ufrn.br')
		) {
			return `${requestUrl.origin}/dth/api/convert`;
		}
		return configured;
	}

	if (
		requestUrl.hostname === 'dev.sciledger.imd.ufrn.br' ||
		requestUrl.hostname === 'scideep.imd.ufrn.br'
	) {
		return `${requestUrl.origin}/dth/api/convert`;
	}

	return 'http://127.0.0.1:8000/api/convert';
}

export const POST: RequestHandler = async ({ request, url }) => {

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch (error) {
        return new Response(
            JSON.stringify({
                message: `The document exceeds the maximum allowed size of ${MAIN_PAPER_FILE_LIMIT_LABEL}.`,
                error: error instanceof Error ? error.message : 'Invalid multipart form data'
            }),
            {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const file = formData.get('file') as File;

    if (!file) {
        return new Response(JSON.stringify({ message: 'No document file was uploaded.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const sizeValidation = validateMainPaperFileSize(file);
    if (!sizeValidation.ok) {
        return new Response(
            JSON.stringify({
                message: sizeValidation.message,
                maxBytes: MAIN_PAPER_FILE_MAX_BYTES,
                maxSize: MAIN_PAPER_FILE_LIMIT_LABEL,
                fileSize: file.size
            }),
            {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const docxBuffer = Buffer.from(await file.arrayBuffer());

    try {
        const response = await fetch(resolveDthConvertUrl(url), {
            method: 'POST',
            body: formData,
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            const upstreamBody = await response.text().catch(() => '');
            console.error('DTH conversion failed:', {
                status: response.status,
                body: upstreamBody.slice(0, 500)
            });
            return new Response(
                JSON.stringify({
                    message: 'Unable to process the document. The conversion service returned an error.'
                }),
                {
                    status: 502,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const data = await response.json();
        //return data.html; //convertedHtml = data.html;

        let result = data.html || data.result || ''; //convertedHtml = data.html;
        let imageProcessingWarning = '';
        let imageStats = {
            htmlImageCount: 0,
            extractedImageCount: 0,
            replacedImageCount: 0
        };

        try {
            const localConversion = await convertDocxToHtmlWithLocalImages({
                docxBuffer,
                originalFilename: file.name || 'document.docx'
            });
            const localHtmlHasScriptFormatting = /<(?:sup|sub)\b/i.test(localConversion.html);

            if (localHtmlHasScriptFormatting && localConversion.html.trim()) {
                result = localConversion.html;
                imageStats = {
                    htmlImageCount: localConversion.imageSources.length,
                    extractedImageCount: localConversion.imageSources.length,
                    replacedImageCount: localConversion.imageSources.length
                };
            } else {
                const rewritten = rewriteHtmlImageSources(result, localConversion.imageSources);
                result = rewritten.html;
                imageStats = {
                    htmlImageCount: rewritten.htmlImageCount,
                    extractedImageCount: rewritten.extractedImageCount,
                    replacedImageCount: rewritten.replacedImageCount
                };
                imageProcessingWarning = rewritten.warnings.join(' ');
            }
        } catch (localProcessingError) {
            console.error('DOCX local processing failed:', {
                message:
                    localProcessingError instanceof Error
                        ? localProcessingError.message
                        : 'Unknown local DOCX processing error'
            });
            imageProcessingWarning =
                'Document text was processed, but embedded images could not be prepared for preview.';
        }

        return new Response(
            JSON.stringify({
                result,
                html: result,
                imageProcessingWarning,
                ...imageStats
                // src: `https://aulazero.xyz/${fileName}`
                // ... and any additional fields you want to store, such as width, height, color, extension, etc
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (err) {
        console.error('DTH conversion request failed:', {
            message: err instanceof Error ? err.message : 'Unknown DTH conversion error'
        });
        return new Response(
            JSON.stringify({
                message: 'Document conversion service is unavailable. Please try again later.'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
