import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import type { RequestHandler } from '@sveltejs/kit';
import { fsFiles } from '$lib/db/fs';
import { Readable } from 'stream';

const bucket = new GridFSBucket(db);

export const GET: RequestHandler = async ({ url }) => {
    try {
        const fileId = url.searchParams.get('id');

        if (!fileId) {
            return new Response(
                JSON.stringify({ message: 'File ID is required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Find file metadata
        const fileDoc = await fsFiles.findOne({ 'metadata.id': fileId });

        if (!fileDoc) {
            return new Response(
                JSON.stringify({ message: 'File not found' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Download file from GridFS
        const downloadStream = bucket.openDownloadStream(fileDoc._id);
        const webStream = Readable.toWeb(downloadStream) as unknown as ReadableStream;

        // Get file metadata
        const filename = fileDoc.filename || 'download';
        const contentType = fileDoc.contentType || 'application/octet-stream';

        return new Response(webStream, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (err) {
        console.error('File download failed:', err);
        return new Response(
            JSON.stringify({
                message: 'Failed to download file',
                error: (err as Error).message
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
